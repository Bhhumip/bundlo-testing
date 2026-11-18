import { handleOrderPaid } from "../utils/webhook-handlers.js";
import { authenticate } from "../shopify.server";


export const action = async ({ request }) => {
    const { topic, shop, payload, admin } = await authenticate.webhook(request);
    const eventId = request.headers.get("x-shopify-event-id");

    if (topic !== "ORDERS_PAID") {
        return new Response("Unhandled topic", { status: 200 });
    }

    try {
        await handleOrderPaid(shop, payload, admin, eventId);
    } catch (err) {
        console.error("[webhook] handleOrderPaid failed:", err);   // full object, not just .message
        console.error(err.stack);
    }

    return new Response("ok", { status: 200 });
};





