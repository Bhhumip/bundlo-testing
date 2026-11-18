// @ts-check

/**
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 * @typedef {import("../generated/api").Input} Input
 */

/**
 * FBT (Frequently Bought Together) discount function.
 *
 * Applies the FBT percentage when:
 *
 * 1. The line was explicitly added through the FBT widget:
 *    _upsell_widget = frequently_bought_together
 *
 * OR
 *
 * 2. The product is marked:
 *    custom.fbt_eligible = true
 *
 * CPR lines are handled by the separate CPR discount function.
 *
 * @param {Input} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
    const EMPTY = { operations: [] };

    console.log("========== FBT DISCOUNT FUNCTION ==========");

    console.log(
        `[FBT] Total cart lines: ${input.cart?.lines?.length ?? 0}`
    );

    console.log(
        `[FBT] Discount classes: ${JSON.stringify(
            input.discount?.discountClasses ?? []
        )}`
    );

    // ------------------------------------------------------------
    // PRODUCT DISCOUNT GUARD
    // ------------------------------------------------------------

    const canEmitProduct =
        // @ts-ignore
        input.discount?.discountClasses?.some(
            // @ts-ignore
            (discountClass) => String(discountClass) === "PRODUCT"
        ) ?? false;

    if (!canEmitProduct) {
        console.log(
            "[FBT] PRODUCT discount class not allowed — exiting"
        );
        return EMPTY;
    }

    // ------------------------------------------------------------
    // CART LINES
    // ------------------------------------------------------------

    const lines = input.cart?.lines ?? [];

    if (lines.length === 0) {
        console.log("[FBT] No cart lines — exiting");
        return EMPTY;
    }

    // ------------------------------------------------------------
    // FBT DISCOUNT CONFIGURATION
    // ------------------------------------------------------------

    const fbtConfig =
        input.discount?.metafield?.jsonValue ?? null;

    const fbtConfiguredPercentage =
        fbtConfig && typeof fbtConfig === "object"
            ? Number(fbtConfig.percentage ?? 0)
            : 0;

    const fbtPercentage =
        fbtConfiguredPercentage > 0 &&
        fbtConfiguredPercentage <= 100
            ? fbtConfiguredPercentage
            : 0;

    console.log(
        `[FBT] Discount config: ${JSON.stringify(fbtConfig)}`
    );

    console.log(
        `[FBT] FBT %: ${fbtPercentage}%`
    );

    if (fbtPercentage === 0) {
        console.log(
            "[FBT] No valid discount percentage configured — exiting"
        );
        return EMPTY;
    }

    // ------------------------------------------------------------
    // BUILD CANDIDATES
    // ------------------------------------------------------------

    const candidates = [];

    for (const line of lines) {

        // --------------------------------------------------------
        // ONLY PRODUCT VARIANTS
        // --------------------------------------------------------

        if (
            line.merchandise?.__typename !==
            "ProductVariant"
        ) {
            console.log(
                `[FBT] SKIP line ${line.id} — merchandise is not ProductVariant`
            );
            continue;
        }

        const lineAmount =
            line.cost?.subtotalAmount?.amount ?? "0";

        // --------------------------------------------------------
        // WIDGET ATTRIBUTE
        // --------------------------------------------------------

        // @ts-ignore
        const upsellWidgetValue =
            // @ts-ignore
            line.upsellWidget?.value;

        // --------------------------------------------------------
        // FBT ELIGIBILITY
        // --------------------------------------------------------

        // @ts-ignore
        const fbtEligibleValue =
            // @ts-ignore
            line.merchandise?.product?.fbtEligible?.value;

        console.log(
            `[FBT] Line ${line.id} | ` +
            `Product ${line.merchandise.id} | ` +
            `upsellWidget=${upsellWidgetValue} | ` +
            `fbtEligible=${fbtEligibleValue} | ` +
            `amount=${lineAmount}`
        );

        // --------------------------------------------------------
        // CPR LINE
        // --------------------------------------------------------

        if (
            upsellWidgetValue ===
            "customer_personalized_recommendation"
        ) {
            console.log(
                `[FBT] SKIP line ${line.id} — added from CPR widget`
            );
            continue;
        }

        // --------------------------------------------------------
        // FBT ELIGIBILITY
        // --------------------------------------------------------

        const isFbtWidgetLine =
            upsellWidgetValue ===
            "frequently_bought_together";

        const isFbtEligibleProduct =
            fbtEligibleValue === "true";

        if (
            !isFbtWidgetLine &&
            !isFbtEligibleProduct
        ) {
            console.log(
                `[FBT] SKIP line ${line.id} — not eligible for FBT`
            );
            continue;
        }

        // --------------------------------------------------------
        // APPLY FBT DISCOUNT
        // --------------------------------------------------------

        const percentageToApply =
            fbtPercentage;

        const savings =
            (
                Number(lineAmount) *
                percentageToApply /
                100
            ).toFixed(2);

        const source =
            isFbtWidgetLine
                ? "FBT"
                : "FBT (via metafield)";

        console.log(
            `[FBT] APPLYING ${percentageToApply}% discount ` +
            `to line ${line.id} — ` +
            `source=${source} — ` +
            `savings: ${savings}`
        );

        candidates.push({
            message:
                `FBT ${percentageToApply}% OFF`,

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
                    value: percentageToApply,
                },
            },
        });
    }

    // ------------------------------------------------------------
    // NO CANDIDATES
    // ------------------------------------------------------------

    if (candidates.length === 0) {
        console.log(
            "[FBT] No eligible lines found — no discount applied"
        );

        console.log(
            "========== END FBT DISCOUNT =========="
        );

        return EMPTY;
    }

    // ------------------------------------------------------------
    // RETURN DISCOUNTS
    // ------------------------------------------------------------

    console.log(
        `[FBT] TOTAL discount candidates: ${candidates.length}`
    );

    console.log(
        "========== END FBT DISCOUNT =========="
    );

    return {
        operations: [
            {
                productDiscountsAdd: {
                    candidates,
                    // @ts-ignore
                    selectionStrategy: "ALL",
                },
            },
        ],
    };
}