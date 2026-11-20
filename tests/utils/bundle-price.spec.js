import { describe, it, expect } from "vitest";
import {
    computeBundlePrice,
    computeVolumePrice,
    computeMixMatchPrice,
    formatTierLabel,
    computeAllTierPrices,
} from "~/utils/bundle-price.js";

describe("computeBundlePrice", () => {
    // original total = 100*2 + 50 (quantity defaults to 1) = 250
    const components = [
        { shopifyVariantPrice: 100, quantity: 2 },
        { shopifyVariantPrice: 50 },
    ];

    it("returns null when there are no components", () => {
        expect(computeBundlePrice([], "PERCENTAGE", 10)).toBeNull();
        expect(computeBundlePrice(null, "PERCENTAGE", 10)).toBeNull();
        expect(computeBundlePrice(undefined, "PERCENTAGE", 10)).toBeNull();
    });

    it("returns the plain total when there is no discount", () => {
        expect(computeBundlePrice(components, "NONE", 0)).toBe(250);
    });

    it("applies a percentage discount", () => {
        expect(computeBundlePrice(components, "PERCENTAGE", 10)).toBeCloseTo(225);
    });

    it("applies a fixed amount discount", () => {
        expect(computeBundlePrice(components, "FIXED_AMOUNT", 30)).toBe(220);
    });

    it("uses the fixed price when provided", () => {
        expect(computeBundlePrice(components, "FIXED_PRICE", 0, 180)).toBe(180);
    });

    it("falls back to the total when FIXED_PRICE has no fixedPrice", () => {
        expect(computeBundlePrice(components, "FIXED_PRICE", 0, null)).toBe(250);
    });

    it("never returns a negative price", () => {
        expect(computeBundlePrice(components, "FIXED_AMOUNT", 999)).toBe(0);
        expect(computeBundlePrice(components, "PERCENTAGE", 150)).toBe(0);
    });

    it("treats a missing variant price as 0", () => {
        expect(computeBundlePrice([{ quantity: 3 }], "NONE", 0)).toBe(0);
    });

    describe("basePrice override", () => {
        it("discounts the base price instead of the component total", () => {
            expect(computeBundlePrice(components, "PERCENTAGE", 25, null, 400)).toBeCloseTo(300);
        });

        it.each([[0], [-5], [NaN], [undefined], [null]])(
            "ignores an invalid basePrice (%s)",
            (basePrice) => {
                expect(computeBundlePrice(components, "NONE", 0, null, basePrice)).toBe(250);
            }
        );
    });
});

describe("computeVolumePrice", () => {
    // Deliberately unsorted, so the test proves the function sorts internally
    const tiers = [
        { minQuantity: 5, discountType: "PERCENTAGE", discountValue: 20 },
        { minQuantity: 10, discountType: "FIXED_AMOUNT", discountValue: 30 },
        { minQuantity: 2, discountType: "PERCENTAGE", discountValue: 10 },
    ];

    it("applies no discount below the first tier", () => {
        const r = computeVolumePrice(100, 1, tiers);
        expect(r.pricePerUnit).toBe(100);
        expect(r.totalPrice).toBe(100);
        expect(r.savings).toBe(0);
        expect(r.tier).toBeUndefined(); // note: undefined here, but null when there are no tiers at all
    });

    // Boundary value analysis: test exactly ON and just AFTER each tier threshold
    it.each([
        // qty, expected pricePerUnit, expected total, expected savings
        [2, 90, 180, 20],
        [4, 90, 360, 40],   // still tier 1
        [5, 80, 400, 100],  // exactly on tier 2
        [7, 80, 560, 140],
        [10, 70, 700, 300], // fixed-amount tier: 100 - 30
    ])("quantity %i → %d per unit, total %d, savings %d", (qty, unit, total, savings) => {
        const r = computeVolumePrice(100, qty, tiers);
        expect(r.pricePerUnit).toBeCloseTo(unit);
        expect(r.totalPrice).toBeCloseTo(total);
        expect(r.savings).toBeCloseTo(savings);
    });

    it("returns the applied tier object", () => {
        expect(computeVolumePrice(100, 6, tiers).tier.minQuantity).toBe(5);
    });

    it("does not mutate the tiers array it was given", () => {
        const copy = JSON.parse(JSON.stringify(tiers));
        computeVolumePrice(100, 6, tiers);
        expect(tiers).toEqual(copy);
    });

    it.each([[null], [undefined], [[]]])("handles missing tiers (%j)", (noTiers) => {
        expect(computeVolumePrice(100, 3, noTiers)).toEqual({
            pricePerUnit: 100,
            tier: null,
            totalPrice: 300,
            savings: 0,
        });
    });

    it("uses basePrice instead of unitPrice when valid", () => {
        expect(computeVolumePrice(100, 2, tiers, 200).pricePerUnit).toBeCloseTo(180);
    });

    it("clamps a fixed-amount tier so the unit price is never negative", () => {
        const big = [{ minQuantity: 1, discountType: "FIXED_AMOUNT", discountValue: 500 }];
        expect(computeVolumePrice(100, 1, big).pricePerUnit).toBe(0);
    });

    it("returns the tier but no discount for an unknown discount type", () => {
        const odd = [{ minQuantity: 1, discountType: "BOGO", discountValue: 50 }];
        const r = computeVolumePrice(100, 2, odd);
        expect(r.tier).toBe(odd[0]);
        expect(r.pricePerUnit).toBe(100);
    });
});

