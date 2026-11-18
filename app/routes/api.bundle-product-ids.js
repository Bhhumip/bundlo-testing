

// A lightweight endpoint the checkout extension calls to get the product IDs
// of all components in active bundles that contain any of the cart products.

import prisma from "../db.server";

console.log("[bundle-product-ids] route hit");
function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}
export async function loader({ request }) {

    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const idsParam = url.searchParams.get("productIds");



    if (!shop || !idsParam) {
        return Response.json({ productIds: [] }, { headers: corsHeaders() });
    }

    const cartProductIds = idsParam.split(",").map((id) => id.trim()).filter(Boolean);

    try {
        // Find all active bundles that contain at least one of the cart products
        console.log("[bundle-product-ids] shop:", shop);
        console.log("[bundle-product-ids] cartProductIds:", cartProductIds);
        const bundles = await prisma.bundle.findMany({
            where: {
                shop,
                status: "ACTIVE",
                components: {
                    some: {
                        shopifyProductId: { in: cartProductIds },
                    },
                },
            },
            select: {
                components: {
                    select: { shopifyProductId: true },
                },
            },
        });
        console.log("[bundle-product-ids] bundles found:", bundles.length);
        console.log(JSON.stringify(bundles, null, 2));

        // Flatten all component product IDs from those bundles
        const allIds = bundles
            .flatMap((b) => b.components.map((c) => c.shopifyProductId));

        // Deduplicate
        const unique = [...new Set(allIds)];

        return Response.json({ productIds: unique }, { headers: corsHeaders() });

    } catch (err) {
        console.error("[api.bundle-product-ids] error:", err);
        return Response.json({ productIds: [] }, { headers: corsHeaders() });
    }
}

export async function action({ request }) {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: corsHeaders(),
        });
    }
}

