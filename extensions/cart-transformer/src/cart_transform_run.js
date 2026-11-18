// @nots-check
/**
 * @typedef {import("../generated/api").Input} RunInput
 * @typedef {import("../generated/api").CartTransformRunResult} CartTransformRunResult
 * @typedef {import("../generated/api").Operation} Operation
 */

/**
 * Gift rule configuration structure stored in shop metafield JSON
 * {
 *   "enabled": true,
 *   "rules": [
 *     { "id": "rule-1", "enabled": true, "threshold": 100, "freeGiftVariantId": "gid://shopify/ProductVariant/123" },
 *     ...
 *   ]
 * }
 */

/**
 * @typedef GiftRule
 * @property {string} id
 * @property {boolean} enabled
 * @property {number} threshold
 * @property {string} freeGiftVariantId
 */

/**
 * @typedef GiftConfiguration
 * @property {boolean} enabled
 * @property {GiftRule[]} rules
 */

/**
 * Entry point for cart.transform.run
 *
 * @param {RunInput} input
 * @returns {CartTransformRunResult}
 */
export function cartTransformRun(input) {
  /** @type {Operation[]} */
  const operations = [];

  const cartSubtotal = getCartSubtotal(input);

  /* ─────────── FREE-GIFT PRICE OVERRIDE (ITEMS WITH AUTO-GIFT PROPERTY) ─────────── */

  const existingGiftVariantIds = new Set();
  for (const line of input.cart.lines) {
    // Check if this line has an auto-gift property set by the theme extension.
    // Properties added via cart.add.js are stored in the attributes array
    const hasAutoGiftAttribute =
      line.fspAutoGift?.value === 'true' ||
      line.freeGift?.value === 'true';

    if (hasAutoGiftAttribute) {
      if (line.merchandise.__typename === "ProductVariant") {
        existingGiftVariantIds.add(line.merchandise.id);
      }

      // Apply zero price to free gift items
      operations.push({
        lineUpdate: {
          cartLineId: line.id,
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: "0.00",
              },
            },
          },
        },
      });
    }
  }

  /* ─────────── EXISTING BYOB LOGIC ─────────── */

  for (const line of input.cart.lines) {
    const isParent = line.byobParent?.value === "true";
    if (!isParent) continue;

    if (line.merchandise.__typename !== "ProductVariant") continue;

    const parentVariant = line.merchandise;

    const bundleMeta = parentVariant.product?.bundlePrice;
    /** @type {number | null} */
    let bundlePrice = null;
    if (bundleMeta?.value) {
      const parsed = parseFloat(bundleMeta.value);
      if (!Number.isNaN(parsed) && parsed > 0) {
        bundlePrice = parsed;
      }
    }

    const rawChildren = line.byobChildLines?.value;
    if (!rawChildren) continue;

    /** @type {{ variantId: string | number; quantity?: number }[] | undefined} */
    let childLines;
    try {
      const parsed = JSON.parse(rawChildren);
      if (!Array.isArray(parsed) || parsed.length === 0) continue;
      childLines = parsed;
    } catch {
      // Malformed JSON in attribute, skip this parent line
      continue;
    }

    const expandedCartItems = childLines.map((child, index) => {
      const quantity =
        typeof child.quantity === "number" && child.quantity > 0
          ? child.quantity
          : 1;

      const rawId = child.variantId;
      const variantIdString = String(rawId);
      const merchandiseId = variantIdString.startsWith("gid://")
        ? variantIdString
        : `gid://shopify/ProductVariant/${variantIdString}`;

      return {
        merchandiseId,
        quantity,
        price: {
          adjustment: {
            fixedPricePerUnit: {
              // Apply bundlePrice only once, to the first component
              amount:
                index === 0 && bundlePrice != null
                  ? bundlePrice.toFixed(2)
                  : "0.00",
            },
          },
        },
      };
    });

    if (expandedCartItems.length === 0) continue;

    operations.push({
      lineExpand: {
        cartLineId: line.id,
        expandedCartItems,
      },
    });
  }




  /* ─────────── FREE-GIFT LOGIC (NO INVALID OPERATIONS) ─────────── */

  const giftConfig = parseGiftConfiguration(input.shop?.metafield?.value);
  const highestReward = getHighestUnlockedReward(giftConfig?.rules || [], cartSubtotal);

  if (giftConfig && cartSubtotal > 0 && highestReward) {
    const applicableGifts = giftConfig.rules
      .filter(
        (r) =>
          r &&
          r.enabled &&
          typeof r.freeGiftVariantId === "string" &&
          r.freeGiftVariantId.length > 0
      )
      .filter((r) => cartSubtotal >= (r.threshold || 0))
      .sort((a, b) => (b.threshold || 0) - (a.threshold || 0));

    const highestGift = applicableGifts[0];

    if (highestGift && !existingGiftVariantIds.has(highestGift.freeGiftVariantId)) {
      const anchorLine = input.cart.lines.find((line) => {
        if (line.byobParent?.value === "true") return false;
        if (line.merchandise.__typename !== "ProductVariant") return false;
        if (line.merchandise.id === highestGift.freeGiftVariantId) return false;
        return true;
      });

      if (anchorLine && anchorLine.merchandise.__typename === "ProductVariant") {
        const anchorItem = {
          merchandiseId: anchorLine.merchandise.id,
          quantity: anchorLine.quantity,
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: (parseFloat(anchorLine.cost.subtotalAmount.amount) / anchorLine.quantity).toFixed(2),
              },
            },
          },
        };

        const giftItem = {
          merchandiseId: highestGift.freeGiftVariantId,
          quantity: 1,
          price: {
            adjustment: {
              fixedPricePerUnit: { amount: "0.00" },
            },
          },
        };

        operations.push({
          lineExpand: {
            cartLineId: anchorLine.id,
            expandedCartItems: [anchorItem, giftItem],
          },
        });
      }
    }
  }


  /* ─────────── DONATION PRICE VALIDATION (SERVER-SIDE CLAMP) ─────────── */

  const donationConfig = parseDonationConfiguration(input.shop?.donationConfig?.value);

  for (const line of input.cart.lines) {
    const isDonation = line.donationWidget?.value === "donations";
    if (!isDonation) continue;
    if (line.merchandise.__typename !== "ProductVariant") continue;

    const requested = parseFloat(line.donationAmount?.value);
    if (Number.isNaN(requested) || requested <= 0) continue;

    const min = donationConfig?.customMinAmount ?? 1;
    const max = donationConfig?.customMaxAmount ?? 100000;
    const allowedTiers = donationConfig?.donationTiers ?? [];
    const clamped = allowedTiers.includes(requested)
      ? requested
      : Math.min(Math.max(requested, min), max);

    operations.push({
      lineUpdate: {
        cartLineId: line.id,
        price: {
          adjustment: { fixedPricePerUnit: { amount: clamped.toFixed(2) } },
        },
      },
    });
  }


  /** @type {CartTransformRunResult} */
  const result = { operations };
  return result;
}

