// app/models/upsell-tiers.server.js

/**
 * This version reads tiers directly from the same two metafields that power
 * the cart-side Progress Bar admin (see app/routes/api.progress-discounts.jsx):
 *
 *   1. DiscountAutomaticApp  ->  $app:upsell-discounts / function-configuration
 *      (percent / fixed / free_shipping rules)
 *
 *   2. Shop metafield        ->  $app:upsell-discounts / cart-transform-configuration
 *      (free_gift rules)
 *
 * This avoids depending on Shopify's native DiscountAutomaticBasic /
 * DiscountAutomaticFreeShipping types, which the app no longer creates.
 */
import { getEmbedStatus } from "./embed-status.server.js";
const DISCOUNT_TITLE = "Progress Bar Rewards";

const FUNCTION_DISCOUNT_QUERY = `
  query FindFunctionDiscount($query: String!) {
    discountNodes(first: 1, query: $query) {
      edges {
        node {
          id
          discount {
            __typename
            ... on DiscountAutomaticApp {
              title
              status
            }
          }
          metafield(namespace: "$app:upsell-discounts", key: "function-configuration") {
            value
          }
        }
      }
    }
  }
`;

const SHOP_QUERY = `
  query ShopAndCartTransformConfig {
    shop {
      id
      currencyCode
      metafield(namespace: "$app:upsell-discounts", key: "cart-transform-configuration") {
        value
      }
    }
  }
`;

/**
 * Maps a single rule from the function-configuration metafield
 * (percent / fixed / free_shipping) into the tier shape Checkout.jsx expects.
 */
function mapFunctionRuleToTier(rule, currencyCode) {
  const threshold = Number(rule.threshold ?? 0);
  const type = rule.type; // "discount_percent" | "discount_fixed" | "free_shipping"

  let discountType = "none";
  let discountValue = 0;

  if (type === "free_shipping") {
    discountType = "free_shipping";
  } else if (type === "discount_percent") {
    discountType = "percentage";
    discountValue = Number(rule.value ?? 0);
  } else if (type === "discount_fixed") {
    discountType = "fixed";
    discountValue = Number(rule.value ?? 0);
  } else {
    // Unknown/unsupported rule type for this mapper (e.g. free_gift handled elsewhere)
    return null;
  }

  return {
    id: `function:${rule.id}`,
    threshold,
    currencyCode,
    requirementLabel: "",
    requirementType: "subtotal",
    discountType,
    discountValue,
    icon: type === "free_shipping" ? "🚚" : "🏷️",
    type: "DiscountAutomaticApp",
    title: rule.label?.trim() || DISCOUNT_TITLE,
  };
}

/**
 * Maps a single free_gift rule from the cart-transform-configuration metafield
 * into the tier shape Checkout.jsx expects.
 */
function mapGiftRuleToTier(rule, currencyCode) {
  const threshold = Number(rule.threshold ?? 0);

  return {
    id: `gift:${rule.id}`,
    threshold,
    currencyCode,
    requirementLabel: "",
    requirementType: "subtotal",
    discountType: "free_gift",
    discountValue: 0,
    icon: "🎁",
    type: "CartTransformFreeGift",
    title: rule.label?.trim() || "Free gift",
  };
}

export async function getUpsellTiersFromDiscounts(admin) {
  const tiers = [];

  // ── Check theme app embed status ────────────────────────────────────
  // The free-gift tier is only shown at checkout when the cart progress
  // bar embed is actually active in the storefront theme — independent
  // of the admin "Enable widget" toggle.
  let embedEnabled = false;
  try {
    const embedStatus = await getEmbedStatus(admin);
    embedEnabled = Boolean(embedStatus?.enabled);
  } catch (err) {
    console.error("[upsell-tiers] failed to check embed status:", err);
    embedEnabled = false; // fail closed — safer to hide the gift tile than show it wrongly
  }

  // ── Shop info + cart-transform (free gift) config ──────────────────
  const shopResponse = await admin.graphql(SHOP_QUERY);
  const shopJson = await shopResponse.json();

  if (shopJson.errors) {
    throw new Error("GraphQL error (shop query): " + JSON.stringify(shopJson.errors));
  }

  const shop = shopJson.data?.shop;
  const currencyCode = shop?.currencyCode ?? "USD";

  if (embedEnabled && shop?.metafield?.value) {
    try {
      const cartTransformConfig = JSON.parse(shop.metafield.value);
      if (cartTransformConfig?.enabled && Array.isArray(cartTransformConfig.rules)) {
        for (const rule of cartTransformConfig.rules) {
          if (!rule.enabled) continue;
          const tier = mapGiftRuleToTier(rule, currencyCode);
          if (tier) tiers.push(tier);
        }
      }
    } catch (err) {
      console.error("[upsell-tiers] failed to parse cart-transform-configuration:", err);
    }
  }

  // ── Function discount (percent / fixed / free_shipping) config ─────
  // NOTE: intentionally NOT gated on embedEnabled — free_shipping / percent /
  // fixed tiers should still show even if the visual embed block is off.
  const query = `title:"${DISCOUNT_TITLE.replace(/"/g, '\\"')}"`
  const functionResponse = await admin.graphql(FUNCTION_DISCOUNT_QUERY, {
    variables: { query },
  });
  const functionJson = await functionResponse.json();

  if (functionJson.errors) {
    throw new Error(
      "GraphQL error (function discount query): " + JSON.stringify(functionJson.errors),
    );
  }

  const node = functionJson.data?.discountNodes?.edges?.[0]?.node;
  const discount = node?.discount;

  const isActive =
    discount?.__typename === "DiscountAutomaticApp" && discount?.status === "ACTIVE";

  if (isActive && node?.metafield?.value) {
    try {
      const functionConfig = JSON.parse(node.metafield.value);
      if (functionConfig?.enabled && Array.isArray(functionConfig.rules)) {
        for (const rule of functionConfig.rules) {
          if (!rule.enabled) continue;
          const tier = mapFunctionRuleToTier(rule, currencyCode);
          if (tier) tiers.push(tier);
        }
      }
    } catch (err) {
      console.error("[upsell-tiers] failed to parse function-configuration:", err);
    }
  }

  // ── Sort ascending by threshold ─────────────────────────────────────
  tiers.sort((a, b) => a.threshold - b.threshold);

  return tiers;
}