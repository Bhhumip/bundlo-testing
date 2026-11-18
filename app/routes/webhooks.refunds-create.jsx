// app/routes/webhooks.refunds-create.jsx
import { authenticate } from "../shopify.server";
import { handleRefundCreated } from "../utils/webhook-handlers.js";

export const action = async ({ request }) => {
    const { topic, shop, payload, admin } = await authenticate.webhook(request);
    const eventId = request.headers.get("x-shopify-event-id");


    if (topic !== "REFUNDS_CREATE") {
        return new Response("Unhandled topic", { status: 200 });
    }

    try {
        await handleRefundCreated(shop, payload, admin, eventId);
    } catch (err) {
        console.error("[webhook] handleRefundCreated failed:", err.message);
    }

    return new Response("ok", { status: 200 });
};