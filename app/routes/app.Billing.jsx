// app/routes/app.billing.jsx
// Billing — plan selector (Basic / Standard / Advance / Plus).


import { useLoaderData, useNavigation, useActionData, Form ,useSubmit, } from "react-router";
import { useState } from "react";
import { authenticate, IS_TEST_BILLING } from "../shopify.server";
import {
    APP_PLANS,
    APP_PLAN_DISPLAY,
    PLAN_FEATURES,
    PREVIOUS_PLAN_LABEL,
    getCumulativePlanFeatures,
    DEVELOPMENT_STORE_PLAN_NAME,
    DEV_STORE_TRIAL_DAYS,
    TRIAL_DAYS,
    Free_PLAN,
    Starter_PLAN,
    Starter_PLAN_ANNUAL,
    Growth_PLAN_ANNUAL,
    Pro_PLAN_ANNUAL,
    ANNUAL_PLAN_KEY,
    BASE_PLAN_KEY,
    matchingAppPlan,
    APP_PLAN_REQUIRED_SHOPIFY_LABEL,
    getTrialPlan,
getTrialFeatures,
} from "../plans";
import { useEffect } from "react";
import { shopPlans } from "../models/shopPlans.server";
import { ANNUAL_DISCOUNT_PERCENT } from "../plans";
import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import PropTypes from "prop-types";

export function ErrorBoundary() {
    return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};

// async function getStorePlanName(admin, shop) {
//     console.log("========== TEST START ==========");

//     try {
//         const response = await admin.graphql(`
//       query {
//         shop {
//           id
//           name
//           myshopifyDomain
//         }
//       }
//     `);

//         console.log("GraphQL response status:", response.status);

//         const data = await response.json();

//         console.log("========== SHOP QUERY RESULT ==========");
//         console.log(JSON.stringify(data, null, 2));
//         console.log("=======================================");

//         return data?.data?.shop?.name ?? null;

//     } catch (error) {
//         console.log("========== SHOP QUERY ERROR ==========");
//         console.error(error);
//         console.log("=======================================");

//         return null;
//     }
// }
async function getStorePlanName(admin, shop) {
    try {
        const response = await admin.graphql(
            `#graphql
            query ShopPlanForBilling {
                shop {
                    plan {
                        publicDisplayName
                    }
                }
            }`,
        );

        const { data } = await response.json();

        const planName = data?.shop?.plan?.publicDisplayName ?? null;

        console.log(
            `[billing] shop plan lookup for ${shop}:`,
            planName
        );

        return planName;
    } catch (err) {
        console.error(
            `[billing] shop plan lookup failed for ${shop}`,
            err
        );

        return null;
    }
}
// ---------------------------- SERVER: LOADER ----------------------------

export async function loader({ request }) {
    const { admin, billing, session } = await authenticate.admin(request);

    // const storePlanName = "Advanced";
   // const storePlanName = "Basic";
 const storePlanName = await getStorePlanName(admin, session.shop);

await shopPlans.setShopifyPlanName(
    session.shop,
    storePlanName
);

    const trialPlan = getTrialPlan(storePlanName);
    const trialFeatures = getTrialFeatures(storePlanName); 
    const isDevStore = storePlanName === DEVELOPMENT_STORE_PLAN_NAME;
    const trialDays = isDevStore ? DEV_STORE_TRIAL_DAYS : TRIAL_DAYS;

    await shopPlans.applyPendingChangeIfDue(session.shop);

    let hasActivePayment = false;
    let subscribedPlan = null;
    let subscribedBillingPeriod = null;
    let billingCheckFailed = false;
    let paidAppPlan = null;

    try {
        const result = await billing.check({
            plans: [
                ...APP_PLANS,
                Starter_PLAN_ANNUAL,
                Growth_PLAN_ANNUAL,
                Pro_PLAN_ANNUAL,
            ],
            isTest: IS_TEST_BILLING,
        });

        console.log("[billing] hasActivePayment:", result.hasActivePayment);
        console.log("[billing] appSubscriptions:", result.appSubscriptions);
        console.log("[billing] FULL BILLING CHECK RESULT:", result);

        hasActivePayment = result.hasActivePayment;

        const subscription = result.appSubscriptions[0] ?? null;
        const subscriptionName = subscription?.name ?? null;

        subscribedPlan =
            BASE_PLAN_KEY[subscriptionName] ??
            subscriptionName ??
            null;

        if (subscriptionName) {
            subscribedBillingPeriod =
                subscriptionName.includes("(Annual)")
                    ? "annual"
                    : "monthly";
        }

        await shopPlans.upsertFromSubscription(
            session.shop,
            subscription,
            trialDays
        );

        paidAppPlan = await shopPlans.getPaidAppPlan(session.shop);

    } catch (err) {
        console.error(
            `[billing] billing.check failed for ${session.shop}`,
            err
        );

        billingCheckFailed = true;

        paidAppPlan = await shopPlans.getPaidAppPlan(session.shop);
    }

    const hasTrialStarted =
    await shopPlans.hasTrialStarted(session.shop);

    const trialDaysRemainingRaw =
        await shopPlans.getTrialDaysRemaining(session.shop);

    const trialDaysRemaining =
        typeof trialDaysRemainingRaw === "number"
            ? trialDaysRemainingRaw
            : 0;
    
    const expiryStatus = await shopPlans.getPlanExpiryStatus(session.shop);        

    const pendingChange = await shopPlans.getPendingPlanChange(
    session.shop
);
    if (!billingCheckFailed && !subscribedPlan) {
        subscribedPlan = paidAppPlan ?? Free_PLAN;
    }

    console.log("[billing] FINAL:", {
        hasActivePayment,
        subscribedPlan,
        subscribedBillingPeriod,
        paidAppPlan,
    });

    return {
        hasActivePayment,
        subscribedPlan: billingCheckFailed
            ? paidAppPlan
            : subscribedPlan,
        paidAppPlan,    
        subscribedBillingPeriod,
        trialDaysRemaining,
        trialLengthDays: trialDays,
        isDevStore,
        storePlanName,
        billingCheckFailed,
        expiryStatus,
        pendingChange,
        trialPlan,
        trialFeatures,
        hasTrialStarted,
    };
}

