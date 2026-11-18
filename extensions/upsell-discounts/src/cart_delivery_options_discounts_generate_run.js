import {
  DeliveryDiscountSelectionStrategy,
  DiscountClass,
} from "../generated/api";

/**
 * @typedef {import("../generated/api").DeliveryInput} RunInput
 * @typedef {import("../generated/api").CartDeliveryOptionsDiscountsGenerateRunResult} CartDeliveryOptionsDiscountsGenerateRunResult
 */

/**
 * @param {RunInput} input
 * @returns {CartDeliveryOptionsDiscountsGenerateRunResult}
 */
export function cartDeliveryOptionsDiscountsGenerateRun(input) {
  const firstDeliveryGroup = input.cart.deliveryGroups[0];
  if (!firstDeliveryGroup) {
    return { operations: [] };
  }

  const hasShippingDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Shipping,
  );

  if (!hasShippingDiscountClass) {
    return { operations: [] };
  }

  const configuration = parseConfiguration(getFunctionConfiguration(input));
  if (!configuration) {
    return { operations: [] };
  }

  const cartSubtotal = getCartSubtotal(input);
  if (cartSubtotal <= 0) {
    return { operations: [] };
  }
  //Fixed : issue cart progress
  const highestReward = getHighestUnlockedReward(
    configuration.rules,
    cartSubtotal
  );

  if (highestReward?.type !== 'free_shipping') {
    return { operations: [] };
  }

  const rule = highestReward;
  //Fixed : issue cart progress
  if (!rule) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        deliveryDiscountsAdd: {
          candidates: [
            {
              message: rule.label || 'Free shipping unlocked!',
              targets: [
                {
                  deliveryGroup: {
                    id: firstDeliveryGroup.id,
                  },
                },
              ],
              value: {
                percentage: {
                  value: 100,
                },
              },
            },
          ],
          selectionStrategy: DeliveryDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}

/* ─────────── helpers (duplicated for self-containment) ─────────── */

function getFunctionConfiguration(input) {
  const metafield =
    input?.discountNode?.metafield ||
    input?.discount?.metafield ||
    null;

  return metafield?.jsonValue ?? metafield?.value ?? null;
}

function parseConfiguration(metafieldValue) {
  if (!metafieldValue) return null;
  if (typeof metafieldValue === 'object') {
    if (!metafieldValue.enabled || !Array.isArray(metafieldValue.rules)) return null;
    return metafieldValue;
  }

  try {
    const config = JSON.parse(metafieldValue);
    if (!config || !config.enabled || !Array.isArray(config.rules)) return null;
    return config;
  } catch {
    console.error('[DeliveryFunction] Failed to parse configuration metafield');
    return null;
  }
}

function getCartSubtotal(input) {
  const amount = input?.cart?.cost?.subtotalAmount?.amount;
  const subtotal = parseFloat(amount);
  return !isNaN(subtotal) && subtotal > 0 ? subtotal : 0;
}

function getHighestApplicableRule(rules, cartSubtotal, types) {
  if (!Array.isArray(rules) || cartSubtotal <= 0) return null;
  const applicable = rules
    .filter((r) => r && r.enabled && types.includes(r.type))
    .filter((r) => cartSubtotal >= (parseFloat(r.threshold) || 0))
    .sort((a, b) => (parseFloat(b.threshold) || 0) - (parseFloat(a.threshold) || 0));
  return applicable[0] || null;
}


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
