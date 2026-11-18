import { authenticate } from "../shopify.server";
import { requireFeatureAccess } from "../featureAccess.server";

function json(data, init) {
  return Response.json(data, init);
}

const DISCOUNT_TITLE = "Progress Bar Rewards";
/**
 * Resolve the registered Shopify Function ID dynamically.
 * Never assume the Function ID from the extension UID.
 */
async function getUpsellDiscountFunctionId(admin) {
  const response = await admin.graphql(`
    query GetUpsellDiscountFunction {
      shopifyFunctions(first: 50) {
        nodes {
          id
          title
          apiType
        }
      }
    }
  `);

  const result = await response.json();

  if (result.errors?.length) {
    throw new Error(
      `Failed to fetch Shopify Functions: ${result.errors
        .map((error) => error.message)
        .join(", ")}`,
    );
  }

  const functions = result?.data?.shopifyFunctions?.nodes ?? [];

  const matchingFunction = functions.find(
    (fn) =>
      fn.title === "upsell-discounts" &&
      fn.apiType === "discount",
  );

  if (!matchingFunction) {
    throw new Error(
      'Shopify Function "upsell-discounts" was not found. ' +
        "Ensure the function is deployed and available to this app.",
    );
  }

  return matchingFunction.id;
}

/**
 * Query Shopify for an existing automatic app discount by exact title.
 * Returns the discount GID or null.
 */
async function findExistingDiscountGid(admin, title) {
  try {
    // CRITICAL FIX: Shopify search syntax requires quotes around multi-word titles
    const query = `title:"${title.replace(/"/g, '\\"')}"`;

    const response = await admin.graphql(
      `
        query findDiscount($query: String!) {
          discountNodes(first: 1, query: $query) {
            edges {
              node {
                id
                discount {
                  ... on DiscountAutomaticApp {
                    id
                    title
                  }
                }
              }
            }
          }
        }
      `,
      {
        variables: { query },
      },
    );

    const data = await response.json();
    const node = data?.data?.discountNodes?.edges?.[0]?.node;
    return node?.id || null;
  } catch (err) {
    console.error("[findExistingDiscountGid] error:", err);
    return null;
  }
}

/**
 * Create or update the single DiscountAutomaticApp that powers all
 * percent / fixed / free-shipping / free-gift rules via Shopify Functions.
 */
