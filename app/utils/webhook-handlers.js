// app/utils/webhook-handlers.js
import prisma from "../db.server.js";

// -----------------------------------------------------------------------
// One bulk GraphQL call for all products in a webhook
// -----------------------------------------------------------------------
export async function getBundleCodesForProducts(admin, productIds) {
    if (productIds.length === 0) return {};

    if (!admin) {
        throw new Error(
            "[getBundleCodesForProducts] Admin API client unavailable"
        );
    }

    const normalizedIds = productIds
        .map((id) => String(id).replace("gid://shopify/Product/", ""))
        .filter(Boolean);

    const gids = normalizedIds.map(
        (id) => `gid://shopify/Product/${id}`
    );

    console.log("[BUNDLE DEBUG] Fetching product metafields:", gids);

    const res = await admin.graphql(
        `#graphql
        query getProducts($ids: [ID!]!) {
            nodes(ids: $ids) {
                ... on Product {
                    id
                    metafield(namespace: "$app", key: "data") {
                        value
                    }
                }
            }
        }`,
        {
            variables: {
                ids: gids,
            },
        }
    );

    const data = await res.json();

    console.log(
        "[BUNDLE DEBUG] Product metafield response:",
        JSON.stringify(data)
    );

    const map = {};

    for (const node of data?.data?.nodes ?? []) {
        if (!node?.id) continue;

        const productId = node.id.split("/").pop();
        const rawValue = node.metafield?.value;

        if (!rawValue) continue;

        try {
            const parsed = JSON.parse(rawValue);

            if (parsed?.bundleCode) {
                map[productId] = parsed.bundleCode;
            }
        } catch (err) {
            console.warn(
                `[getBundleCodesForProducts] Failed to parse metafield JSON for ${node.id}:`,
                err.message
            );
        }
    }

    console.log("[BUNDLE DEBUG] Final productBundleMap:", map);

    return map;
}
// -----------------------------------------------------------------------
//  aggregate line items by bundleCode
// -----------------------------------------------------------------------
function aggregateByBundle(lineItems, productBundleMap, getRevenue, getQuantity) {
    const map = new Map(); // bundleCode → { revenue, quantity }

    for (const item of lineItems) {
        const productId = String(item.product_id ?? item.line_item?.product_id);
        const bundleCode = productBundleMap[productId];
        if (!bundleCode) continue;

        const agg = map.get(bundleCode) ?? { revenue: 0, quantity: 0 };
        agg.revenue += getRevenue(item);
        agg.quantity += getQuantity(item);
        map.set(bundleCode, agg);
    }

    return map;
}

// -----------------------------------------------------------------------
//  apply increments to BundleStats inside a transaction
// -----------------------------------------------------------------------
async function applyStatDeltas(tx, shop, bundleAggregates, bundleMap, incrementOrders) {
    // Use one date for the entire webhook so all bundle revenue from
    // this webhook is recorded against the same calendar day.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const [bundleCode, agg] of bundleAggregates) {
        const bundle = bundleMap.get(bundleCode);
        if (!bundle) {
            //.log(`[skip] No bundle found for code: ${bundleCode}`);
            continue;
        }

        await tx.bundleStats.upsert({
            where: { bundleId: bundle.id },
            create: {
                shop,
                bundleId: bundle.id,
                totalRevenue: agg.revenue,
                totalQuantity: agg.quantity,
                totalOrders: incrementOrders ? 1 : 0,
            },
            update: {
                totalRevenue: { increment: agg.revenue },
                totalQuantity: { increment: agg.quantity },
                ...(incrementOrders && { totalOrders: { increment: 1 } }),
            },
        });

         // Store revenue separately by day so the rolling 30-day
        // revenue limit can be calculated later.
        await tx.bundleRevenueDaily.upsert({
            where: {
                bundleId_date: {
                    bundleId: bundle.id,
                    date: today,
                },
            },
            create: {
                shop,
                bundleId: bundle.id,
                date: today,
                revenue: agg.revenue,
                quantity: agg.quantity,
                orders: incrementOrders ? 1 : 0,
            },
            update: {
                revenue: { increment: agg.revenue },
                quantity: { increment: agg.quantity },
                ...(incrementOrders && { orders: { increment: 1 } }),
            },
        });

        //.log(
        //    `[stats] ${bundleCode} → lifetime revenue ${agg.revenue > 0 ? "+" : ""}${agg.revenue}, ` +
        //    `daily revenue ${agg.revenue > 0 ? "+" : ""}${agg.revenue}`
        //);
    }
}

// -----------------------------------------------------------------------
// applyUpsellStats — attribute revenue/orders to the widget that drove the sale
// -----------------------------------------------------------------------
function getLineProp(properties, key) {
    if (!Array.isArray(properties)) return null;
    const found = properties.find((p) => p?.name === key);
    return found ? found.value : null;
}

