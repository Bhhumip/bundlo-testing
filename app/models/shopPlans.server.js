// app/shopPlans.server.js
//
// Thin wrapper around the ShopPlan Prisma model. Uses the default `prisma`
// export from db.server.js — doesn't duplicate the client. Every function
// is safe to call even if no row exists yet for the shop (upserts where
// it matters, returns sensible defaults otherwise).

import prisma from "../db.server";
import { sendEmail } from "../services/email.server";
import { planExpiryEmail } from "../services/emailTemplates";
import { Free_PLAN, TRIAL_DAYS, BASE_PLAN_KEY} from "../plans";


export const shopPlans = {
    // Call on every billing-page load. Creates the row and stamps
    // trialStartedAt on first call only — never resets it on later calls,
    // even if trialLengthDays passed in differs (e.g. dev store detected
    // later than the first load for some reason).
    async ensureTrialStarted(shop, trialLengthDays) {
        const existing = await prisma.shopPlan.findUnique({ where: { shop } });
        if (existing) {
    if (!existing.trialStartedAt && existing.trialLengthDays > 0) {
        return prisma.shopPlan.update({
            where: { shop },
            data: {
                trialStartedAt: new Date(),
                status: "TRIALING",
            },
        });
    }

    return existing;
}

        return prisma.shopPlan.create({
            data: {
                shop,
                trialStartedAt: new Date(),
                trialLengthDays,
                status: "TRIALING",
            },
        });
    },

    // Call after a successful billing.check(). `subscription` is
    // Shopify's appSubscriptions[0] or null.
    async upsertFromSubscription(shop, subscription, trialLengthDays) {
    if (subscription) {
        const existing = await prisma.shopPlan.findUnique({
            where: { shop },
        });

        const currentPlan =
            BASE_PLAN_KEY[subscription.name] ?? subscription.name;

        const subscriptionBillingPeriod =
            subscription.name.includes("(Annual)")
                ? "annual"
                : "monthly";

        // ------------------------------------------------------------
        // A scheduled plan change must remain pending until its
        // effective date. Shopify can expose the replacement
        // subscription as ACTIVE before that date.
        // ------------------------------------------------------------
        const hasPendingPlanChange =
            existing?.pendingChangeType === "PLAN_CHANGE" &&
            existing?.pendingPlan &&
            existing?.pendingBillingPeriod &&
            existing?.pendingEffectiveAt;


        const pendingChangeIsDue =
            hasPendingPlanChange &&
            new Date() >= new Date(existing.pendingEffectiveAt);

        const pendingChangeMatchesSubscription =
            hasPendingPlanChange &&
            existing.pendingPlan === currentPlan &&
            existing.pendingBillingPeriod === subscriptionBillingPeriod;

        // The replacement subscription has actually reached its
        // effective date.
        if (
            pendingChangeMatchesSubscription &&
            pendingChangeIsDue
        ) {
            return prisma.shopPlan.update({
                where: { shop },
                data: {
                    status: "ACTIVE",
                    currentPlan,
                    trialLengthDays: 0,
                    subscriptionId: subscription.id,
                    currentPeriodEnd: subscription.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd)
                        : null,

                    pendingPlan: null,
                    pendingBillingPeriod: null,
                    pendingEffectiveAt: null,
                    pendingChangeType: null,
                },
            });
        }

        // The replacement subscription exists in Shopify, but its
        // effective date has not arrived yet. Keep the old plan as
        // the current plan and preserve the pending change.
        if (hasPendingPlanChange && !pendingChangeIsDue) {
            return prisma.shopPlan.upsert({
                where: { shop },
                create: {
                    shop,
                    trialStartedAt: new Date(),
                    trialLengthDays,
                    status: "ACTIVE",
                    currentPlan,
                    subscriptionId: subscription.id,
                    currentPeriodEnd: subscription.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd)
                        : null,
                    pendingPlan: existing.pendingPlan,
                    pendingBillingPeriod: existing.pendingBillingPeriod,
                    pendingEffectiveAt: existing.pendingEffectiveAt,
                    pendingChangeType: existing.pendingChangeType,
                },
                update: {
                    status: "ACTIVE",
                    trialLengthDays: 0,

                    // Keep the existing/current plan until the
                    // scheduled effective date.
                    currentPlan: existing.currentPlan ?? currentPlan,
                    subscriptionId:
                        existing.subscriptionId ?? subscription.id,
                    currentPeriodEnd:
                        existing.currentPeriodEnd ??
                        (
                            subscription.currentPeriodEnd
                                ? new Date(subscription.currentPeriodEnd)
                                : null
                        ),

                    pendingPlan: existing.pendingPlan,
                    pendingBillingPeriod: existing.pendingBillingPeriod,
                    pendingEffectiveAt: existing.pendingEffectiveAt,
                    pendingChangeType: existing.pendingChangeType,
                },
            });
        }

        // ------------------------------------------------------------
        // No pending plan change — normal subscription sync.
        // ------------------------------------------------------------
        return prisma.shopPlan.upsert({
            where: { shop },
            create: {
                shop,
                trialStartedAt: new Date(),
                trialLengthDays,
                status: "ACTIVE",
                currentPlan,
                subscriptionId: subscription.id,
                currentPeriodEnd: subscription.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd)
                    : null,
            },
            update: {
                status: "ACTIVE",
                trialLengthDays: 0,
                currentPlan,
                subscriptionId: subscription.id,
                currentPeriodEnd: subscription.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd)
                    : null,
            },
        });
    }

    const existing = await prisma.shopPlan.findUnique({
    where: { shop },
});

