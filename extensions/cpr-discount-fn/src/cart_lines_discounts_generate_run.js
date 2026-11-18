// @ts-check

/**
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 * @typedef {import("../generated/api").Input} Input
 */

/**
 * CPR (Customer Personalized Recommendation) discount function.
 *
 * IMPORTANT:
 * This function ONLY discounts cart lines that were added from the
 * CPR widget.
 *
 * The CPR widget adds:
 *   _upsell_widget = customer_personalized_recommendation
 *
 * The discount percentage is read from this Shopify discount's
 * function-configuration metafield.
 *
 * @param {Input} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const EMPTY = { operations: [] };

  const lines = input.cart?.lines ?? [];

  if (lines.length === 0) {
    return EMPTY;
  }


  // ---------------------------------------------------------
  // Read merchant-configured CPR percentage
  // ---------------------------------------------------------

  // @ts-ignore
  const config = input.discount?.metafield?.jsonValue ?? null;

  const configuredPercentage =
    config && typeof config === "object"
      ? Number(config.percentage ?? 0)
      : 0;

  // Safety fallback.
  // Later we can make sure this is always configured by the merchant.
  const percentage =
  configuredPercentage > 0 && configuredPercentage <= 100
    ? configuredPercentage
    : 0;

if (percentage === 0) {
  console.log("[CPR] No valid discount percentage configured.");
  return EMPTY;
}

  console.log("========== CPR DISCOUNT FUNCTION ==========");
  console.log(
    `[CPR] Cart lines: ${lines.length}`
  );
  console.log(
    `[CPR] Discount classes: ${JSON.stringify(
      input.discount?.discountClasses ?? []
    )}`
  );
  console.log(
    `[CPR] Configuration: ${JSON.stringify(config)}`
  );
  console.log(
    `[CPR] Percentage: ${percentage}%`
  );

  const candidates = [];

  // ---------------------------------------------------------
  // Only CPR-added cart lines are eligible
  // ---------------------------------------------------------

  for (const line of lines) {
    // @ts-ignore
    const widgetSource = line.upsellWidget?.value;

    console.log(
      `[CPR] Line ${line.id} | upsellWidget=${widgetSource} | amount=${line.cost?.subtotalAmount?.amount ?? "0"}`
    );

    // IMPORTANT:
    // Do NOT discount normal cart products.
    // Do NOT discount FBT products.
    // Do NOT discount Fixed Bundle products.
    //
    // Only a line explicitly added from CPR is eligible.
    if (widgetSource !== "customer_personalized_recommendation") {
      console.log(
        `[CPR] SKIP line ${line.id} — not added from CPR widget`
      );
      continue;
    }

    const lineAmount =
      line.cost?.subtotalAmount?.amount ?? "0";

    const savings =
      (Number(lineAmount) * percentage) / 100;

    console.log(
      `[CPR] APPLYING ${percentage}% discount to line ${line.id} — savings: ${savings.toFixed(2)}`
    );

    candidates.push({
      message: `CPR ${percentage}% OFF`,
      targets: [
        {
          cartLine: {
            id: line.id,
            quantity: line.quantity,
          },
        },
      ],
      value: {
        percentage: {
          value: percentage,
        },
      },
    });
  }

  // No CPR products in cart.
  if (candidates.length === 0) {
    console.log("[CPR] No eligible CPR lines found.");
    console.log("========== END CPR DISCOUNT ==========");
    return EMPTY;
  }

  console.log(
    `[CPR] Applying discount to ${candidates.length} CPR line(s)`
  );

  console.log("========== END CPR DISCOUNT ==========");

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates,

          // Apply the configured discount to every eligible CPR line.
          // @ts-ignore
          selectionStrategy: "ALL",
        },
      },
    ],
  };
}