describe("computeMixMatchPrice", () => {
    const items = [
        { shopifyVariantPrice: 100, quantity: 1 },
        { shopifyVariantPrice: 50, quantity: 2 },
    ]; // original = 200

    it("returns original, bundle and savings for a percentage discount", () => {
        const r = computeMixMatchPrice(items, "PERCENTAGE", 10);
        expect(r.originalPrice).toBe(200);
        expect(r.bundlePrice).toBeCloseTo(180);
        expect(r.savings).toBeCloseTo(20);
    });

    it("uses basePrice as the original price when provided", () => {
        const r = computeMixMatchPrice(items, "FIXED_AMOUNT", 50, null, 300);
        expect(r).toEqual({ originalPrice: 300, bundlePrice: 250, savings: 50 });
    });

    it("returns zeros for an empty selection", () => {
        expect(computeMixMatchPrice([], "PERCENTAGE", 10)).toEqual({
            originalPrice: 0,
            bundlePrice: 0,
            savings: 0,
        });
    });

    it("shows basePrice with no savings for an empty selection", () => {
        expect(computeMixMatchPrice([], "PERCENTAGE", 10, null, 300)).toEqual({
            originalPrice: 300,
            bundlePrice: 300,
            savings: 0,
        });
    });
});

describe("formatTierLabel", () => {
    it("returns an empty string for no tier", () => {
        expect(formatTierLabel(null)).toBe("");
    });

    it("formats a percentage tier", () => {
        expect(formatTierLabel({ minQuantity: 3, discountType: "PERCENTAGE", discountValue: 15 }))
            .toBe("Buy 3+: 15% off");
    });

    it("formats a fixed-amount tier", () => {
        expect(formatTierLabel({ minQuantity: 2, discountType: "FIXED_AMOUNT", discountValue: 5 }))
            .toBe("Buy 2+: $5 off per item");
    });
});

describe("computeAllTierPrices", () => {
    const tiers = [
        { minQuantity: 2, discountType: "PERCENTAGE", discountValue: 10 },
        { minQuantity: 3, discountType: "PERCENTAGE", discountValue: 20 },
        { minQuantity: 5, discountType: "FIXED_AMOUNT", discountValue: 30 },
    ];

    it("computes price details for every tier", () => {
        const result = computeAllTierPrices(100, 3, tiers);
        expect(result).toHaveLength(3);
        expect(result.map((t) => t.pricePerUnit)).toEqual([90, 80, 70]);
        expect(result.map((t) => t.totalPrice)).toEqual([270, 240, 210]);
        expect(result.map((t) => t.savings)).toEqual([30, 60, 90]);
    });

    it("keeps the original tier fields on each result", () => {
        expect(computeAllTierPrices(100, 3, tiers)[1]).toMatchObject(tiers[1]);
    });

    it("returns an empty array for no tiers", () => {
        expect(computeAllTierPrices(100, 3, [])).toEqual([]);
    });

    it("uses basePrice when valid", () => {
        expect(computeAllTierPrices(100, 1, tiers, 200)[0].pricePerUnit).toBeCloseTo(180);
    });

    // Characterization test: documents CURRENT behavior (see note below the code)
    it("flags a tier applicable only when quantity equals its minQuantity exactly", () => {
        expect(computeAllTierPrices(100, 3, tiers).map((t) => t.isApplicable))
            .toEqual([false, true, false]);
        expect(computeAllTierPrices(100, 4, tiers).map((t) => t.isApplicable))
            .toEqual([false, false, false]);
    });
});