async function syncFunctionDiscount(admin, rules, storedGid, widgetEnabled) {
  const title = DISCOUNT_TITLE;
  const startsAt = new Date().toISOString();
  const endsAt = new Date();
  endsAt.setFullYear(endsAt.getFullYear() + 1);

  const functionRules = rules.filter(
    (r) =>
      r.enabled &&
      (r.type === "discount_percent" ||
        r.type === "discount_fixed" ||
        r.type === "free_shipping" ||
        r.type === "free_gift"),
  );

  if (functionRules.length === 0) {
    return { shopifyDiscountGid: storedGid || "", discountSyncStatus: "idle" };
  }

  const configPayload = {
    enabled: widgetEnabled && functionRules.length > 0,
    rules: functionRules.map((rule) => ({
      id: rule.id,
      type: rule.type,
      threshold: Number(rule.threshold || 0),
      value: rule.value === "" ? null : Number(rule.value),
      label: rule.label?.trim() || "",
      enabled: true,
    })),
  };

  const metafieldInput = {
    namespace: "$app:upsell-discounts",
    key: "function-configuration",
    type: "json",
    value: JSON.stringify(configPayload),
  };

  // ── Resolve existing GID from state OR Shopify search ──
  let existingGid = storedGid || undefined;

  if (!existingGid) {
    const foundGid = await findExistingDiscountGid(admin, title);
    if (foundGid) existingGid = foundGid;
  }

  // ── UPDATE existing discount ──
  if (existingGid) {
    const response = await admin.graphql(
      `
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields { id }
            userErrors { field message }
          }
        }
      `,
      {
        variables: {
          metafields: [{ ...metafieldInput, ownerId: existingGid }],
        },
      },
    );

    const data = await response.json();
    const payload = data?.data?.metafieldsSet;

    if (payload?.userErrors?.length) {
      throw new Error(
        `Metafield update error: ${payload.userErrors
          .map((e) => e.message)
          .join(", ")}`,
      );
    }

    return { shopifyDiscountGid: existingGid, discountSyncStatus: "synced" };
  }

  // ── CREATE new DiscountAutomaticApp ──
  const functionId = await getUpsellDiscountFunctionId(admin);
  const response = await admin.graphql(
    `
      mutation discountAutomaticAppCreateWrapper(
        $automaticAppDiscount: DiscountAutomaticAppInput!
      ) {
        discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
          userErrors {
            field
            message
          }
          automaticAppDiscount {
            discountId
            title
            status
            discountClasses
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
          }
        }
      }
    `,
    {
      variables: {
        automaticAppDiscount: {
          title,
          functionId: functionId,
          startsAt,
          endsAt: endsAt.toISOString(),
          combinesWith: {
            orderDiscounts: false,
            productDiscounts: false,
            shippingDiscounts: false,
          },
          discountClasses: ["ORDER", "SHIPPING", "PRODUCT"],
          metafields: [metafieldInput],
        },
      },
    },
  );

  const data = await response.json();
  const payload = data?.data?.discountAutomaticAppCreate;

  if (!payload) {
    throw new Error(
      "Unexpected response from discountAutomaticAppCreate – no payload returned.",
    );
  }

  if (payload.userErrors?.length) {
    const errMsg = payload.userErrors
      .map((e) => `${e.field?.join(".") ?? ""}: ${e.message}`)
      .join("; ");

    // ── CRITICAL FIX: Duplicate title fallback ──
    // If Shopify rejects because the title already exists, find that discount
    // and update its metafield instead of returning an error to the user.
    const isDuplicateTitle =
      errMsg.toLowerCase().includes("title must be unique") ||
      errMsg.toLowerCase().includes("already exists");

    if (isDuplicateTitle) {
      const foundGid = await findExistingDiscountGid(admin, title);
      if (foundGid) {
        const updateRes = await admin.graphql(
          `
            mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
                metafields { id }
                userErrors { field message }
              }
            }
          `,
          {
            variables: {
              metafields: [{ ...metafieldInput, ownerId: foundGid }],
            },
          },
        );
        const updateData = await updateRes.json();
        const updatePayload = updateData?.data?.metafieldsSet;

        if (updatePayload?.userErrors?.length) {
          throw new Error(
            `Metafield update error: ${updatePayload.userErrors
              .map((e) => e.message)
              .join(", ")}`,
          );
        }
        return { shopifyDiscountGid: foundGid, discountSyncStatus: "synced" };
      }
    }

    throw new Error(`Shopify API error: ${errMsg}`);
  }

  const discountId = payload.automaticAppDiscount?.discountId || "";

  return {
    shopifyDiscountGid: discountId,
    discountSyncStatus: "synced",
  };
}

async function deleteFunctionDiscount(admin, gid) {
  if (!gid) return;
  try {
    await admin.graphql(
      `
        mutation discountAutomaticDelete($id: ID!) {
          discountAutomaticDelete(id: $id) {
            deletedDiscountId
            userErrors { field message }
          }
        }
      `,
      { variables: { id: gid } },
    );
  } catch {
    // Best-effort cleanup
  }
}

function normalizeVariantId(id) {
  const trimmed = id?.trim() || "";
  if (!trimmed) return "";
  if (trimmed.startsWith("gid://")) return trimmed;
  return `gid://shopify/ProductVariant/${trimmed}`;
}

/**
 * Write free-gift rules to a Shop metafield for Cart Transform.
 */
