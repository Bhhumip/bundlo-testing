// Pure data only — no Shopify SDK, no Prisma, no server-only imports.
// Imported by BOTH server code (billing config, loader/action) AND the
// client component (pricing cards). Keep it that way — anything
// server-only belongs in a real `.server.js` file instead.

export const Free_PLAN = "Free plan";
export const Starter_PLAN = "Starter plan";
export const Growth_PLAN = "Growth plan";
export const Pro_PLAN = "Pro plan";
export const ANNUAL_DISCOUNT_PERCENT = 20; // Save X% badge + annual pricing math
export const ANNUAL_DISCOUNT = 1 - ANNUAL_DISCOUNT_PERCENT / 100;
// Every purchasable app plan, in ascending order. Order matters — used to
// render cards left-to-right and to compute "everything in X" rollups.
export const APP_PLANS = [Free_PLAN, Starter_PLAN, Growth_PLAN, Pro_PLAN];

// Shopify's plan name for a partner/dev/test store — can't be charged real
// money, gets an extended local trial instead (see billing route).
export const DEVELOPMENT_STORE_PLAN_NAME = "Development";

// The exact publicDisplayName Shopify returns for a Plus store. VERIFY this
// against a real Plus dev store before shipping — Shopify's GraphQL has
// returned both "Plus" and "Shopify Plus" historically depending on API
// version, and getting this wrong means Plus merchants get incorrectly
// blocked from the one tier that requires it.
export const SHOPIFY_PLUS_STORE_PLAN_NAME = "Plus";

export function getAnnualPrice(plan) {
    const monthlyPrice = PLAN_AMOUNT[plan];

    if (!monthlyPrice) return 0;

    const discountedAnnualPrice =
        monthlyPrice * 12 * ANNUAL_DISCOUNT;

    return Math.ceil(discountedAnnualPrice) - 0.01;
}

export function isShopifyPlusStore(storePlanName) {
    return storePlanName === SHOPIFY_PLUS_STORE_PLAN_NAME;
}

//Amount variables for each plan
export const PLAN_AMOUNT = {
    [Free_PLAN]: 0.00,
    [Starter_PLAN]: 12.99,
    [Growth_PLAN]: 27.99,
    [Pro_PLAN]: 54.99,
};
// Rolling 30-day revenue limits for each plan.
// Revenue is calculated from BundleRevenueDaily.
// A merchant is restricted from creating new bundles once this limit is exceeded.
export const PLAN_REVENUE_LIMITS = {
    [Free_PLAN]: 1000,
    [Starter_PLAN]: 3500,
    [Growth_PLAN]: 12000,
};
// Display metadata for pricing cards.
// Shopify plan eligibility is handled separately by matchingAppPlan()
// and re-validated server-side in the billing action.
export const APP_PLAN_DISPLAY = {
    [Free_PLAN]: {
        label: "Free",
        tagline: "Get your first bundles live.",
        monthlyPrice: PLAN_AMOUNT[Free_PLAN],
        annualPrice: 0.00,
        requiresShopifyPlus: false,
    },
    [Starter_PLAN]: {
        label: "Starter",
        tagline: "More bundle types, more widgets.",
        monthlyPrice: PLAN_AMOUNT[Starter_PLAN],
        annualPrice: getAnnualPrice(Starter_PLAN),
        requiresShopifyPlus: false,
    },
    [Growth_PLAN]: {
        label: "Growth",
        tagline: "For stores ready to scale.",
        monthlyPrice: PLAN_AMOUNT[Growth_PLAN],
        annualPrice: getAnnualPrice(Growth_PLAN),
        requiresShopifyPlus: false,
    },
    [Pro_PLAN]: {
        label: "Pro",
        tagline: "Checkout-level upsells and automation.",
        monthlyPrice: PLAN_AMOUNT[Pro_PLAN],
        annualPrice: getAnnualPrice(Pro_PLAN),
        requiresShopifyPlus: true,
    },
};