if (!existing) {
    return null;
}

const trialActive =
    existing.trialStartedAt &&
    existing.trialLengthDays > 0 &&
    Date.now() - existing.trialStartedAt.getTime() <
        existing.trialLengthDays * 24 * 60 * 60 * 1000;

return prisma.shopPlan.update({
    where: { shop },
    data: {
        status: trialActive ? "TRIALING" : "INACTIVE",
        currentPlan: null,
        subscriptionId: null,
        currentPeriodEnd: null,
        trialLengthDays: trialActive
            ? existing.trialLengthDays
            : 0,
    },
});
},

async setShopifyPlanName(shop, shopifyPlanName) {
    return prisma.shopPlan.upsert({
        where: { shop },
        create: {
            shop,
            shopifyPlanName,
        },
        update: {
            shopifyPlanName,
        },
    });
},

async getStorePlanName(shop) {
    const row = await prisma.shopPlan.findUnique({
        where: { shop },
        select: {
            shopifyPlanName: true,
        },
    });

    return row?.shopifyPlanName ?? null;
},

async hasTrialStarted(shop) {
    const row = await prisma.shopPlan.findUnique({
        where: { shop },
        select: {
            trialStartedAt: true,
        },
    });

    return Boolean(row?.trialStartedAt);
},

    async getTrialDaysRemaining(shop) {
    const row = await prisma.shopPlan.findUnique({
        where: { shop },
    });

    if (!row?.trialStartedAt || !row.trialLengthDays) {
        return 0;
    }

    const elapsedMs =
        Date.now() - row.trialStartedAt.getTime();

    const elapsedDays = Math.floor(
        elapsedMs / (24 * 60 * 60 * 1000)
    );

    const remainingDays = Math.max(
        0,
        row.trialLengthDays - elapsedDays
    );

    // Trial has expired — permanently mark it as used.
    if (remainingDays === 0 && row.trialLengthDays > 0) {
        await prisma.shopPlan.update({
            where: { shop },
            data: {
                trialLengthDays: 0,
            },
        });
    }

    return remainingDays;
},

    async getPaidAppPlan(shop) {
    const row = await prisma.shopPlan.findUnique({
        where: { shop },
    });

    if (!row) {
        return null;
    }

    // A cancellation is scheduled, but the merchant keeps
    // their current paid-plan access until the effective date.
    if (
        row.pendingChangeType === "CANCELLATION" &&
        row.pendingEffectiveAt &&
        row.currentPlan
    ) {
        return row.currentPlan;
    }

    return row.status === "ACTIVE"
        ? row.currentPlan
        : null;
},

    async schedulePlanChange(shop, targetPlan, billingPeriod, effectiveAt) {
        return prisma.shopPlan.update({
            where: { shop },
            data: {
                pendingPlan: targetPlan,
                pendingBillingPeriod: billingPeriod,
                pendingEffectiveAt: effectiveAt
                    ? new Date(effectiveAt)
                    : null,
                pendingChangeType: "PLAN_CHANGE",
            },
        });
    },

    async scheduleCancellation(shop, effectiveAt, billingPeriod) {
    return prisma.shopPlan.update({
        where: { shop },
        data: {
            pendingPlan: null,
            pendingBillingPeriod: billingPeriod,
            pendingEffectiveAt: effectiveAt
                ? new Date(effectiveAt)
                : null,
            pendingChangeType: "CANCELLATION",
        },
    });
},

    async clearPendingPlanChange(shop) {
        return prisma.shopPlan.update({
            where: { shop },
            data: {
                pendingPlan: null,
                pendingBillingPeriod: null,
                pendingEffectiveAt: null,
                pendingChangeType: null,
            },
        });
    },

    async getPendingPlanChange(shop) {
    const row = await prisma.shopPlan.findUnique({
        where: { shop },
        select: {
            pendingPlan: true,
            pendingBillingPeriod: true,
            pendingEffectiveAt: true,
            pendingChangeType: true,
            currentPlan: true,
            currentPeriodEnd: true,
        },
    });

    if (!row?.pendingChangeType) {
        return null;
    }

    return {
        pendingPlan: row.pendingPlan,
        pendingBillingPeriod: row.pendingBillingPeriod,
        pendingEffectiveAt: row.pendingEffectiveAt,
        pendingChangeType: row.pendingChangeType,
        currentPlan: row.currentPlan,
        currentPeriodEnd: row.currentPeriodEnd,
    };
    },

    async applyPendingChangeIfDue(shop) {
        const row = await prisma.shopPlan.findUnique({
            where: { shop },
        });

        if (!row?.pendingChangeType || !row.pendingEffectiveAt) {
            return row;
        }

        const now = new Date();

        if (now < row.pendingEffectiveAt) {
            return row;
        }

        // Cancellation → end paid plan
        if (row.pendingChangeType === "CANCELLATION") {
            return prisma.shopPlan.update({
                where: { shop },
                data: {
                    status: "CANCELLED",
                    currentPlan: null,
                    subscriptionId: null,
                    currentPeriodEnd: null,

                    pendingPlan: null,
                    pendingBillingPeriod: null,
                    pendingEffectiveAt: null,
                    pendingChangeType: null,
                },
            });
        }
         // Plan change -> activate upcoming plan
        if (row.pendingChangeType === "PLAN_CHANGE") {
    return prisma.shopPlan.update({
        where: { shop },
        data: {
            status: "ACTIVE",
            currentPlan: row.pendingPlan,

            pendingPlan: null,
            pendingBillingPeriod: null,
            pendingEffectiveAt: null,
            pendingChangeType: null,
        },
    });
}

        return row;
    },

    async markCancelled(shop) {
        return prisma.shopPlan.upsert({
            where: { shop },
            create: {
                shop,
                status: "CANCELLED",
            },
            update: {
                status: "CANCELLED",
                currentPlan: null,
                subscriptionId: null,
                currentPeriodEnd: null,
            },
        });
    },


   async activateFreePlan(shop) {
    const existing = await prisma.shopPlan.findUnique({
        where: { shop },
    });

    // Free trial can only be activated once.
    const trialExpired =
        existing?.trialStartedAt &&
        existing?.trialLengthDays &&
        Date.now() >=
            existing.trialStartedAt.getTime() +
            existing.trialLengthDays * 24 * 60 * 60 * 1000;

    if (existing?.trialLengthDays === 0 || trialExpired) {
        throw new Error("Free trial has already been used.");
    }

    // Start the 14-day trial.
    return prisma.shopPlan.upsert({
        where: { shop },
        create: {
            shop,
            trialStartedAt: new Date(),
            trialLengthDays: TRIAL_DAYS,
            status: "TRIALING",
            currentPlan: Free_PLAN,
            subscriptionId: null,
            currentPeriodEnd: null,
        },
        update: {
            trialStartedAt: new Date(),
            trialLengthDays: TRIAL_DAYS,
            status: "TRIALING",
            currentPlan: Free_PLAN,
            subscriptionId: null,
            currentPeriodEnd: null,
        },
    });
},
 
    async getPlanExpiryStatus(shop) {
        const row = await prisma.shopPlan.findUnique({
            where: { shop },
        });

        if (!row) {
            return {
                isExpiringSoon: false,
                isExpired: false,
                expiryDate: null,
                planName: null,
            };
        }

        let expiryDate = null;
        let planName = row.currentPlan ?? Free_PLAN;

        // Paid subscription expiry
        if (row.status === "ACTIVE" && row.currentPeriodEnd) {
            expiryDate = row.currentPeriodEnd;
        }

        // Trial expiry
        if (
            row.status === "TRIALING" &&
            row.trialStartedAt &&
            row.trialLengthDays
        ) {
            expiryDate = new Date(
                row.trialStartedAt.getTime() +
                row.trialLengthDays * 24 * 60 * 60 * 1000
            );

            planName = "Free Trial";
        }

        if (!expiryDate) {
            return {
                isExpiringSoon: false,
                isExpired: false,
                expiryDate: null,
                planName,
            };
        }

        const now = new Date();

        // 1-day warning window
        const warningWindow = new Date(
            expiryDate.getTime() - 24 * 60 * 60 * 1000
        );

        return {
            isExpiringSoon: now >= warningWindow && now < expiryDate,
            isExpired: now >= expiryDate,
            expiryDate,
            planName,
        };
    },

    async notifyPlanExpiry(shop) {
        const expiryStatus = await this.getPlanExpiryStatus(shop);

        if (!expiryStatus.isExpiringSoon) {
            return { sent: false, reason: "not-expiring" };
        }

        const shopRecord = await prisma.shop.findUnique({
            where: { shop },
            select: {
                email: true,
            },
        });

        if (!shopRecord?.email) {
            return { sent: false, reason: "no-email" };
        }

        const shopPlan = await prisma.shopPlan.findUnique({
            where: { shop },
            select: {
                planExpiryNotificationSentAt: true,
            },
        });

        // Don't send the same expiry warning more than once.
        if (shopPlan?.planExpiryNotificationSentAt) {
            return { sent: false, reason: "already-sent" };
        }

        const { subject, htmlBody } = planExpiryEmail(
            shop,
            expiryStatus.planName,
            expiryStatus.expiryDate
        );

        const sent = await sendEmail({
            shop,
            event: "plan_expiry",
            to: shopRecord.email,
            subject,
            htmlBody,
        });

        // Only mark the notification as sent if SES succeeded.
        if (sent) {
            await prisma.shopPlan.update({
                where: { shop },
                data: {
                    planExpiryNotificationSentAt: new Date(),
                },
            });

            return { sent: true };
        }

            return { sent: false, reason: "email-failed" };
        },
    // app/models/shopPlans.server.js — add this function

    // Called from the APP_SUBSCRIPTIONS_UPDATE webhook. Payload here is the RAW
    // webhook shape (snake_case, REST-style), NOT the billing.check() SDK shape —
    // don't reuse upsertFromSubscription's field names here, they're different APIs.
    async syncFromWebhook(shop, webhookSubscription) {
    const isActive = webhookSubscription.status === "ACTIVE";

    const existing = await prisma.shopPlan.findUnique({
        where: { shop },
    });

    const webhookPlan =
    BASE_PLAN_KEY[webhookSubscription.name] ??
    webhookSubscription.name;

const webhookBillingPeriod =
    webhookSubscription.name.includes("(Annual)")
        ? "annual"
        : "monthly";


const pendingChangeMatchesWebhook =
    existing?.pendingChangeType === "PLAN_CHANGE" &&
    existing?.pendingPlan === webhookPlan &&
    existing?.pendingBillingPeriod === webhookBillingPeriod;

const pendingChangeIsDue =
    existing?.pendingEffectiveAt &&
    new Date() >= new Date(existing.pendingEffectiveAt);

// Only switch to the replacement plan once its scheduled
// effective date has actually arrived.
if (
    isActive &&
    pendingChangeMatchesWebhook &&
    pendingChangeIsDue
) {
    return prisma.shopPlan.update({
        where: { shop },
        data: {
            status: "ACTIVE",
            currentPlan: webhookPlan,
            subscriptionId:
                webhookSubscription.admin_graphql_api_id,
            pendingPlan: null,
            pendingBillingPeriod: null,
            pendingEffectiveAt: null,
            pendingChangeType: null,
        },
    });
}

// Shopify may report the replacement as ACTIVE before the
// scheduled date. Preserve the current plan and pending details.
if (
    isActive &&
    pendingChangeMatchesWebhook &&
    !pendingChangeIsDue
) {
    return prisma.shopPlan.update({
        where: { shop },
        data: {
            status: "ACTIVE",
            currentPlan: existing.currentPlan,
            subscriptionId:
                existing.subscriptionId ??
                webhookSubscription.admin_graphql_api_id,
            currentPeriodEnd: existing.currentPeriodEnd,

            pendingPlan: existing.pendingPlan,
            pendingBillingPeriod: existing.pendingBillingPeriod,
            pendingEffectiveAt: existing.pendingEffectiveAt,
            pendingChangeType: existing.pendingChangeType,
        },
    });
}


    // Shopify marks the subscription as CANCELLED immediately,
    // but our app has scheduled the cancellation for the end
    // of the current billing period.
    if (
        webhookSubscription.status === "CANCELLED" &&
        existing?.pendingChangeType === "CANCELLATION" &&
        existing?.pendingEffectiveAt
    ) {
        return prisma.shopPlan.update({
            where: { shop },
            data: {
                status: "ACTIVE",
                currentPlan: existing.currentPlan,
                subscriptionId:
                    existing.subscriptionId ??
                    webhookSubscription.admin_graphql_api_id,
                currentPeriodEnd: existing.currentPeriodEnd,

                // Keep the scheduled cancellation.
                pendingPlan: null,
pendingBillingPeriod: existing.pendingBillingPeriod,
pendingEffectiveAt: existing.pendingEffectiveAt,
pendingChangeType: "CANCELLATION",
            },
        });
    }

    return prisma.shopPlan.upsert({
        where: { shop },
        create: {
            shop,
            trialStartedAt: new Date(),
            trialLengthDays: TRIAL_DAYS,
            status: isActive ? "ACTIVE" : "CANCELLED",
            currentPlan: isActive
                ? BASE_PLAN_KEY[webhookSubscription.name] ??
                  webhookSubscription.name
                : null,
            subscriptionId:
                isActive
                    ? webhookSubscription.admin_graphql_api_id
                    : null,
        },
        update: {
            status: isActive ? "ACTIVE" : "CANCELLED",
            currentPlan: isActive
                ? BASE_PLAN_KEY[webhookSubscription.name] ??
                  webhookSubscription.name
                : null,
            subscriptionId: isActive
                ? webhookSubscription.admin_graphql_api_id
                : null,
        },
    });
},
};



