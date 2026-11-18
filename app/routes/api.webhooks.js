import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
    const { topic, shop, session, payload } =
        await authenticate.webhook(request);


    switch (topic) {

        case "ORDERS_CREATE": {
            try {
                const lineItems = payload.line_items ?? [];
                for (const item of lineItems) {
                    if (!item.product_id) continue;
                    const gid = `gid://shopify/Product/${item.product_id}`;
                    const bundle = await db.bundle.findFirst({
                        where: { shop, shopifyProductId: gid },
                    });
                    if (!bundle) continue;
                    await db.bundleAnalytic.create({
                        data: {
                            bundleId: bundle.id,
                            shopifyOrderId: String(payload.id),
                            shopifyOrderName: payload.name ?? null,
                            revenue: parseFloat(item.price) * item.quantity,
                            quantity: item.quantity,
                            discountGiven: item.total_discount ? parseFloat(item.total_discount) : 0,
                        },
                    });
                }
            } catch (err) {
                console.error("[Webhook] ORDERS_CREATE error:", err);
            }
            break;
        }

        case "PRODUCTS_UPDATE": {
            try {
                const gid = `gid://shopify/Product/${payload.id}`;
                const bundles = await db.bundle.findMany({
                    where: {
                        shop, status: "ACTIVE",
                        components: { some: { shopifyProductId: gid } },
                    },
                });
                if (bundles.length === 0) break;
                const totalInventory = (payload.variants ?? []).reduce(
                    (sum, v) => sum + (v.inventory_quantity ?? 0), 0,
                );
                const isOutOfStock = totalInventory <= 0;
                for (const bundle of bundles) {
                    await db.bundle.update({
                        where: { id: bundle.id },
                        data: { available: !isOutOfStock, availableQty: isOutOfStock ? 0 : totalInventory },
                    });
                }
            } catch (err) {
                console.error("[Webhook] PRODUCTS_UPDATE error:", err);
            }
            break;
        }

        case "PRODUCTS_DELETE": {
            try {
                const gid = `gid://shopify/Product/${payload.id}`;
                const bundles = await db.bundle.findMany({
                    where: { shop, components: { some: { shopifyProductId: gid } } },
                    select: { id: true },
                });
                for (const bundle of bundles) {
                    await db.bundle.update({
                        where: { id: bundle.id },
                        data: { status: "DRAFT", available: false },
                    });
                }
            } catch (err) {
                console.error("[Webhook] PRODUCTS_DELETE error:", err);
            }
            break;
        }

        case "APP_UNINSTALLED": {
            try {
                await db.bundle.deleteMany({ where: { shop } });
                await db.shopSetting.deleteMany({ where: { shop } }).catch(() => { });
                await db.session.deleteMany({ where: { shop } });

            } catch (err) {
                console.error("[Webhook] APP_UNINSTALLED error:", err);
            }
            break;
        }

        case "CUSTOMERS_DATA_REQUEST":

            break;

        case "CUSTOMERS_REDACT":

            break;

        case "SHOP_REDACT": {
            try {
                await db.bundle.deleteMany({ where: { shop } });
                await db.session.deleteMany({ where: { shop } });

            } catch (err) {
                console.error("[Webhook] SHOP_REDACT error:", err);
            }
            break;
        }

        default:
            console.warn(`[Webhook] Unhandled topic: ${topic}`);
            break;
    }

    return new Response(null, { status: 200 });
};
