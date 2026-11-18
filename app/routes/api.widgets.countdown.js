import { authenticate } from "../shopify.server";
import { requireFeatureAccess } from "../featureAccess.server";

const NAMESPACE = "custom";
const KEY = "urgency_timer_widget";

const SHOP_AND_METAFIELD_QUERY = `#graphql
  query GetShopAndCountdownSettings($namespace: String!, $key: String!) {
    shop {
      id
      metafield(namespace: $namespace, key: $key) {
        id
        namespace
        key
        value
        type
        updatedAt
      }
    }
  }
`;

const SHOP_ID_QUERY = `#graphql
  query GetShopId {
    shop {
      id
    }
  }
`;

const METAFIELDS_SET_MUTATION = `#graphql
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
        type
        updatedAt
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  console.log("[countdown loader] START", {
    shop: session?.shop,
    namespace: NAMESPACE,
    key: KEY,
    url: request.url,
    method: request.method,
  });

  const response = await admin.graphql(SHOP_AND_METAFIELD_QUERY, {
    variables: {
      namespace: NAMESPACE,
      key: KEY,
    },
  });

  const payload = await response.json();

  console.log(
    "[countdown loader] raw graphql payload:",
    JSON.stringify(payload, null, 2),
  );

  if (payload?.errors?.length) {
    console.error("[countdown loader] graphql errors:", payload.errors);
    return Response.json(
      {
        source: "loader",
        settings: null,
        error: payload.errors.map((e) => e.message).join("; "),
      },
      { status: 200 },
    );
  }

  const shopId = payload?.data?.shop?.id ?? null;
  const metafield = payload?.data?.shop?.metafield ?? null;

  console.log("[countdown loader] resolved metafield", {
    shopId,
    metafieldId: metafield?.id ?? null,
    namespace: metafield?.namespace ?? null,
    key: metafield?.key ?? null,
    type: metafield?.type ?? null,
    updatedAt: metafield?.updatedAt ?? null,
    rawValueLength: metafield?.value?.length ?? 0,
    rawValuePreview: metafield?.value?.slice(0, 250) ?? null,
  });

  let settings = null;

  if (metafield?.value) {
    try {
      settings = JSON.parse(metafield.value);
      console.log("[countdown loader] parsed settings successfully", {
        parsedKeys:
          settings && typeof settings === "object" ? Object.keys(settings) : [],
      });
    } catch (error) {
      console.error("[countdown loader] failed to parse metafield JSON", {
        metafieldId: metafield?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      settings = null;
    }
  } else {
    console.warn("[countdown loader] metafield not found for namespace/key", {
      namespace: NAMESPACE,
      key: KEY,
    });
  }

  return Response.json({
    source: "loader",
    settings,
    metafieldId: metafield?.id ?? null,
    shopId,
    namespace: NAMESPACE,
    key: KEY,
    updatedAt: metafield?.updatedAt ?? null,
  });
}

export async function action({ request }) {
  console.log("[countdown action] START", {
    method: request.method,
    url: request.url,
    contentType: request.headers.get("content-type"),
  });

  if (request.method !== "POST") {
    return Response.json(
      { source: "action", error: "Method not allowed" },
      { status: 405, headers: { Allow: "POST" } },
    );
  }

  const { admin, session } = await authenticate.admin(request);
  await requireFeatureAccess(session.shop, "CART_COUNTDOWN");

  console.log("[countdown action] authenticate.admin OK", {
    shop: session?.shop,
    namespace: NAMESPACE,
    key: KEY,
  });

  const rawBody = await request.text().catch((error) => {
    console.error("[countdown action] failed reading raw body", {
      shop: session?.shop,
      error: error instanceof Error ? error.message : String(error),
    });
    return "";
  });

  console.log("[countdown action] raw request body", rawBody);

  let body = null;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch (error) {
    console.error("[countdown action] failed parsing JSON body", {
      shop: session?.shop,
      error: error instanceof Error ? error.message : String(error),
      rawBodyPreview: rawBody.slice(0, 500),
    });
  }

  const settings = body?.settings;

  console.log("[countdown action] parsed body", {
    shop: session?.shop,
    bodyKeys: body && typeof body === "object" ? Object.keys(body) : [],
    hasSettings: Boolean(settings),
    settingsType: typeof settings,
    settingsPreview:
      settings && typeof settings === "object"
        ? {
            enabled: settings.enabled,
            mainMessage: settings.mainMessage,
            itemCartMessage: settings.itemCartMessage,
            countdownDuration: settings.countdownDuration,
            expirationBehavior: settings.expirationBehavior,
          }
        : null,
  });

  if (!settings || typeof settings !== "object") {
    console.error("[countdown action] missing or invalid settings payload", {
      shop: session?.shop,
    });

    return Response.json(
      {
        source: "action",
        errors: [{ message: "Missing or invalid settings payload" }],
      },
      { status: 400 },
    );
  }

  const shopResponse = await admin.graphql(SHOP_ID_QUERY);
  const shopPayload = await shopResponse.json();

  console.log(
    "[countdown action] shop id payload:",
    JSON.stringify(shopPayload, null, 2),
  );

  if (shopPayload?.errors?.length) {
    console.error(
      "[countdown action] shop query graphql errors:",
      shopPayload.errors,
    );

    return Response.json(
      {
        source: "action",
        errors: [{ message: shopPayload.errors.map((e) => e.message).join("; ") }],
      },
      { status: 500 },
    );
  }

  const shopId = shopPayload?.data?.shop?.id;

  if (!shopId) {
    console.error("[countdown action] missing shop id", {
      shop: session?.shop,
    });

    return Response.json(
      {
        source: "action",
        errors: [{ message: "Unable to resolve shop ID" }],
      },
      { status: 500 },
    );
  }

  const serializedSettings = JSON.stringify(settings);

  const metafieldInput = {
    namespace: NAMESPACE,
    key: KEY,
    type: "json",
    value: serializedSettings,
    ownerId: shopId,
  };

  console.log("[countdown action] metafield input", {
    shop: session?.shop,
    ownerId: metafieldInput.ownerId,
    namespace: metafieldInput.namespace,
    key: metafieldInput.key,
    type: metafieldInput.type,
    valueLength: metafieldInput.value.length,
    valuePreview: metafieldInput.value.slice(0, 250),
  });

  const response = await admin.graphql(METAFIELDS_SET_MUTATION, {
    variables: {
      metafields: [metafieldInput],
    },
  });

  const payload = await response.json();

  console.log(
    "[countdown action] raw mutation payload:",
    JSON.stringify(payload, null, 2),
  );

  console.log("[countdown action] mutation outcome", {
    topLevelErrors: payload?.errors ?? [],
    userErrors: payload?.data?.metafieldsSet?.userErrors ?? [],
    metafields: payload?.data?.metafieldsSet?.metafields ?? [],
  });

  if (payload?.errors?.length) {
    const messages = payload.errors.map((e) => e.message).join("; ");
    console.error("[countdown action] top-level graphql errors:", messages);

    return Response.json(
      {
        source: "action",
        errors: [{ message: `GraphQL error: ${messages}` }],
      },
      { status: 422 },
    );
  }

  const userErrors = payload?.data?.metafieldsSet?.userErrors ?? [];
  if (userErrors.length > 0) {
    console.error("[countdown action] metafieldsSet userErrors:", userErrors);

    return Response.json(
      { source: "action", errors: userErrors },
      { status: 422 },
    );
  }

  const returnedMetafields = payload?.data?.metafieldsSet?.metafields ?? [];
  if (returnedMetafields.length === 0) {
    console.error(
      "[countdown action] mutation succeeded but no metafield returned",
    );

    return Response.json(
      {
        source: "action",
        errors: [{ message: "Mutation succeeded but no metafield was returned." }],
      },
      { status: 500 },
    );
  }

  const savedMetafield = returnedMetafields[0];

  console.log("[countdown action] saved metafield summary", {
    shop: session?.shop,
    metafieldId: savedMetafield?.id,
    namespace: savedMetafield?.namespace,
    key: savedMetafield?.key,
    type: savedMetafield?.type,
    updatedAt: savedMetafield?.updatedAt,
    returnedValueLength: savedMetafield?.value?.length ?? 0,
    submittedEqualsReturned: savedMetafield?.value === serializedSettings,
  });

  const verifyResponse = await admin.graphql(SHOP_AND_METAFIELD_QUERY, {
    variables: {
      namespace: NAMESPACE,
      key: KEY,
    },
  });

  const verifyPayload = await verifyResponse.json();

  console.log(
    "[countdown action] verification query payload:",
    JSON.stringify(verifyPayload, null, 2),
  );

  const verifiedMetafield = verifyPayload?.data?.shop?.metafield ?? null;

  console.log("[countdown action] verification summary", {
    shop: session?.shop,
    verifiedExists: Boolean(verifiedMetafield),
    metafieldId: verifiedMetafield?.id ?? null,
    namespace: verifiedMetafield?.namespace ?? null,
    key: verifiedMetafield?.key ?? null,
    type: verifiedMetafield?.type ?? null,
    updatedAt: verifiedMetafield?.updatedAt ?? null,
    verifiedValueLength: verifiedMetafield?.value?.length ?? 0,
    verifiedEqualsSubmitted: verifiedMetafield?.value === serializedSettings,
  });

  let savedSettings = settings;
  if (verifiedMetafield?.value) {
    try {
      savedSettings = JSON.parse(verifiedMetafield.value);
    } catch (error) {
      console.error("[countdown action] failed to parse verified metafield JSON", {
        metafieldId: verifiedMetafield?.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (savedMetafield?.value) {
    try {
      savedSettings = JSON.parse(savedMetafield.value);
    } catch (error) {
      console.error("[countdown action] failed to parse saved metafield JSON", {
        metafieldId: savedMetafield?.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return Response.json({
    source: "action",
    ok: true,
    settings: savedSettings,
    metafieldId: verifiedMetafield?.id ?? savedMetafield?.id ?? null,
    namespace: verifiedMetafield?.namespace ?? savedMetafield?.namespace ?? NAMESPACE,
    key: verifiedMetafield?.key ?? savedMetafield?.key ?? KEY,
    updatedAt: verifiedMetafield?.updatedAt ?? savedMetafield?.updatedAt ?? null,
  });
}