async function syncCartTransformConfig(admin, rules, shopId, widgetEnabled) {
  const giftRules = rules.filter((r) => r.enabled && r.type === "free_gift");

  const configPayload = {
    enabled: widgetEnabled && giftRules.length > 0,
    rules: giftRules.map((rule) => ({
      id: rule.id,
      threshold: Number(rule.threshold || 0),
      freeGiftVariantId: normalizeVariantId(rule.freeGiftVariantId),
      label: rule.label?.trim() || "",
      enabled: true,
    })),
  };

  const response = await admin.graphql(
    `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }
    `,
    {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace: "$app:upsell-discounts",
            key: "cart-transform-configuration",
            type: "json",
            value: JSON.stringify(configPayload),
          },
        ],
      },
    },
  );

  const data = await response.json();
  const payload = data?.data?.metafieldsSet;

  if (payload?.userErrors?.length) {
    throw new Error(
      `Cart-transform metafield error: ${payload.userErrors
        .map((e) => e.message)
        .join(", ")}`,
    );
  }

  return { discountSyncStatus: "synced" };
}

export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  await requireFeatureAccess(session.shop, "FREE_GIFT");
  const body = await request.json();
  const rules = Array.isArray(body?.rules) ? body.rules : [];
  const widgetEnabled = body?.enabled !== false;
  // Get Shop ID
  const shopResponse = await admin.graphql(`query { shop { id } }`);
  const shopData = await shopResponse.json();
  const shopId = shopData?.data?.shop?.id;

  if (!shopId) {
    return json(
      { ok: false, error: "Unable to determine shop ID." },
      { status: 500 },
    );
  }

  // ── Sync Discount Function ──
  const storedFunctionGid =
    rules.find(
      (r) =>
        r.shopifyDiscountGid &&
        (r.type === "discount_percent" ||
          r.type === "discount_fixed" ||
          r.type === "free_shipping" ||
          r.type === "free_gift"),
    )?.shopifyDiscountGid || undefined;

  const hasFunctionRules = widgetEnabled && rules.some(
    (r) =>
      r.enabled &&
      (r.type === "discount_percent" ||
        r.type === "discount_fixed" ||
        r.type === "free_shipping" ||
        r.type === "free_gift"),
  );

  let functionResult = null;

  if (hasFunctionRules) {
    try {
      functionResult = await syncFunctionDiscount(admin, rules, storedFunctionGid, widgetEnabled);
    } catch (error) {
      functionResult = {
        shopifyDiscountGid: storedFunctionGid || "",
        discountSyncStatus: `error: ${error.message}`,
      };
    }
  } else if (storedFunctionGid) {
    await deleteFunctionDiscount(admin, storedFunctionGid);
    functionResult = { shopifyDiscountGid: "", discountSyncStatus: "idle" };
  }

  // ── Sync Cart Transform config ──
  let cartTransformResult = { discountSyncStatus: "synced" };
  try {
    await syncCartTransformConfig(admin, rules, shopId, widgetEnabled);
  } catch (error) {
    cartTransformResult = { discountSyncStatus: `error: ${error.message}` };
  }

  // ── Build response ──
  // Preserve ALL rule fields including freeGiftVariantId and freeGiftProductTitle
  const resultRules = [];

  for (const rule of rules) {
    const baseRule = {
      ...rule,
      freeGiftVariantId: rule.freeGiftVariantId || "",
      freeGiftProductTitle: rule.freeGiftProductTitle || "",
    };

    if (!rule.enabled) {
      resultRules.push({ ...baseRule, discountSyncStatus: "idle" });
      continue;
    }

    if (
      rule.type === "discount_percent" ||
      rule.type === "discount_fixed" ||
      rule.type === "free_shipping" ||
      rule.type === "free_gift"
    ) {
      const freeGiftStatus =
        rule.type === "free_gift" &&
          cartTransformResult.discountSyncStatus?.startsWith("error:")
          ? cartTransformResult.discountSyncStatus
          : null;

      resultRules.push({
        ...baseRule,
        shopifyDiscountGid:
          functionResult?.shopifyDiscountGid || rule.shopifyDiscountGid || "",
        discountSyncStatus:
          freeGiftStatus ||
          functionResult?.discountSyncStatus ||
          "error: function discount not created",
      });
    } else {
      resultRules.push({ ...baseRule, discountSyncStatus: "skipped" });
    }
  }

  return json({ ok: true, rules: resultRules });
}
