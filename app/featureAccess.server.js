// app/featureAccess.server.js

import { shopPlans } from "./models/shopPlans.server.js";
import {
    canAccessFeature,
    Free_PLAN,
    getTrialPlan,
    getTrialFeatures,
} from "./plans";

/**
 * Map backend feature keys to the exact feature names
 * used by the trial feature list.
 */
const FEATURE_LABELS = {
    BYOB: "BYOB bundles",
    MIX_MATCH: "Mix & Match bundles",
    MULTIVARIANT: "Multivariant bundles",
    ORDER_NOTES_CART: "Order Notes (cart drawer)",
    BASIC_ANALYTICS: "Basic analytics",

    CART_COUNTDOWN: "Cart countdown",
    TESTIMONIALS: "Testimonials widget",
    FULL_ANALYTICS: "Full analytics dashboard",

    FREE_GIFT: "Free-gift progress bar",
    DONATIONS: "Donations (checkout)",
    ORDER_NOTES_CHECKOUT: "Order Notes (checkout)",
    FBT_CHECKOUT: "FBT checkout upsell",

    BASIC_SUPPORT: "Basic support",
    PRIORITY_SUPPORT: "Priority support",
};

/**
 * Get the merchant's effective app plan.
 *
 * Active paid subscriptions return their current plan.
 * Shops without an active subscription use the Shopify-plan-based
 * trial tier while their free trial is active.
 */
export async function getCurrentAppPlan(shop) {
    const paidAppPlan = await shopPlans.getPaidAppPlan(shop);

    if (paidAppPlan) {
        return paidAppPlan;
    }

    const trialDaysRemaining = await shopPlans.getTrialDaysRemaining(shop);

    if (typeof trialDaysRemaining === "number" && trialDaysRemaining > 0) {
        const storePlanName = await shopPlans.getStorePlanName(shop);
        return getTrialPlan(storePlanName);
    }

    return null;
}

/**
 * Check whether a shop can access a feature.
 *
 * Paid plans use normal plan hierarchy.
 * Free trials use the exact trial feature list instead.
 */
export async function canShopAccessFeature(shop, feature) {
    const paidAppPlan = await shopPlans.getPaidAppPlan(shop);

    // Paid subscription → normal plan-based gating.
    if (paidAppPlan) {
        return canAccessFeature(paidAppPlan, feature);
    }

    // No paid subscription → check whether a trial is active.
    const trialDaysRemaining = await shopPlans.getTrialDaysRemaining(shop);

    if (typeof trialDaysRemaining === "number" && trialDaysRemaining > 0) {
        const storePlanName = await shopPlans.getStorePlanName(shop);
        const trialFeatures = getTrialFeatures(storePlanName);
        const featureLabel = FEATURE_LABELS[feature];

        return Boolean(
            featureLabel && trialFeatures.includes(featureLabel)
        );
    }

    // No paid plan and no active trial.
    return false;
}

/**
 * Require access to a feature.
 */
export async function requireFeatureAccess(shop, feature) {
    const hasAccess = await canShopAccessFeature(shop, feature);

    if (!hasAccess) {
        const paidAppPlan = await shopPlans.getPaidAppPlan(shop);
        const currentPlan = paidAppPlan || null;

        throw new Response(
            JSON.stringify({
                error: "FEATURE_NOT_AVAILABLE",
                message: `${feature} requires a higher app plan.`,
                feature,
                currentPlan,
            }),
            {
                status: 403,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }

    return getCurrentAppPlan(shop);
}

export async function requireSidekickAccess(shop) {
    const hasAccess = await canShopAccessFeature(shop, "BASIC_SUPPORT");

    if (!hasAccess) {
        return {
            allowed: false,
            error: "Bundlo Sidekick access is available on the Starter plan and above.",
        };
    }

    return {
        allowed: true,
    };
}