// Feature lists exactly as currently implemented — nothing borrowed from
// competitor plans. Each list is only what's NEW at that tier; the UI
// renders "Everything in <previous>" above it.
export const PLAN_FEATURES = {
    [Free_PLAN]: [
        "Fixed bundles",
        "Volume bundles",
        "Announcement bar",
        "Sticky cart",
    ],
    [Starter_PLAN]: [
    "BYOB bundles",
    "Mix & Match bundles",
    "Multivariant bundles",
    "Order Notes (cart drawer)",
    "Basic analytics",
    "Basic support",
],
    [Growth_PLAN]: [
    "Cart countdown",
    "Free Shipping Bar (cart drawer)",
    "Discount Code Field",
    "Full analytics dashboard",
],
    [Pro_PLAN]: [
        "Free-gift progress bar",
        "Testimonials widget",
        "Donations (checkout)",
        "Order Notes (checkout)",
        "FBT checkout upsell",
        "Free Shipping Bar (checkout)",
        "Personalized Recommendation",
        "Priority support",
    ],
};

// "Everything in <prev>" label per plan, null for the first tier.
export const PREVIOUS_PLAN_LABEL = {
    [Free_PLAN]: null,
    [Starter_PLAN]: "Free",
    [Growth_PLAN]: "Starter",
    [Pro_PLAN]: "Growth",
};

export function getCumulativePlanFeatures(plan) {
    const planOrder = [Free_PLAN, Starter_PLAN, Growth_PLAN, Pro_PLAN];
    const planIndex = planOrder.indexOf(plan);

    if (planIndex === -1) {
        return [];
    }

    return planOrder
        .slice(0, planIndex + 1)
        .flatMap((planKey) => PLAN_FEATURES[planKey] || []);
}

// --- Annual variants for paid plans (Free excluded — no billing needed) ---
export const Starter_PLAN_ANNUAL = "Starter plan (Annual)";
export const Growth_PLAN_ANNUAL = "Growth plan (Annual)";
export const Pro_PLAN_ANNUAL = "Pro plan (Annual)";
//testing
// Maps a base plan key -> its annual variant key. Used by action() in
// app.billing.jsx to pick the right billingConfig entry based on the
// billingPeriod toggle. Free plan has no annual variant — never bypassed
// through Shopify billing either way.
export const ANNUAL_PLAN_KEY = {
    [Starter_PLAN]: Starter_PLAN_ANNUAL,
    [Growth_PLAN]: Growth_PLAN_ANNUAL,
    [Pro_PLAN]: Pro_PLAN_ANNUAL,
};

// Reverse map — given an annual key back to its base key. Used when reading
// appSubscriptions[0].name back from Shopify (billing.check()) to figure out
// which card should show "Current plan", regardless of interval.
export const BASE_PLAN_KEY = {
    [Starter_PLAN_ANNUAL]: Starter_PLAN,
    [Growth_PLAN_ANNUAL]: Growth_PLAN,
    [Pro_PLAN_ANNUAL]: Pro_PLAN,
};
// Trial length for standard (non-dev) stores. Change this one value to
// adjust the trial everywhere — loader, action, and shopPlans.server.js
// all read from here.
export const TRIAL_DAYS = 14;
export const DEV_STORE_TRIAL_DAYS = 30;
export function getAccessiblePlans(storePlanName) {
    const normalized = (storePlanName ?? "").trim().toLowerCase();

    if (normalized === "development") {
        return [Free_PLAN, Starter_PLAN, Growth_PLAN, Pro_PLAN];
    }

    if (normalized.includes("plus")) {
        return [Free_PLAN, Pro_PLAN];
    }

    if (normalized.includes("advanced")) {
        return [Free_PLAN, Growth_PLAN];
    }

    if (
        normalized.includes("basic") ||
        normalized.includes("grow")
    ) {
        return [Free_PLAN, Starter_PLAN];
    }

    return [Free_PLAN];
}


// --- Shopify plan tier → app plan gating -----------------------------
// Free is always available. Exactly ONE paid tier unlocks per Shopify
// plan — not "this tier or below/above". Dev stores bypass this gate
// entirely (isDevStore already blocks real purchase separately).
export function matchingAppPlan(storePlanName) {
    if (!storePlanName) return null;

    const normalized = storePlanName.trim().toLowerCase();

    if (normalized === "development") return null;
    if (normalized.includes("plus")) return Pro_PLAN;
    if (normalized.includes("advanced")) return Growth_PLAN;

    if (
        normalized.includes("basic") ||
        normalized.includes("grow")
    ) {
        return Starter_PLAN;
    }

    return null;
} // mid-tier "Shopify" plan, or an unrecognized name

