

// -----------------------------------------------------------------------
// computeBundlePrice — Fixed & Mix & Match
// -----------------------------------------------------------------------
/**
 * @param {Array}  components     — array of { shopifyVariantPrice, quantity }
 * @param {string} discountType   — "PERCENTAGE" | "FIXED_AMOUNT" | "FIXED_PRICE" | "NONE"
 * @param {number} discountValue  — the discount magnitude
 * @param {number|null} fixedPrice
 * @returns {number|null}         — final price, or null if no components
 */
export function computeBundlePrice(components, discountType, discountValue, fixedPrice, basePrice) {
    if (!components || components.length === 0) return null;

    const originalPrice = components.reduce(
        (sum, c) => sum + (c.shopifyVariantPrice ?? 0) * (c.quantity ?? 1),
        0,
    );
    const priceToUse =
        basePrice && !isNaN(basePrice) && basePrice > 0
            ? basePrice
            : originalPrice;

    let finalPrice;

    switch (discountType) {
        case "PERCENTAGE":
            finalPrice = priceToUse * (1 - discountValue / 100);
            break;

        case "FIXED_AMOUNT":
            finalPrice = priceToUse - discountValue;
            break;

        case "FIXED_PRICE":
            finalPrice = fixedPrice ?? priceToUse;
            break;

        default:
            finalPrice = priceToUse;
    }
    return Math.max(0, finalPrice);
}

// -----------------------------------------------------------------------
// computeVolumePrice — Volume bundles
// -----------------------------------------------------------------------
/**
 * Returns the price per unit after applying the matching volume tier.
 *
 * @param {number}  unitPrice    — base price of the product
 * @param {number}  quantity     — how many units the customer is buying
 * @param {Array}   tiers        — array of { minQuantity, discountType, discountValue }
 * @returns {{ pricePerUnit: number, tier: object|null, totalPrice: number, savings: number }}
 */
export function computeVolumePrice(unitPrice, quantity, tiers, basePrice) {
    //  Use basePrice override if provided
    const effectiveUnitPrice = (basePrice && !isNaN(basePrice) && basePrice > 0)
        ? basePrice
        : unitPrice;

    if (!tiers || tiers.length === 0) {
        return {
            pricePerUnit: effectiveUnitPrice,
            tier: null,
            totalPrice: effectiveUnitPrice * quantity,
            savings: 0,
        };
    }

    const sorted = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
    const appliedTier = sorted.find(t => quantity >= t.minQuantity);
    let pricePerUnit = effectiveUnitPrice;

    if (appliedTier) {
        if (appliedTier.discountType === "PERCENTAGE") {
            pricePerUnit = effectiveUnitPrice * (1 - appliedTier.discountValue / 100);
        } else if (appliedTier.discountType === "FIXED_AMOUNT") {
            pricePerUnit = Math.max(0, effectiveUnitPrice - appliedTier.discountValue);
        }
    }

    const totalPrice = pricePerUnit * quantity;
    const savings = effectiveUnitPrice * quantity - totalPrice;

    return { pricePerUnit, tier: appliedTier, totalPrice, savings };
}
// -----------------------------------------------------------------------
// computeMixMatchPrice — Mix & Match bundles
// -----------------------------------------------------------------------
/**
 * @param {Array}  selectedItems   — array of { shopifyVariantPrice, quantity }
 * @param {string} discountType    — "PERCENTAGE" | "FIXED_AMOUNT" | "FIXED_PRICE" | "NONE"
 * @param {number} discountValue
 * @param {number|null} fixedPrice
 * @returns {{ originalPrice, bundlePrice, savings }}
 */
export function computeMixMatchPrice(selectedItems, discountType, discountValue, fixedPrice, basePrice) {
    const originalPrice = selectedItems.reduce(
        (sum, item) => sum + (item.shopifyVariantPrice ?? 0) * (item.quantity ?? 1),
        0,
    );

    //  Use basePrice if provided, else use sum of selected items
    const priceToUse = (basePrice && !isNaN(basePrice) && basePrice > 0)
        ? basePrice
        : originalPrice;

    const bundlePrice = computeBundlePrice(selectedItems, discountType, discountValue, fixedPrice, basePrice);

    return {
        originalPrice: priceToUse,        //  shows base price if set
        bundlePrice: bundlePrice ?? priceToUse,
        savings: priceToUse - (bundlePrice ?? priceToUse),
    };
}

// -----------------------------------------------------------------------
// formatTierLabel — human-readable label for a volume tier
// -----------------------------------------------------------------------
export function formatTierLabel(tier) {
    if (!tier) return "";
    const suffix =
        tier.discountType === "PERCENTAGE"
            ? `${tier.discountValue}% off`
            : `$${tier.discountValue} off per item`;
    return `Buy ${tier.minQuantity}+: ${suffix}`;
}

// -----------------------------------------------------------------------
// computeAllTierPrices — for volume bundles, compute price details for all tiers
// -----------------------------------------------------------------------
export function computeAllTierPrices(unitPrice, quantity, tiers, basePrice) {
    // Use basePrice override if provided
    const effectiveUnitPrice = (basePrice && !isNaN(basePrice) && basePrice > 0)
        ? basePrice
        : unitPrice;

    return tiers.map((tier) => {
        let pricePerUnit = effectiveUnitPrice;

        if (tier.discountType === "PERCENTAGE") {
            pricePerUnit = effectiveUnitPrice * (1 - tier.discountValue / 100);
        } else if (tier.discountType === "FIXED_AMOUNT") {
            pricePerUnit = Math.max(0, effectiveUnitPrice - tier.discountValue);
        }

        const totalPrice = pricePerUnit * quantity;
        const originalTotal = effectiveUnitPrice * quantity;

        return {
            ...tier,
            pricePerUnit,
            totalPrice,
            savings: originalTotal - totalPrice,
            isApplicable: quantity === tier.minQuantity,
        };
    });
}