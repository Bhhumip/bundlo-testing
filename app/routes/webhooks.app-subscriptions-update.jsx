// app/routes/webhooks.app-subscriptions-update.jsx
import { authenticate } from "../shopify.server";
import { shopPlans } from "../models/shopPlans.server";

export async function action({ request }) {
    const { shop, payload } = await authenticate.webhook(request);
    const subscription = payload.app_subscription;

    console.log(`[webhook:subscriptions-update] received for ${shop} -> status: ${subscription?.status}`, JSON.stringify(payload));

    if (!subscription) {
        console.error(`[webhook:subscriptions-update] no subscription data received for ${shop}`);
        return new Response();
    }
    await shopPlans.syncFromWebhook(shop, subscription);
    return new Response();
}