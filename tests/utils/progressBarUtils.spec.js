import { describe, it, expect, vi } from "vitest";
import {
    sortRules,
    getRewardLabel,
    getUnlockedRewardForCart,
} from "~/utils/progressBarUtils.js";

describe("sortRules", () => {
    it("sorts rules by threshold ascending", () => {
        const rules = [{ threshold: "120" }, { threshold: 40 }, { threshold: "80" }];
        expect(sortRules(rules).map((r) => Number(r.threshold))).toEqual([40, 80, 120]);
    });

    it("does not mutate the input array", () => {
        const rules = [{ threshold: 50 }, { threshold: 10 }];
        sortRules(rules);
        expect(rules.map((r) => r.threshold)).toEqual([50, 10]);
    });

    it("treats a missing threshold as 0", () => {
        expect(sortRules([{ threshold: 10 }, {}])[0]).toEqual({});
    });

    it("returns an empty array when called with no argument", () => {
        expect(sortRules()).toEqual([]);
    });
});

describe("getRewardLabel", () => {
    const formatMoney = (n) => `$${Number(n).toFixed(2)}`;

    it("returns 'Reward' when there is no rule", () => {
        expect(getRewardLabel(null, formatMoney)).toBe("Reward");
    });

    it("prefers a custom label (trimmed) for every reward type", () => {
        for (const type of ["discount_percent", "discount_fixed", "free_gift", "free_shipping"]) {
            expect(getRewardLabel({ type, label: "  Special  " }, formatMoney)).toBe("Special");
        }
    });

    it("builds a default label for a percentage discount", () => {
        expect(getRewardLabel({ type: "discount_percent", value: 15 }, formatMoney)).toBe("15% OFF");
        expect(getRewardLabel({ type: "discount_percent" }, formatMoney)).toBe("0% OFF");
    });

    it("builds a default label for a fixed discount using formatMoney", () => {
        const fm = vi.fn(formatMoney);
        expect(getRewardLabel({ type: "discount_fixed", value: 5 }, fm)).toBe("$5.00 OFF");
        expect(fm).toHaveBeenCalledWith(5);
    });

    it("falls back to default labels for gift and shipping", () => {
        expect(getRewardLabel({ type: "free_gift" }, formatMoney)).toBe("Free gift");
        expect(getRewardLabel({ type: "free_shipping" }, formatMoney)).toBe("Free shipping");
    });

    it("treats a blank label as missing", () => {
        expect(getRewardLabel({ type: "free_gift", label: "   " }, formatMoney)).toBe("Free gift");
    });

    it("defaults unknown types to 'Free shipping'", () => {
        expect(getRewardLabel({ type: "mystery" }, formatMoney)).toBe("Free shipping");
    });
});

describe("getUnlockedRewardForCart", () => {
    const rules = [
        { id: "c", threshold: 120, enabled: true },
        { id: "a", threshold: 40, enabled: true },
        { id: "b", threshold: 80, enabled: true },
    ];

    it("has no unlocked rule and targets the first rule when the cart is below all", () => {
        const { nextRule, unlockedRule } = getUnlockedRewardForCart(rules, 10);
        expect(unlockedRule).toBeNull();
        expect(nextRule.id).toBe("a");
    });

    it("unlocks the highest reached tier and targets the next one", () => {
        const { nextRule, unlockedRule } = getUnlockedRewardForCart(rules, 90);
        expect(unlockedRule.id).toBe("b");
        expect(nextRule.id).toBe("c");
    });

    it("unlocks a tier when the cart equals its threshold exactly (boundary)", () => {
        const { nextRule, unlockedRule } = getUnlockedRewardForCart(rules, 80);
        expect(unlockedRule.id).toBe("b");
        expect(nextRule.id).toBe("c");
    });

    it("has no next rule once every tier is unlocked", () => {
        const { nextRule, unlockedRule } = getUnlockedRewardForCart(rules, 500);
        expect(unlockedRule.id).toBe("c");
        expect(nextRule).toBeNull();
    });

    it("ignores disabled rules", () => {
        const withDisabled = [
            { id: "a", threshold: 40, enabled: false },
            { id: "b", threshold: 80, enabled: true },
        ];
        const { nextRule, unlockedRule } = getUnlockedRewardForCart(withDisabled, 50);
        expect(unlockedRule).toBeNull();
        expect(nextRule.id).toBe("b");
    });

    it("handles missing rules and a missing cart value", () => {
        expect(getUnlockedRewardForCart(null, 10)).toEqual({ nextRule: null, unlockedRule: null });
        expect(getUnlockedRewardForCart(rules).unlockedRule).toBeNull();
    });
});