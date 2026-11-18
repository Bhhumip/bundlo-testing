import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
} from '../generated/api';

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

/**
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  if (!input.cart.lines.length) {
    return { operations: [] };
  }

  const configuration = parseConfiguration(getFunctionConfiguration(input));
  const cartSubtotal = getCartSubtotal(input);
  const operations = [];

  const hasOrderDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Order,
  );
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );

  // ── 1. Order discount: highest applicable percent/fixed tier ──
  //Fixed : Issue cart progress
  if (hasOrderDiscountClass && configuration && cartSubtotal > 0) {
    const highestReward = getHighestUnlockedReward(
      configuration.rules,
      cartSubtotal
    );

    if (
      highestReward?.type !== 'discount_percent' &&
      highestReward?.type !== 'discount_fixed'
    ) {
      return { operations: [] };
    }

    const rule = highestReward;
    //Fixed : issue cart progress


    if (rule) {
      const value = buildOrderDiscountValue(rule);
      if (value) {
        operations.push({
          orderDiscountsAdd: {
            candidates: [
              {
                message: rule.label || getDefaultMessage(rule.type),
                targets: [
                  {
                    orderSubtotal: {
                      excludedCartLineIds: [],
                    },
                  },
                ],
                value,
              },
            ],
            selectionStrategy: OrderDiscountSelectionStrategy.First,
          },
        });
      }
    }
  }

  // ── 2. Product discount: 100% off any auto-gift lines ──
  if (hasProductDiscountClass && input.cart.lines.length) {
    const giftLines = input.cart.lines.filter(
      (line) =>
        line.fspAutoGift?.value === 'true' || line.freeGift?.value === 'true',
    );

    for (const line of giftLines) {
      operations.push({
        productDiscountsAdd: {
          candidates: [
            {
              message: 'Free gift',
              targets: [
                {
                  cartLine: {
                    id: line.id,
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
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      });
    }
  }

  return {
    operations: operations.length ? operations : [],
  };
}

/* ─────────── helpers ─────────── */

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
    console.error('[CartLinesFunction] Failed to parse configuration metafield');
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

function buildOrderDiscountValue(rule) {
  const { type, value } = rule;
  switch (type) {
    case 'discount_percent': {
      const percentage = parseFloat(value) || 0;
      if (percentage <= 0 || percentage > 100) return null;
      return {
        percentage: {
          value: percentage,
        },
      };
    }
    case 'discount_fixed': {
      const amount = parseFloat(value) || 0;
      if (amount <= 0) return null;
      return {
        fixedAmount: {
          amount: amount.toFixed(2),
          appliesOnEachItem: false,
        },
      };
    }
    default:
      return null;
  }
}

function getDefaultMessage(type) {
  const messages = {
    discount_percent: 'Tier discount unlocked!',
    discount_fixed: 'Tier discount unlocked!',
  };
  return messages[type] || 'Discount applied!';
}