// ---------------------------- SERVER: ACTION ----------------------------

export async function action({ request }) {
    const { admin, billing, session } = await authenticate.admin(request);

    const formData = await request.formData();
    const actionType = formData.get("actionType");
    console.log("[billing] ACTION HIT");
    console.log("[billing] actionType:", actionType);
    console.log("[billing] shop:", session.shop);

    const billingPeriod = formData.get("billingPeriod") || "monthly";
    const cancelOption = formData.get("cancelOption");

    // Validate billing period
    if (!["monthly", "annual"].includes(billingPeriod)) {
        return { error: "Invalid billing period selected." };
    }

    // Build return URL for Shopify billing confirmation
    const url = new URL(request.url);
    url.protocol = "https:";
    url.pathname = "/app/Billing";

    const host = url.searchParams.get("host");
    const shop = url.searchParams.get("shop");

    url.search = "";

    if (host) url.searchParams.set("host", host);
    if (shop) url.searchParams.set("shop", shop);

    url.hash = "";

    const returnUrl = url.toString();
    console.log("[billing] returnUrl:", returnUrl);
    if (actionType === "start_trial") {
    const storePlanName = await getStorePlanName(admin, session.shop);
    const trialPlan = getTrialPlan(storePlanName);

    const isDevStore =
        storePlanName === DEVELOPMENT_STORE_PLAN_NAME;

    const trialDays = isDevStore
        ? DEV_STORE_TRIAL_DAYS
        : TRIAL_DAYS;

    if (trialPlan === Free_PLAN) {
        return {
            error: "Free trial is not available for this Shopify plan.",
        };
    }

    await shopPlans.ensureTrialStarted(
        session.shop,
        trialDays
    );

    return {
        trialStarted: true,
        trialPlan,
    };
}

    // ============================================================
    // SUBSCRIBE
    // ============================================================

    if (actionType === "subscribe") {
        const requestedPlan = formData.get("plan");

        // Make sure requested plan is one of our app plans
        if (!APP_PLANS.includes(requestedPlan)) {
            return { error: "Unknown plan selected." };
        }

        // --------------------------------------------------------
        // FREE PLAN
        // --------------------------------------------------------
        // Free plan never touches Shopify Billing API.
        if (requestedPlan === Free_PLAN) {
    try {
        const { appSubscriptions } = await billing.check({
            plans: [
                ...APP_PLANS,
                Starter_PLAN_ANNUAL,
                Growth_PLAN_ANNUAL,
                Pro_PLAN_ANNUAL,
            ],
            isTest: IS_TEST_BILLING,
        });

        const subscription = appSubscriptions[0] ?? null;

        // No paid subscription → activate Free immediately
        if (!subscription) {
            await shopPlans.activateFreePlan(session.shop);

            return {
                activatedFree: true,
            };
        }

        // Paid subscription exists → schedule cancellation
        await billing.cancel({
            subscriptionId: subscription.id,
            isTest: subscription.test ?? IS_TEST_BILLING,
            prorate: true,
        });

       // Test Only - const testEffectiveAt = new Date(Date.now() + 2 * 60 * 1000);
        await shopPlans.scheduleCancellation(
    session.shop,
    subscription.currentPeriodEnd, // Test Only - testEffectiveAt,
    subscription.name.includes("(Annual)") ? "annual" : "monthly"
);

        return {
            cancelled: true,
            cancellationScheduled: true,
            effectiveAt: subscription.currentPeriodEnd,
        };
    } catch (err) {
        console.error(
            `[billing] free plan activation failed for ${session.shop}`,
            err
        );

        return {
            error:
                "We couldn't change your plan right now. Please try again.",
        };
    }
}

        // --------------------------------------------------------
        // PAID PLAN
        // --------------------------------------------------------

        const requestedBillingPlan =
            billingPeriod === "annual"
                ? ANNUAL_PLAN_KEY[requestedPlan]
                : requestedPlan;

        if (!requestedBillingPlan) {
            return {
                error: "Invalid plan or billing period combination.",
            };
        }

        // Get Shopify store tier
        const storePlanName = await getStorePlanName(admin, session.shop);

       // const storePlanName = "Advanced";

        const isDevStore =
            storePlanName === DEVELOPMENT_STORE_PLAN_NAME;

        // --------------------------------------------------------
        // DEVELOPMENT STORE
        // --------------------------------------------------------

        if (isDevStore) {
            return {
                error:
                    "Development stores can't purchase a plan — Shopify doesn't allow real charges against them.",
            };
        }

        // --------------------------------------------------------
        // SHOPIFY PLAN → APP PLAN GATING
        // --------------------------------------------------------
        // Example:
        // Plus     → Pro
        // Advanced → Growth
        // Basic    → Starter
        //
        // Free is always available.
        // Only the matching paid tier can be purchased.

        const matchedPlan = matchingAppPlan(storePlanName);

        if (
            requestedPlan !== Free_PLAN &&
            requestedPlan !== Starter_PLAN &&
            matchedPlan !== null &&
            requestedPlan !== matchedPlan
        ) {
            return {
                error:
                    `${APP_PLAN_DISPLAY[requestedPlan].label} isn't available for your store's current Shopify plan.`,
            };
        }

        // --------------------------------------------------------
        // CHECK EXISTING SHOPIFY SUBSCRIPTION
        // --------------------------------------------------------

        try {
            const { appSubscriptions } = await billing.check({
                plans: [
                    ...APP_PLANS,
                    Starter_PLAN_ANNUAL,
                    Growth_PLAN_ANNUAL,
                    Pro_PLAN_ANNUAL,
                ],
                isTest: IS_TEST_BILLING,
            });

            console.log(
                "[billing] requestedPlan:",
                requestedPlan
            );

            console.log(
                "[billing] requestedBillingPlan:",
                requestedBillingPlan
            );

            console.log(
                "[billing] storePlanName:",
                storePlanName
            );

            console.log(
                "[billing] matchedPlan:",
                matchedPlan
            );

            console.log(
                "[billing] isDevStore:",
                isDevStore
            );

            console.log(
                "[billing] IS_TEST_BILLING:",
                IS_TEST_BILLING
            );

            // ----------------------------------------------------
            // START SHOPIFY BILLING
            // ----------------------------------------------------

            const existingSubscription = appSubscriptions[0] ?? null;

            console.log("Existing subscription before plan change:", {
    name: existingSubscription?.name,
    id: existingSubscription?.id,
    currentPeriodEnd: existingSubscription?.currentPeriodEnd,
});


            if (existingSubscription) {
    console.log("[billing] Scheduling plan change:", {
        requestedPlan,
        billingPeriod,
        effectiveAt: existingSubscription.currentPeriodEnd,
    });

    await shopPlans.schedulePlanChange(
        session.shop,
        requestedPlan,
        billingPeriod,
        existingSubscription.currentPeriodEnd
    );
}

const confirmation = await billing.request({
    plan: requestedBillingPlan,
    isTest: IS_TEST_BILLING,
    returnUrl,
    returnObject: true,
    ...(existingSubscription
        ? {
            replacementBehavior:
                "APPLY_ON_NEXT_BILLING_CYCLE",
        }
        : {}),
});

console.log("[billing] CONFIRMATION RESPONSE:", confirmation);
console.log(
    "[billing] CONFIRMATION URL:",
    confirmation?.confirmationUrl
);

return {
    confirmationUrl: confirmation.confirmationUrl,
};

            return {
                confirmationUrl: confirmation.confirmationUrl,
            };
        } catch (err) {
            if (err instanceof Response) {
                throw err;
            }

            console.error(
                `[billing] subscribe failed for ${session.shop}`,
                err
            );

            return {
                error:
                    "We couldn't start checkout with Shopify. Please try again in a moment.",
            };
        }
    }

    // ============================================================
    // CANCEL
    // ============================================================

    if (actionType === "cancel") {
        if (cancelOption !== "end_of_period") {
            return {
                error: "Invalid cancellation option.",
            };
        }
        console.log("[billing] CANCEL ACTION STARTED");

        try {
            const { appSubscriptions } = await billing.check({
                plans: [
                    ...APP_PLANS,
                    Starter_PLAN_ANNUAL,
                    Growth_PLAN_ANNUAL,
                    Pro_PLAN_ANNUAL,
                ],
                isTest: IS_TEST_BILLING,
            });

            console.log(
                "[billing] subscriptions before cancel:",
                appSubscriptions
            );

            const subscription = appSubscriptions[0];

            // No Shopify subscription found
            if (!subscription) {
                console.log(
                    "[billing] NO ACTIVE SUBSCRIPTION"
                );

                await shopPlans.markCancelled(
                    session.shop
                );

                return {
                    error:
                        "No active subscription found to cancel.",
                };
            }

            console.log(
                "[billing] cancelling subscription:",
                subscription.id
            );

            const cancelledSubscription =
                await billing.cancel({
                    subscriptionId: subscription.id,
                    isTest:
                        subscription.test ??
                        IS_TEST_BILLING,
                    prorate: true,
                });

            console.log(
                "[billing] Shopify cancel response:",
                cancelledSubscription
            );

            console.log("[billing] cancellation currentPeriodEnd:", subscription.currentPeriodEnd);
            console.log("[billing] cancellation response:", cancelledSubscription);

            // Schedule Free plan after current billing period ends
            await shopPlans.scheduleCancellation(
            session.shop,
            subscription.currentPeriodEnd, 
            subscription.name.includes("(Annual)") ? "annual" : "monthly"
        );

            console.log(
                "[billing] CANCELLATION SCHEDULED:",
                subscription.currentPeriodEnd
            );

            return {
                cancelled: true,
                cancellationScheduled: true,
                effectiveAt: subscription.currentPeriodEnd,
            };
        } catch (err) {
            console.error(
                `[billing] cancel failed for ${session.shop}`,
                err
            );

            return {
                error:
                    "We couldn't cancel your subscription. Please try again or contact support.",
            };
        }
    }

    // ============================================================
    // UNKNOWN ACTION
    // ============================================================

    return {
        error: "Unknown action",
    };
}

