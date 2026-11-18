import prisma from "../db.server";
import { getValidSession } from "../utils/validateShop.server";

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
        "Content-Type": "application/json",
    };
}

export const loader = async ({ request }) => {
    console.log("========== CPR API HIT ==========");
console.log(request.url);
    console.log("Recommendations loader hit:", request.url);
    const headers = corsHeaders();

    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
    }

    try {
        const url = new URL(request.url);

        // Read shop directly from query param — no token auth needed
        const shop = url.searchParams.get("shop");
        const productIdsParam = url.searchParams.get("productIds") ?? "";
        const country = url.searchParams.get("country") ?? "US";

        if (!shop || !productIdsParam) {
            return Response.json({ bundles: [] }, { headers });
        }

        // ─────────────────────────────────────────────────────────────
        // AUTO-SYNC : CPR discount % → Shop metafield
        // Reads discountValue from CPR widget's Manage page (Prisma DB)
        // and writes it to shop metafield that fbt-discount-fn reads at
        // checkout. Runs on every CPR API call for real-time sync.
        // ─────────────────────────────────────────────────────────────
        

        const productIds = productIdsParam
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);

        // Debug: check what's actually in the DB for this shop
        const allComponents = await prisma.bundleComponent.findMany({
            where: { bundle: { shop } },
            select: { shopifyProductId: true, bundle: { select: { status: true, title: true } } }
        });

        const matchingComponents = await prisma.bundleComponent.findMany({
            where: {
                shopifyProductId: { in: productIds },
                bundle: { shop, status: "ACTIVE" },
            },
            include: {
                bundle: { include: { components: true } },
            },
        });
        const session = await getValidSession(shop);
        const gqlFetch = (query, variables = {}) =>
    fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": session.accessToken,
        },
        body: JSON.stringify({ query, variables }),
    }).then((r) => r.json());

        const seenBundleIds = new Set();
        const bundles = [];

        const query = `
        query GetVariantPrices($ids: [ID!]!, $country: CountryCode!) {
        nodes(ids: $ids) {
            ... on ProductVariant {
            id
            contextualPricing(context: { country: $country }) {
                price {
                amount
                currencyCode
                }
            }
            }
        }
        }
        `;
        const variantIds = [
    ...new Set(
        matchingComponents
            .map((component) => component.bundle.shopifyVariantId)
            .filter(Boolean)
    ),
];

let priceMap = {};

if (variantIds.length > 0) {
    const response = await gqlFetch(query, {
        ids: variantIds,
        country,
    });
    console.log(
    "Contextual pricing response:",
    JSON.stringify(response, null, 2)
);

    const variants = response?.data?.nodes ?? [];

    priceMap = Object.fromEntries(
        variants
            .filter(Boolean)
            .map((variant) => [
                variant.id,
                {
                    amount: variant.contextualPricing?.price?.amount,
                    currencyCode:
                        variant.contextualPricing?.price?.currencyCode,
                },
            ])
    );
}

        for (const component of matchingComponents) {
            const bundle = component.bundle;
            if (seenBundleIds.has(bundle.id)) continue;
            seenBundleIds.add(bundle.id);

            bundles.push({
                id: bundle.id,
                title: bundle.title,
                description: bundle.description ?? null,
                image: bundle.mediaUrl ??
                    bundle.components.find(c =>
                        !productIds.includes(c.shopifyProductId) &&
                        c.shopifyProductImage?.startsWith("https://")
                    )?.shopifyProductImage ??
                    bundle.components[0]?.shopifyProductImage ??
                    null,
                discountType: bundle.discountType,
                discountValue: bundle.discountValue,
                fixedPrice: bundle.fixedPrice ?? null,
                shopifyVariantId: bundle.shopifyVariantId ?? null,
                price: priceMap[bundle.shopifyVariantId]?.amount ?? 0,
                currencyCode: priceMap[bundle.shopifyVariantId]?.currencyCode ?? "USD",
                components: bundle.components.map((c) => ({
                    title: c.shopifyProductTitle,
                    productId: c.shopifyProductId,
                    image: c.shopifyProductImage,
                    variantId: c.shopifyVariantId,
                    price: c.shopifyVariantPrice,
                    currencyCode: "USD",
                    quantity: c.quantity,
                })),
            });
            console.log("[CPR Bundle]", {
                title: bundle.title,
                price: priceMap[bundle.shopifyVariantId]?.amount,
                currency: priceMap[bundle.shopifyVariantId]?.currencyCode,
            });
        }

        console.log("===== CPR RESPONSE =====");

        bundles.forEach((bundle) => {
            console.log({
                title: bundle.title,
                price: bundle.price,
                currencyCode: bundle.currencyCode,
            });
        });

        console.log("========================");

        return Response.json({ bundles: bundles.slice(0, 6) }, { headers });

    } catch (err) {
        console.error("Recommendations API error:", err);
        return Response.json({ bundles: [] }, { headers });
    }
};