/* ─────────── HELPERS ─────────── */

/**
 * Safely parse the shop metafield JSON into a GiftConfiguration
 *
 * @param {string | null | undefined} metafieldValue
 * @returns {GiftConfiguration | null}
 */
function parseGiftConfiguration(metafieldValue) {
  if (!metafieldValue) return null;

  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(metafieldValue);
  } catch {
    // Invalid JSON, ignore configuration
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  /** @type {any} */
  const cfg = parsed;

  if (!cfg.enabled || !Array.isArray(cfg.rules)) return null;

  /** @type {GiftConfiguration} */
  const normalized = {
    enabled: Boolean(cfg.enabled),
    rules: cfg.rules
      .map(/** @returns {GiftRule | null} *//** @param {any} raw */(raw) => {
        if (!raw) return null;
        const id = String(raw.id ?? "");
        const enabled = Boolean(raw.enabled);
        const threshold = Number(raw.threshold ?? 0);
        const freeGiftVariantId =
          typeof raw.freeGiftVariantId === "string"
            ? raw.freeGiftVariantId
            : "";

        if (!id || !freeGiftVariantId) return null;

        return { id, enabled, threshold, freeGiftVariantId };
      })
      .filter(/** @param {any} r*/(r) => r !== null),
  };

  if (!normalized.enabled || normalized.rules.length === 0) return null;

  return normalized;
}

/**
 * Compute cart subtotal by summing line.cost.subtotalAmount.amount
 *
 * @param {RunInput} input
 * @returns {number}
 */
function getCartSubtotal(input) {
  if (!input.cart || !Array.isArray(input.cart.lines)) return 0;

  let subtotal = 0;

  for (const line of /** @type {any[]}*/(input.cart.lines)) {
    const amountStr = line.cost?.subtotalAmount?.amount;
    if (!amountStr) continue;

    const amount = parseFloat(amountStr);
    if (!Number.isNaN(amount) && amount > 0) {
      subtotal += amount;
    }
  }

  return subtotal;
}
//Fixed Issue :helper to unlock higest reward only
function getHighestUnlockedReward(rules, cartSubtotal) {
  if (!Array.isArray(rules) || cartSubtotal <= 0) return null;

  return rules
    .filter((r) => r && r.enabled)
    .filter((r) => cartSubtotal >= (parseFloat(r.threshold) || 0))
    .sort(
      (a, b) =>
        (parseFloat(b.threshold) || 0) -
        (parseFloat(a.threshold) || 0)
    )[0];
}



function parseDonationConfiguration(metafieldValue) {
  if (!metafieldValue) return null;
  try {
    const cfg = JSON.parse(metafieldValue);
    return {
      donationTiers: Array.isArray(cfg.donationTiers) ? cfg.donationTiers.map(Number) : [],
      customMinAmount: Number(cfg.customMinAmount ?? 1),
      customMaxAmount: Number(cfg.customMaxAmount ?? 100000),
    };
  } catch {
    return null;
  }
}