// --------------------------- CLIENT: COMPONENT --------------------------

function formatPrice(amount) {
    return `$${amount.toFixed(2)}`;
}

function PlanCard({
    planKey,
    isCurrent,
    isSubmitting,
    billingPeriod,
    subscribedBillingPeriod,
    allowBillingPeriodChange,
    storePlanName,
    isDevStore,
    hasActivePayment,
    paidAppPlan,
    pendingChange,
    currentBillingPeriod,
    isTrialExpired,
    trialPlan,
    trialFeatures,
        hasTrialStarted,
}) {
    const isFreeLocked = planKey === Free_PLAN && (hasActivePayment || isTrialExpired);
    const display = APP_PLAN_DISPLAY[planKey];
    const isFreeTrialActive =
    planKey === Free_PLAN &&
    !hasActivePayment &&
    hasTrialStarted &&
    !isTrialExpired;
    const shouldStartTrial = planKey === Free_PLAN && !hasActivePayment && !isTrialExpired && trialPlan !== Free_PLAN;

    const features =
    planKey === Free_PLAN && trialPlan !== Free_PLAN
        ? trialFeatures
        : planKey === Starter_PLAN
            ? getCumulativePlanFeatures(Starter_PLAN)
            : PLAN_FEATURES[planKey];

    const previousLabel = PREVIOUS_PLAN_LABEL[planKey];
    const price = billingPeriod === "annual" ? display.annualPrice : display.monthlyPrice;
    const matchedPlan = isDevStore ? null : matchingAppPlan(storePlanName);
    console.log("PLAN CARD DEBUG", {
    planKey,
    trialPlan,
    trialFeatures,
    hasTrialStarted,
    isTrialExpired,
    hasActivePayment,
    isFreeTrialActive,
});
    // Free is always open. On dev stores, every card is open for testing.
    // On real stores, only Free + the one matching paid tier are open.
    const isLockedByPlatform =
        !isDevStore && planKey !== Free_PLAN && matchedPlan !== null && planKey !== matchedPlan;
    // Highlight whichever card actually matches this store's Shopify plan —
    // not hardcoded to Pro. On dev stores (matchedPlan is null), nothing
    // gets the highlight since there's no real match to recommend.
    const isRecommended = matchedPlan === planKey;
    const isUpcoming =
    pendingChange?.pendingChangeType === "PLAN_CHANGE" &&
    pendingChange?.pendingPlan === planKey &&
    pendingChange?.pendingBillingPeriod === billingPeriod;
    const isSamePlanDifferentBillingPeriod =
    hasActivePayment &&
    paidAppPlan === planKey &&
    currentBillingPeriod &&
    subscribedBillingPeriod &&
    billingPeriod !== subscribedBillingPeriod &&
    !allowBillingPeriodChange;

    return (
        <div
            style={{
                background: "#ffffff",
                border: isRecommended || isCurrent ? "2px solid #6FE3A0" : "1px solid #d1d5db",
                borderRadius: "22px",
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                minHeight: "420px",
                boxShadow: isRecommended
                    ? "0 18px 40px -18px rgba(15,120,70,0.25)"
                    : "0 1px 2px rgba(0,0,0,0.04)",
                    transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                    position: "relative",
                                }}
                                onMouseEnter={(event) => {
                        event.currentTarget.style.transform = "translateY(-2px)";
                        event.currentTarget.style.boxShadow = isRecommended
                            ? "0 18px 40px -18px rgba(15,120,70,0.25)"
                            : "0 10px 26px rgba(15, 23, 42, 0.11)";
                    }}
                    onMouseLeave={(event) => {
                        event.currentTarget.style.transform = "translateY(0)";
                        event.currentTarget.style.boxShadow = isRecommended
                            ? "0 18px 40px -18px rgba(15,120,70,0.25)"
                            : "0 1px 2px rgba(15, 23, 42, 0.04)";
                    }}
                   >
            {(isCurrent || isUpcoming) && (
                <div
                    style={{
                        position: "absolute",
                        top: "-10px",
                        right: "18px",
                        zIndex: 20,
                    }}
                >
                    {isCurrent && (
                        <s-badge tone="success">
                            Current plan
                        </s-badge>
                    )}

                    {isUpcoming && !isCurrent && (
                        <s-badge tone="info">
                            Upcoming plan
                        </s-badge>
                    )}
                </div>
            )}

            <s-stack direction="block" gap="small-300">
                <s-heading>{display.label}</s-heading>
                <s-text tone="subdued">{display.tagline}</s-text>

                {display.requiresShopifyPlus && (
                    <s-badge tone={matchedPlan === planKey ? "success" : "info"}>
                        {matchedPlan === planKey ? "Your store qualifies" : "Requires Shopify Plus"}
                    </s-badge>
                )}

                <div style={{ marginTop: "8px", marginBottom: "4px" }}>
                    <s-text>
                        <span style={{ fontSize: "30px", fontWeight: 700 }}>{formatPrice(price)}</span>
                        {/* Show the correct billing period next to the displayed price. */}
                        <span style={{ fontSize: "13px" }}>
                            {billingPeriod === "annual" ? " /year" : " /month"}
                        </span>
                    </s-text>
                </div>

                {billingPeriod === "annual" && (
                    <s-text tone="subdued">Billed annually at {formatPrice(price)}</s-text>
                )}
            </s-stack>

            <div style={{ marginTop: "16px" }}>
                {isLockedByPlatform || isFreeLocked ? (
                    <s-button disabled>
                        {isFreeLocked
                            ? isTrialExpired
                                ? "Free trial ended"
                                : "Free plan unavailable" 
                            : `Requires ${APP_PLAN_REQUIRED_SHOPIFY_LABEL[planKey] ?? "a different Shopify plan"}`}
                    </s-button>
                ) : (

                    <Form method="post" >
                        <input type="hidden" name="actionType" value={shouldStartTrial ? "start_trial" : "subscribe"}/>
                        <input type="hidden" name="plan" value={planKey} />
                        <input type="hidden" name="billingPeriod" value={billingPeriod} />{/* Send the selected billing period to the backend so it knows
        whether the merchant chose monthly or annual billing. */}
                        <s-button
                            type="submit"
                            variant={isUpcoming ? "secondary" : "primary"}
                            disabled={isSubmitting || isCurrent || isUpcoming || isSamePlanDifferentBillingPeriod}
                        >
                            {isCurrent ? "Current plan" : isUpcoming ? "Upcoming plan": isSamePlanDifferentBillingPeriod ? `Cancel ${ subscribedBillingPeriod === "annual" ? "Annual" : "Monthly"  } plan to switch` : isSubmitting ? "Processing..." : "Start now"}
                        </s-button>
                    </Form>
                )}
            </div>

            <div style={{ borderTop: `1px solid ${isRecommended || isCurrent ? "#6FE3A0" : "#e5e7eb"}`, margin: "18px 0" }} />

            <s-unordered-list>
                {previousLabel && planKey !== Starter_PLAN && (
                    <s-list-item>Everything in {previousLabel}</s-list-item>
                )}
                {features.map((feature) => (
                    <s-list-item key={feature}>{feature}</s-list-item>
                ))}
            </s-unordered-list>
        </div>
    );
}
PlanCard.propTypes = {
    planKey: PropTypes.string.isRequired,
    isCurrent: PropTypes.bool.isRequired,
    isSubmitting: PropTypes.bool.isRequired,
    billingPeriod: PropTypes.string.isRequired,
    subscribedBillingPeriod: PropTypes.string,
    allowBillingPeriodChange: PropTypes.bool.isRequired,
    storePlanName: PropTypes.string,
    isDevStore: PropTypes.bool.isRequired,
    hasActivePayment: PropTypes.bool.isRequired,
    paidAppPlan: PropTypes.string,
    currentBillingPeriod: PropTypes.string,
    isTrialExpired: PropTypes.bool.isRequired,
    trialPlan: PropTypes.string,
    trialFeatures: PropTypes.arrayOf(PropTypes.string),
    pendingChange: PropTypes.shape({
        pendingChangeType: PropTypes.string,
        pendingPlan: PropTypes.string,
        pendingBillingPeriod: PropTypes.string,
    }),
};

