import { authenticate } from "../shopify.server";
import prisma from "../db.server";

function json(data, init) {
  return Response.json(data, init);
}

const METAFIELD_NAMESPACE = "$app";
const METAFIELD_KEY = "progress_bar";
const METAFIELD_TYPE = "json";

const SHOP_ID_QUERY = `#graphql
  query GetShopId {
    shop {
      id
      name
      myshopifyDomain
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
        createdAt
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

const VERIFY_SHOP_METAFIELD_QUERY = `#graphql
  query VerifyProgressBarMetafield($namespace: String!, $key: String!) {
    shop {
      id
      name
      myshopifyDomain
      progressBar: metafield(namespace: $namespace, key: $key) {
        id
        namespace
        key
        type
        value
        updatedAt
      }
    }
  }
`;

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function syncThemeWidgetConfig(admin, config, shopId) {
  const metafieldInputs = [
    {
      ownerId: shopId,
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEY,
      type: METAFIELD_TYPE,
      value: JSON.stringify(config),
    },
  ];

  console.log("[progress-bar metafield] preparing metafieldsSet", {
    ownerType: "SHOP",
    ownerId: shopId,
    namespace: METAFIELD_NAMESPACE,
    key: METAFIELD_KEY,
    type: METAFIELD_TYPE,
    payload: metafieldInputs,
    configPreview: config,
  });

  const response = await admin.graphql(METAFIELDS_SET_MUTATION, {
    variables: {
      metafields: metafieldInputs,
    },
  });

  const data = await response.json();

  console.log(
    "[progress-bar metafield] metafieldsSet raw response",
    JSON.stringify(data, null, 2),
  );

  if (data?.errors?.length) {
    console.error("[progress-bar metafield] top-level GraphQL errors", data.errors);
    throw new Error(data.errors.map((e) => e.message).join(", "));
  }

  const payload = data?.data?.metafieldsSet;

  if (payload?.userErrors?.length) {
    console.error("[progress-bar metafield] metafieldsSet userErrors", payload.userErrors);
    throw new Error(payload.userErrors.map((e) => e.message).join(", "));
  }

  console.log("[progress-bar metafield] metafield saved successfully", {
    count: payload?.metafields?.length ?? 0,
    metafields:
      payload?.metafields?.map((item) => ({
        id: item.id,
        namespace: item.namespace,
        key: item.key,
        type: item.type,
        valuePreview: String(item.value ?? "").slice(0, 500),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })) ?? [],
  });

  return payload?.metafields ?? [];
}

async function verifySavedShopMetafield(admin) {
  const response = await admin.graphql(VERIFY_SHOP_METAFIELD_QUERY, {
    variables: {
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEY,
    },
  });

  const data = await response.json();

  console.log(
    "[progress-bar metafield] verification raw response",
    JSON.stringify(data, null, 2),
  );

  if (data?.errors?.length) {
    console.error("[progress-bar metafield] verification GraphQL errors", data.errors);
    throw new Error(data.errors.map((e) => e.message).join(", "));
  }

  return data?.data?.shop ?? null;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ GET â†’ return saved config for this shop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  console.log("[progress-bar loader] incoming request", {
    method: request.method,
    shop: session?.shop ?? null,
    url: request.url,
  });

  if (!session?.shop) {
    console.error("[progress-bar loader] missing authenticated shop session");
    return json(
      { ok: false, error: "Unauthenticated request: missing shop session." },
      { status: 401 },
    );
  }

  try {
    const record = await prisma.progressBarConfig.findUnique({
      where: { shop: session.shop },
    });

    console.log("[progress-bar loader] prisma lookup result", {
      shop: session.shop,
      found: Boolean(record),
    });

    if (!record) {
      return json({ ok: true, config: null });
    }

    const config = JSON.parse(record.config);

    console.log("[progress-bar loader] returning saved DB config", {
      shop: session.shop,
      config,
    });

    return json({ ok: true, config });
  } catch (error) {
    console.error("[progress-bar loader] failed", {
      shop: session?.shop ?? null,
      message: error?.message,
      stack: error?.stack,
    });

    return json(
      {
        ok: false,
        error: error?.message || "Unable to load progress bar config.",
      },
      { status: 500 },
    );
  }
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ POST â†’ upsert config for this shop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  const { admin, session } = await authenticate.admin(request);

  console.log("[progress-bar action] incoming request", {
    method: request.method,
    shop: session?.shop ?? null,
    url: request.url,
  });

  if (!session?.shop) {
    console.error("[progress-bar action] missing authenticated shop session");
    return json(
      { ok: false, error: "Unauthenticated request: missing shop session." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const config = body?.config;

    console.log("[progress-bar action] request body received", {
      shop: session.shop,
      body,
      config,
    });

    if (!config || typeof config !== "object") {
      console.error("[progress-bar action] invalid config payload", {
        shop: session.shop,
        receivedType: typeof config,
      });

      return json(
        { ok: false, error: "Missing or invalid config payload." },
        { status: 400 },
      );
    }

    await prisma.progressBarConfig.upsert({
      where: { shop: session.shop },
      update: { config: JSON.stringify(config) },
      create: {
        shop: session.shop,
        config: JSON.stringify(config),
      },
    });

    console.log("[progress-bar action] config saved to prisma", {
      shop: session.shop,
      savedConfig: config,
    });

    const shopResponse = await admin.graphql(SHOP_ID_QUERY);
    const shopData = await shopResponse.json();

    console.log(
      "[progress-bar action] shop query raw response",
      JSON.stringify(shopData, null, 2),
    );

    if (shopData?.errors?.length) {
      console.error("[progress-bar action] shop query GraphQL errors", shopData.errors);
      throw new Error(shopData.errors.map((e) => e.message).join(", "));
    }

    const shopNode = shopData?.data?.shop;
    const shopId = shopNode?.id;

    console.log("[progress-bar action] resolved metafield owner", {
      ownerType: "SHOP",
      ownerId: shopId ?? null,
      shop: session.shop,
      shopName: shopNode?.name ?? null,
      myshopifyDomain: shopNode?.myshopifyDomain ?? null,
    });

    if (!shopId) {
      throw new Error("Unable to determine shop ID.");
    }

    const metafields = await syncThemeWidgetConfig(admin, config, shopId);
    const verifiedShopMetafield = await verifySavedShopMetafield(admin);

    console.log("[progress-bar action] verified saved shop metafield", {
      ownerType: "SHOP",
      ownerId: verifiedShopMetafield?.id ?? null,
      shopName: verifiedShopMetafield?.name ?? null,
      myshopifyDomain: verifiedShopMetafield?.myshopifyDomain ?? null,
      progressBar: verifiedShopMetafield?.progressBar
        ? {
          ...verifiedShopMetafield.progressBar,
          parsedValue: safeJsonParse(verifiedShopMetafield.progressBar.value, null),
        }
        : null,
    });

    return json({
      ok: true,
      config,
      metafields,
      verifiedShopMetafield,
    });
  } catch (error) {
    console.error("[progress-bar action] failed", {
      shop: session?.shop ?? null,
      message: error?.message,
      stack: error?.stack,
    });

    return json(
      {
        ok: false,
        error: error?.message || "Unable to save progress bar config.",
      },
      { status: 500 },
    );
  }
}