// Human-readable requirement shown on a locked card's disabled button and
// explanation text. Keyed by app plan, not by Shopify plan — makes it easy
// to update wording without touching app.billing.jsx.
export const APP_PLAN_REQUIRED_SHOPIFY_LABEL = {
    [Starter_PLAN]: "Basic or Grow Shopify plan",
    [Growth_PLAN]: "Advanced Shopify plan",
    [Pro_PLAN]: "Shopify Plus",
};

// --- Feature access requirements ------------------------------------
// Each feature has one minimum app plan.
// Higher plans inherit access to lower-tier features.
// Keep this separate from PLAN_FEATURES because PLAN_FEATURES is also
// used for pricing-card display text.
export const FEATURE_MIN_PLAN = {
    // Free
    STICKY_CART: Free_PLAN,
    ANNOUNCEMENT_BAR: Free_PLAN,
    // Starter
    BYOB: Starter_PLAN,
    FIXED_BUNDLE: Starter_PLAN,
    VOLUME_BUNDLE: Starter_PLAN,
    MIX_MATCH: Starter_PLAN,
    MULTIVARIANT: Starter_PLAN,
    ORDER_NOTES_CART: Starter_PLAN,
    CART_COUNTDOWN: Growth_PLAN,
    BASIC_ANALYTICS: Starter_PLAN,
    BASIC_SUPPORT: Starter_PLAN,

    // Growth
    FREE_SHIPPING_CART: Growth_PLAN,
DISCOUNT_CODE_FIELD: Growth_PLAN,
    FULL_ANALYTICS: Growth_PLAN,

    // Pro
    FREE_GIFT: Pro_PLAN,
    DONATIONS: Pro_PLAN,
    ORDER_NOTES_CHECKOUT: Pro_PLAN,
    FBT_CHECKOUT: Pro_PLAN,
    TESTIMONIALS: Pro_PLAN,
FREE_SHIPPING_CHECKOUT: Pro_PLAN,
CUSTOMER_PERSONALIZED_RECOMMENDATION: Pro_PLAN,
PRIORITY_SUPPORT: Pro_PLAN,
};

const PLAN_RANK = {
    [Free_PLAN]: 0,
    [Starter_PLAN]: 1,
    [Growth_PLAN]: 2,
    [Pro_PLAN]: 3,
};

export function canAccessFeature(appPlan, feature) {
    const requiredPlan = FEATURE_MIN_PLAN[feature];

    // Unknown features should never accidentally become accessible.
    if (!requiredPlan) {
        return false;
    }

    const currentRank = PLAN_RANK[appPlan] ?? PLAN_RANK[Free_PLAN];
    const requiredRank = PLAN_RANK[requiredPlan];

    return currentRank >= requiredRank;
}

export function getTrialPlan(storePlanName) {
    const normalized = (storePlanName ?? "").trim().toLowerCase();

    if (normalized === "development") return Pro_PLAN;
    if (normalized.includes("plus")) return Pro_PLAN;
    if (normalized.includes("advanced")) return Growth_PLAN;

    if (
        normalized.includes("basic") ||
        normalized.includes("grow")
    ) {
        return Starter_PLAN;
    }

    return Free_PLAN;
}

export function getTrialFeatures(storePlanName) {
    const trialPlan = getTrialPlan(storePlanName);

    if (trialPlan === Pro_PLAN) {
        return [
            ...getCumulativePlanFeatures(Growth_PLAN),
            ...PLAN_FEATURES[Pro_PLAN],
        ].filter(
            (feature) =>
                feature !== "Basic support" &&
                feature !== "Basic analytics" &&
                feature !== "Full analytics dashboard" &&
                feature !== "Priority support"
        );
    }

    if (trialPlan === Growth_PLAN) {
        return getCumulativePlanFeatures(Growth_PLAN).filter(
            (feature) =>
                feature !== "Basic support" &&
                feature !== "Basic analytics" &&
                feature !== "Full analytics dashboard" &&
                feature !== "Priority support"
        );
    }

    if (trialPlan === Starter_PLAN) {
    return getCumulativePlanFeatures(Starter_PLAN).filter(
        (feature) =>
            feature !== "Basic support" &&
            feature !== "Basic analytics"
    );
}

    return [];
}