export default function BillingPage() {
    const {
    hasActivePayment,
    subscribedPlan,
    paidAppPlan,
    subscribedBillingPeriod,
    trialDaysRemaining,
    hasTrialStarted,
    trialLengthDays,
    isDevStore,
    storePlanName,
    billingCheckFailed,
    expiryStatus,
    pendingChange,
    trialPlan,
    trialFeatures,
} = useLoaderData();
    const actionData = useActionData();
    const navigation = useNavigation();
    const submit = useSubmit();
    const isSubmitting = navigation.state !== "idle";
    const discountPercent = ANNUAL_DISCOUNT_PERCENT; // 15% discount for annual billing

    const [billingPeriod, setBillingPeriod] = useState("monthly");
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [planChangeOption, setPlanChangeOption] = useState("cancel");
    const [allowBillingPeriodChange, setAllowBillingPeriodChange] = useState(false);
    const alternateBillingPeriod = subscribedBillingPeriod === "annual" ? "monthly" : "annual";

    const currentBillingPeriod =
    pendingChange?.pendingChangeType === "PLAN_CHANGE" &&
    pendingChange?.pendingPlan === paidAppPlan
        ? pendingChange.pendingBillingPeriod === "annual"
            ? "monthly"
            : "annual"
        : subscribedBillingPeriod;
    const isTrialing =
    !hasActivePayment &&
    hasTrialStarted &&
    trialDaysRemaining > 0;

const isTrialExpired =
    !hasActivePayment &&
    hasTrialStarted &&
    trialDaysRemaining <= 0;

    useEffect(() => {
        if (actionData?.confirmationUrl) {
            open(actionData.confirmationUrl, "_top");
        }
    }, [actionData]);

    return (
        <s-page heading="Billing">
            <s-section>
                <s-stack direction="block" gap="base">
                    {billingCheckFailed && (
                        <s-banner heading="Showing your last known billing status" tone="warning">
                            We couldn&apos;t reach Shopify&apos;s billing service just now. Refresh in a moment.
                        </s-banner>
                    )}
                    {actionData?.activatedFree && (
                        <s-banner heading="Free plan activated" tone="success">
                            You're now on the Free plan.
                        </s-banner>
                    )}

                    {actionData?.error && (
                        <s-banner heading="Something went wrong" tone="critical">
                            {actionData.error}
                        </s-banner>
                    )}

                    {pendingChange?.pendingChangeType === "CANCELLATION" && (
                        <s-banner heading="Cancellation scheduled" tone="info">
                        Your {pendingChange.currentPlan} benefits remain active until{" "}
                        {pendingChange.pendingEffectiveAt
                            ? new Date(
                                pendingChange.pendingEffectiveAt
                            ).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })
                            : "the end of your billing period"}
                        . After that, your current plan will end and you can choose a paid plan again.
                    </s-banner>
                    )}

                    {isDevStore && (
                        <s-banner heading="Development store" tone="info">
                            Development stores get an extended {trialLengthDays}-day trial and can&apos;t purchase
                            a plan. Install on your live store to subscribe.
                        </s-banner>
                    )}

                    {isTrialing && !isDevStore && (
                        <s-banner heading={`${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} left in your trial`} tone="info">
                            Subscribe any time to keep bundling without interruption.
                        </s-banner>
                    )}

                    {expiryStatus?.isExpired &&expiryStatus?.planName === "Free Trial" && !hasActivePayment && (
                        <s-banner heading="Free trial ended" tone="info">
                            Your {trialLengthDays}-day free trial has ended.
                            You can now choose a plan available for your Shopify store.
                        </s-banner>
                    )}

                    <s-paragraph tone="auto">
                        Every plan includes core bundling. Higher tiers add more widgets, analytics, and
                        checkout-level upsells.
                    </s-paragraph>

                    {pendingChange?.pendingChangeType === "PLAN_CHANGE" && (
                        <s-banner
                            heading={
                                pendingChange.pendingPlan === subscribedPlan
                                    ? "Billing period change scheduled"
                                    : "Plan change scheduled"
                            }
                            tone="info"
                        >
                            Your current{" "}
                            <strong>{pendingChange.currentPlan}</strong> plan remains active until{" "}
                            {pendingChange.pendingEffectiveAt
                        ? new Date(
                            pendingChange.pendingEffectiveAt
                        ).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })
                        : "the end of your billing period"}
                            . After that,{" "}
                            <strong>
                                {pendingChange.pendingPlan}
                                {pendingChange.pendingBillingPeriod === "annual"
                                    ? " Annual"
                                    : " Monthly"}
                            </strong>{" "}
                            will start automatically.
                        </s-banner>
                    )}
                    {/* Monthly / Annual toggle */}
                    <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 16px" }}>
                        <div
                            style={{
                                display: "inline-flex",
                                background: "#f1f1f1",
                                borderRadius: "999px",
                                padding: "4px",
                                gap: "2px",
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setBillingPeriod("monthly")}
                                style={{
                                    border: "none",
                                    borderRadius: "999px",
                                    padding: "8px 18px",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    background: billingPeriod === "monthly" ? "#1A1A1A" : "transparent",
                                    color: billingPeriod === "monthly" ? "#fff" : "#3f3f3f",
                                }}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                onClick={() => setBillingPeriod("annual")}
                                style={{
                                    border: "none",
                                    borderRadius: "999px",
                                    padding: "8px 18px",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    background: billingPeriod === "annual" ? "#1A1A1A" : "transparent",
                                    color: billingPeriod === "annual" ? "#fff" : "#3f3f3f",
                                }}
                            >
                                Annual
                                <span
                                    style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        background: billingPeriod === "annual" ? "rgba(255,255,255,0.18)" : "#E4F6EB",
                                        color: billingPeriod === "annual" ? "#C9F5DB" : "#0E6B3A",
                                        padding: "2px 7px",
                                        borderRadius: "999px",
                                    }}
                                >
                                    Save {discountPercent}%
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Pricing card grid — same 2-col responsive pattern as the
              bundle-type selector on the dashboard */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                            gap: "16px",
                        }}
                    >
                        {APP_PLANS.map((planKey) => (
                            <PlanCard
                                key={planKey}
                                planKey={planKey}
                                hasTrialStarted={hasTrialStarted}
                                isCurrent={
                                    planKey === Free_PLAN
                                        ? (
                                            (
                                                paidAppPlan === Free_PLAN ||
                                                !paidAppPlan &&
                                                (
                                                    hasTrialStarted &&
                                                    !isTrialExpired
                                                )
                                            ) &&
                                            pendingChange?.pendingChangeType !== "CANCELLATION"
                                        )
                                        : paidAppPlan === planKey &&
                                        (
                                            pendingChange?.pendingChangeType === "CANCELLATION"
                                                ? pendingChange.pendingBillingPeriod === billingPeriod
                                                : currentBillingPeriod === billingPeriod
                                        )
                                }
                                storePlanName={storePlanName}
                                isSubmitting={isSubmitting}
                                billingPeriod={billingPeriod}
                                isDevStore={isDevStore}
                                hasActivePayment={hasActivePayment}
                                paidAppPlan={paidAppPlan}
                                subscribedBillingPeriod={subscribedBillingPeriod}
                                currentBillingPeriod={currentBillingPeriod}
                                allowBillingPeriodChange={allowBillingPeriodChange}
                                pendingChange={pendingChange}
                                isTrialExpired={isTrialExpired}
                                trialPlan={trialPlan}
                                trialFeatures={trialFeatures}
                            />
                        ))}
                    </div>

                    {hasActivePayment &&
    pendingChange?.pendingChangeType !== "CANCELLATION" &&
    pendingChange?.pendingChangeType !== "PLAN_CHANGE" && (
                            <div style={{ marginTop: "8px" }}>
                                <s-button
                                    type="button"
                                    variant="secondary"
                                    tone="critical"
                                    disabled={isSubmitting}
                                    onClick={() => {
    setPlanChangeOption("cancel");
    setShowCancelModal(true);
}}
                                >
                                    Cancel plan
                                </s-button>

                                {showCancelModal && (
    <div
        style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
        }}
    >
        <div
            style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "24px",
                width: "min(440px, calc(100vw - 32px))",
                boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
            }}
        >
            <s-stack direction="block" gap="base">
                <s-heading>Manage your plan</s-heading>

                <s-paragraph>
                    Choose what you&apos;d like to do with your current plan.
                </s-paragraph>

                {/* Cancel subscription */}
                <label
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        padding: "12px",
                        border:
                            planChangeOption === "cancel"
                                ? "2px solid #1A1A1A"
                                : "1px solid #d1d5db",
                        borderRadius: "10px",
                        cursor: "pointer",
                    }}
                >
                    <input
                        type="radio"
                        name="planChangeOption"
                        value="cancel"
                        checked={planChangeOption === "cancel"}
                        onChange={() => setPlanChangeOption("cancel")}
                    />

                    <div>
                        <div style={{ fontWeight: 600 }}>
                            Cancel subscription
                        </div>

                        <div
                            style={{
                                fontSize: "13px",
                                color: "#6b7280",
                                marginTop: "4px",
                            }}
                        >
                            Your {paidAppPlan} benefits remain available until{" "}
                            {pendingChange?.pendingEffectiveAt
                                ? new Date(
                                    pendingChange.pendingEffectiveAt
                                ).toLocaleDateString()
                                : "the end of your current billing period"}
                            . After that, your current plan will end and you can choose a paid plan again.
                        </div>
                    </div>
                </label>

                {/* Switch to Annual */}
                <label
    style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "16px",
        border: `1px solid ${
            planChangeOption === alternateBillingPeriod
                ? "#222"
                : "#d1d5db"
        }`,
        borderRadius: "12px",
        cursor: "pointer",
    }}
