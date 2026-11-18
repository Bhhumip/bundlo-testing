import prisma from "../db.server";
import { getAdapter } from "../reviews/registry.js";
import { aggregateReviews } from "../reviews/aggregator.js";
import { isCacheFresh } from "../reviews/adapter.js";
import { fetchStoreFallbackReviews } from "../utils/judgemeApi.server.js";

export async function loader({ request }) {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");


    const productIdsParam = url.searchParams.get("productIds");

    if (!shop) {
        return Response.json({ error: "Missing shop", testimonials: [] }, { status: 400 });
    }

    const productIds = productIdsParam
        ? [...new Set(productIdsParam.split(",").map((id) => id.trim()).filter(Boolean))]
        : [];

    try {
        // ── Cache check ────────────────────────────────────────────────────────
        const cacheKey = productIds.length
            ? buildCacheKey(shop, productIds)
            : `${shop}:fallback`;

        const existingCache = await prisma.reviewCache.findUnique({
            where: { shop: cacheKey },
        });

        if (existingCache && isCacheFresh(existingCache.cachedAt, 6)) {
            return Response.json(
                {
                    testimonials: JSON.parse(existingCache.testimonialsJson || "[]"),
                    averageRating: existingCache.averageRating,
                    totalCount: existingCache.totalCount,
                    source: "cache",
                },
                { headers: corsHeaders() }
            );
        }

        // ── Load shop config ───────────────────────────────────────────────────
        const [shopSetting, session] = await Promise.all([
            prisma.shopSetting.findUnique({
                where: { shop },
                select: {
                    judgemePublicToken: true,
                    judgemePrivateToken: true,
                },
            }),
            prisma.session.findFirst({
                where: { shop, isOnline: false },
                select: { accessToken: true },
            }),
        ]);

        const shopConfig = {
            shop,
            accessToken: session?.accessToken ?? null,
            judgemePublicToken: shopSetting?.judgemePublicToken ?? null,
            judgemePrivateToken: shopSetting?.judgemePrivateToken ?? null,
        };
        const upsellWidget = await prisma.upsellWidget.findUnique({
            where: {
                shop_widgetKey: {
                    shop,
                    widgetKey: "testimonials_social_proof",
                },
            },
            select: { notes: true },
        });

        let reviewSource = "auto"; // default
        if (upsellWidget?.notes) {
            try {
                const parsed = JSON.parse(upsellWidget.notes);
                reviewSource = parsed?.widgets?.testimonials_social_proof?.theme?.reviewSource ?? "auto";
            } catch { /* keep default */ }
        }

        const { name: adapterName, adapter, config: adapterConfig } = getAdapter(shopConfig, reviewSource);


        // ── Try product-specific reviews first ─────────────────────────
        let rawReviews = [];

        if (productIds.length > 0) {
            rawReviews = await adapter.getReviews(productIds, adapterConfig);
        }

        // ──  if no reviews found, fetch store-wide reviews ───
        if (rawReviews.length === 0 && shopConfig.judgemePrivateToken) {
            rawReviews = await fetchStoreFallbackReviews(shop, shopConfig.judgemePrivateToken);
        }

        // ──  Aggregate ──────────────────────────────────────────────────
        const result = aggregateReviews(rawReviews, adapterName);

        // ──  Cache result ───────────────────────────────────────────────
        if (result.testimonials.length > 0) {
            await prisma.reviewCache.upsert({
                where: { shop: cacheKey },
                create: {
                    shop: cacheKey,
                    testimonialsJson: JSON.stringify(result.testimonials),
                    averageRating: result.averageRating,
                    totalCount: result.totalCount,
                    cachedAt: new Date(),
                },
                update: {
                    testimonialsJson: JSON.stringify(result.testimonials),
                    averageRating: result.averageRating,
                    totalCount: result.totalCount,
                    cachedAt: new Date(),
                },
            });
        }

        return Response.json(result, { headers: corsHeaders() });

    } catch (error) {
        console.error("[bundle-testimonials] Request failed");
        return Response.json(
            { testimonials: [], averageRating: 0, totalCount: 0, source: "error" },
            { status: 200, headers: corsHeaders() }
        );
    }
}

export async function action({ request }) {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    return new Response("Method not allowed", { status: 405 });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600",
    };
}

function buildCacheKey(shop, productIds) {
    const sorted = [...productIds].sort().join(",");
    return `${shop}:${sorted}`;
}