async function applyUpsellStats(tx, shop, lineItems) {
    // Group revenue + counts by scoped widget key found in line item properties.
    const widgetAgg = new Map();

    for (const item of lineItems ?? []) {
        const widgetKey = getLineProp(item.properties, "_upsell_widget");
        console.log("[UPSELL STATS] item:", item.title, "| _upsell_widget:", widgetKey);
        if (!widgetKey) continue; // this line wasn't added by an upsell widget

        const surface = getLineProp(item.properties, "_upsell_surface") || "CHECKOUT";
        const scopedKey = `${surface}:${widgetKey}`;
        const revenue = parseFloat(item.price ?? 0) * (item.quantity ?? 0);

        const prev = widgetAgg.get(scopedKey) || { revenue: 0, orders: 0 };
        prev.revenue += revenue;
        prev.orders += 1;
        widgetAgg.set(scopedKey, prev);
    }

    // Update each widget's stats inside its notes JSON.
    for (const [scopedKey, agg] of widgetAgg) {
        const existing = await tx.upsellWidget.findFirst({
            where: { shop, widgetKey: scopedKey },
        });

        let notes = {};
        try {
            notes = existing?.notes ? JSON.parse(existing.notes) : {};
        } catch {
            notes = {};
        }

        const prevStats = notes.stats || { revenue: 0, orders: 0 };
        notes.stats = {
            revenue: (prevStats.revenue || 0) + agg.revenue,
            orders: (prevStats.orders || 0) + agg.orders,
        };

        if (existing) {
            await tx.upsellWidget.update({
                where: { id: existing.id },
                data: { notes: JSON.stringify(notes) },
            });
        }
        // If no widget row exists yet, we skip — the widget must be enabled/saved first.
    }
}
// -----------------------------------------------------------------------
// handleOrderPaid
// -----------------------------------------------------------------------
export async function handleOrderPaid(shop, payload, admin, eventId) {
    console.log("[WEBHOOK] handleOrderPaid FIRED. shop:", shop, "eventId:", eventId);
    if (eventId) {
  const existing = await prisma.processedWebhook.findUnique({
    where: { eventId },
  });

  if (existing) return;
}

    const lineItems = payload.line_items ?? [];
    console.log("[WEBHOOK] Total line items:", lineItems.length);
    for (const item of lineItems) {
        console.log("[WEBHOOK] Line item:", item.title, "| properties:", JSON.stringify(item.properties));
    }
    const productIds = [...new Set(lineItems.map(i => String(i.product_id)))];
    const productBundleMap = await getBundleCodesForProducts(admin, productIds);

console.log("[BUNDLE DEBUG] productIds:", productIds);
console.log("[BUNDLE DEBUG] productBundleMap:", productBundleMap);

    const bundleAggregates = aggregateByBundle(
        lineItems,
        productBundleMap,
        (item) => parseFloat(item.price) * (item.quantity ?? 0),  // revenue
        (item) => item.quantity ?? 0                               // quantity
    );

    const bundleCodes = [...bundleAggregates.keys()];
    console.log("[BUNDLE DEBUG] bundleCodes:", bundleCodes);
    const bundles = await prisma.bundle.findMany({ where: { shop, bundleCode: { in: bundleCodes } } });
    console.log(
        "[BUNDLE DEBUG] bundles found:",
        bundles.map((b) => ({
            id: b.id,
            title: b.title,
        }))
    );
    const bundleMap = new Map(bundles.map(b => [b.bundleCode, b]));

    await prisma.$transaction(async (tx) => {
        await applyStatDeltas(tx, shop, bundleAggregates, bundleMap, true);
        await applyUpsellStats(tx, shop, lineItems); // ADDED: upsell attribution
        if (eventId) {
            await tx.processedWebhook.create({
                data: {
                    shop,
                    eventId,
                    topic: "orders/paid",
                },
            });
        }
    });
}

// -----------------------------------------------------------------------
// handleRefundCreated
// -----------------------------------------------------------------------
export async function handleRefundCreated(shop, payload, admin, eventId) {
    const existing = await prisma.processedWebhook.findUnique({ where: { eventId } });
    if (existing) {
        //.log("[skip] Duplicate webhook:", eventId);
        return;
    }

    const refundLineItems = payload.refund_line_items ?? [];
    const productIds = [...new Set(
        refundLineItems.map(i => i.line_item?.product_id).filter(Boolean).map(String)
    )];
    const productBundleMap = await getBundleCodesForProducts(admin, productIds);

    const bundleAggregates = aggregateByBundle(
        refundLineItems,
        productBundleMap,
        (item) => -(parseFloat(item.subtotal ?? "0")),  // negative revenue
        (item) => -(item.quantity ?? 0)                  // negative quantity
    );

    const bundleCodes = [...bundleAggregates.keys()];
    const bundles = await prisma.bundle.findMany({ where: { shop, bundleCode: { in: bundleCodes } } });
    const bundleMap = new Map(bundles.map(b => [b.bundleCode, b]));

    await prisma.$transaction(async (tx) => {
        await applyStatDeltas(tx, shop, bundleAggregates, bundleMap, false); // refunds don't decrement orders
        await tx.processedWebhook.create({ data: { shop, eventId, topic: "refunds/create" } });
    });
}