>
    <input
        type="radio"
        name="planChangeOption"
        value={alternateBillingPeriod}
        checked={planChangeOption === alternateBillingPeriod}
        onChange={() => setPlanChangeOption(alternateBillingPeriod)}
    />

    <div>
        <div style={{ fontWeight: 600 }}>
            Switch to{" "}
            {alternateBillingPeriod === "annual"
                ? "Annual"
                : "Monthly"}
        </div>

        <div style={{ color: "#6b7280", marginTop: "4px" }}>
            Your {paidAppPlan} benefits remain available until the end
            of your current billing period. The{" "}
            {alternateBillingPeriod === "annual"
                ? "annual"
                : "monthly"}{" "}
            plan will start for the next billing period.
        </div>
    </div>
</label>

                {/* Buttons */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "8px",
                        marginTop: "8px",
                    }}
                >
                    <s-button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowCancelModal(false)}
                    >
                        Close
                    </s-button>

                    <s-button
                        type="button"
                        variant="primary"
                        onClick={() => {
                            if (planChangeOption === alternateBillingPeriod) {
    setBillingPeriod(alternateBillingPeriod);
    setAllowBillingPeriodChange(true);
    setShowCancelModal(false);
    return;
}

                            submit(
                                {
                                    actionType: "cancel",
                                    cancelOption: "end_of_period",
                                },
                                {
                                    method: "post",
                                    replace: true,
                                }
                            );

                            setShowCancelModal(false);
                        }}
                    >
                        Continue
                    </s-button>
                </div>
            </s-stack>
        </div>
    </div>
)}
                            </div>
                        )}
                </s-stack>
            </s-section>
        </s-page>
    );
}






