// This is the Judge.me adapter. It knows HOW to talk to Judge.me's API.
// It — takes productIds + config,
// always returns NormalizedReview[].
//
// The API route never calls Judge.me directly — it always goes through here.
// ─────────────────────────────────────────────────────────────────────────────

import prisma from "../db.server";
import { extractNumericId } from "../reviews/adapter.js";
import { requestJudgeMe } from "../utils/judgemeApi.server.js";

// ─────────────────────────────────────────────────────────────────────────────
// JUDGE.ME API CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const JM_API = "https://api.judge.me/api/v1";

// How many reviews to fetch per product from Judge.me
const REVIEWS_PER_PRODUCT = 5;

// ─────────────────────────────────────────────────────────────────────────────
// THE ADAPTER OBJECT
// ─────────────────────────────────────────────────────────────────────────────

export const JudgeMeAdapter = {
    name: "judgeme",

    /**
     * Main entry point. Called by the adapter registry (registry.js ).
     *
     * @param {string[]} shopifyProductIds  - numeric product IDs ["123456", "789012"]
     * @param {Object}   config
     * @param {string}   config.shop         - "yourstore.myshopify.com"
     * @param {string}   config.publicToken  - Judge.me public API token
     * @param {string}   config.privateToken - Judge.me private API token
     * @returns {Promise<NormalizedReview[]>}
     */
    async getReviews(shopifyProductIds, config) {

        console.log("[JudgeMe] getReviews called with:", {
            productIds: shopifyProductIds,
            hasToken: Boolean(config?.publicToken),
            shop: config?.shop,
        });


        if (!config?.publicToken) {
            console.warn("[JudgeMeAdapter] No public token configured for shop:", config?.shop);
            return [];
        }

        if (!shopifyProductIds?.length) {
            return [];
        }

        try {
            // ── Resolve Shopify IDs → Judge.me IDs ──────────────────────

            const jmIdMap = await resolveJudgeMeIds(shopifyProductIds, config);
            console.log("[JudgeMe] Resolved ID map:", jmIdMap);

            // If we couldn't resolve any IDs, nothing to fetch
            if (Object.keys(jmIdMap).length === 0) {
                console.warn("[JudgeMe] No Judge.me IDs resolved — products may not exist in Judge.me");
                return [];
            }

            // ──  Fetch reviews for all resolved products in parallel ──────
            const reviewArrays = await Promise.all(
                Object.entries(jmIdMap).map(([shopifyId, jmId]) =>
                    fetchReviewsForProduct(shopifyId, jmId, config)
                )
            );

            const allReviews = reviewArrays.flat();
            console.log("[JudgeMe] Total reviews fetched:", allReviews.length);
            return allReviews;

        } catch (error) {

            console.error("[JudgeMeAdapter] getReviews failed");
            return [];
        }
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPER: resolveJudgeMeIds
//
// Takes an array of Shopify product IDs.
// Returns a map of { shopifyId: judgeMeId } for all that were resolved.
//
// ─────────────────────────────────────────────────────────────────────────────

async function resolveJudgeMeIds(shopifyProductIds, config) {
    const { shop, publicToken, privateToken } = config;

    // Normalise all IDs to numeric strings (strip GID prefix if present)
    const numericIds = shopifyProductIds.map(extractNumericId);
    console.log("[JudgeMe] resolveJudgeMeIds — numeric IDs:", numericIds);


    // ── Load from Prisma cache ────────────────────────────────────────────
    let cachedMappings = [];
    try {
        cachedMappings = await prisma.JudgemeProduct.findMany({
            where: {
                shop,
                shopifyProductId: { in: numericIds },
            },
        });
        console.log("[JudgeMe] Cache hit count:", cachedMappings.length, "of", numericIds.length);
    } catch (dbErr) {
        console.error("[JudgeMe] Prisma cache lookup failed");
        // Continue without cache — don't abort
    }

    // Turn array into a lookup map for O(1) access:

    const resolvedMap = {};
    for (const mapping of cachedMappings) {
        resolvedMap[mapping.shopifyProductId] = mapping.judgemeProductId;
    }

    // ── Find which IDs are still missing from cache ───────────────────────
    const missingIds = numericIds.filter((id) => !(id in resolvedMap));
    console.log("[JudgeMe] IDs missing from cache:", missingIds);

    // ──  Fetch missing IDs from Judge.me API ───────────────────────────────
    if (missingIds.length > 0) {

        // Fire all missing resolutions in parallel
        await Promise.all(
            missingIds.map(async (shopifyId) => {
                console.log("[JudgeMe] Fetching JM product ID for Shopify ID:", shopifyId);
                const jmId = await fetchJudgeMeProductId(shopifyId, shop, privateToken ?? publicToken);
                console.log("[JudgeMe] JM product ID result:", { shopifyId, jmId });
                if (!jmId) return;

                // ──  Save to Prisma cache ────────────────────────────────────────
                try {
                    await prisma.JudgemeProduct.upsert({
                        where: {
                            shop_shopifyProductId: { shop, shopifyProductId: shopifyId },
                        },
                        create: {
                            shop,
                            shopifyProductId: shopifyId,
                            judgemeProductId: jmId,
                        },
                        update: {
                            judgemeProductId: jmId,
                            cachedAt: new Date(),
                        },
                    });
                    resolvedMap[shopifyId] = jmId;
                    console.log("[JudgeMe] Cached mapping:", shopifyId, "→", jmId);
                } catch (err) {
                    console.error("[JudgeMeAdapter] Failed to cache product");
                    resolvedMap[shopifyId] = jmId;

                }
            })
        );
    }


    console.log("[JudgeMe] Final resolved map:", resolvedMap);
    return resolvedMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPER: fetchJudgeMeProductId
//
// Calls Judge.me's product resolution endpoint.
// Given a Shopify numeric product ID, returns the Judge.me internal ID.
//
// Judge.me endpoint:
//   GET /api/v1/products/-1
//     ?shop_domain=yourstore.myshopify.com
//     &external_id=8765432100     ← the Shopify product ID
//
// Returns null if the product isn't in Judge.me 
// ─────────────────────────────────────────────────────────────────────────────

async function fetchJudgeMeProductId(shopifyProductId, shop, token) {
    try {
        const url = new URL(`${JM_API}/products/-1`);
        url.searchParams.set("shop_domain", shop);
        url.searchParams.set("external_id", shopifyProductId);
        const res = await requestJudgeMe(url.toString(), token);
        console.log("[JudgeMe] JM product resolution HTTP status:", res.status);
        if (!res.ok) {
            console.warn(`[JudgeMeAdapter] Product ID resolution failed for ${shopifyProductId}: HTTP ${res.status}`);
            return null;
        }

        const data = await res.json();
        return data?.product?.id ?? null;

    } catch (err) {
        console.error("[JudgeMeAdapter] Product ID resolution request failed");
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPER: fetchReviewsForProduct
//
// Fetches reviews for ONE product from Judge.me.
// Returns NormalizedReview[] — already in the standard shape.
//
// Judge.me endpoint:
//   GET /api/v1/reviews
//     &shop_domain=yourstore.myshopify.com
//     &product_id=42891          ← Judge.me internal ID
//     &per_page=5
//     &page=1
// ─────────────────────────────────────────────────────────────────────────────

async function fetchReviewsForProduct(shopifyProductId, judgemeProductId, config) {
    const { shop, publicToken, privateToken } = config;

    try {
        const url = new URL(`${JM_API}/reviews`);
        const token = privateToken ?? publicToken; // Use private token
        url.searchParams.set("shop_domain", shop);
        url.searchParams.set("product_id", String(judgemeProductId));
        url.searchParams.set("per_page", String(REVIEWS_PER_PRODUCT));
        url.searchParams.set("page", "1");

        const res = await requestJudgeMe(url.toString(), token);

        if (!res.ok) {
            console.warn(`[JudgeMeAdapter] Reviews fetch failed for JM product ${judgemeProductId}: HTTP ${res.status}`);
            return [];
        }

        const data = await res.json();
        const rawReviews = data?.reviews ?? [];

        // ── Normalize each review into  standard shape ────────────────────
        return rawReviews.map((r) => normalizeReview(r, shopifyProductId));

    } catch (err) {
        console.error("[JudgeMeAdapter] Product reviews request failed");
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPER: normalizeReview
//
// Converts a raw Judge.me review object into our NormalizedReview shape.
//
// Raw Judge.me review looks like:
// {
//   id: 12345,
//   rating: 5,
//   title: "Great product",
//   body: "Really love this...",
//   reviewer: { name: "Sarah M.", email: "..." },
//   pictures: [{ urls: { original: "...", small: "..." } }],
//   created_at: "2024-01-15T10:30:00Z",
//   product_title: "Vitamin C Serum",
//   votes_up: 12,
// }
// ─────────────────────────────────────────────────────────────────────────────

function normalizeReview(raw, shopifyProductId) {
    return {
        id: String(raw.id),
        rating: raw.rating ?? 0,
        title: raw.title ?? "",
        body: raw.body ?? "",
        reviewerName: raw.reviewer?.name ?? "Customer",
        // Extract picture URLs — take up to 3 pictures per review
        pictureUrls: (raw.pictures ?? [])
            .slice(0, 3)
            .map((p) => p.urls?.small ?? p.urls?.original ?? "")
            .filter(Boolean),
        productTitle: raw.product_title ?? "",
        shopifyProductId: shopifyProductId,
        createdAt: raw.created_at ?? new Date().toISOString(),
        source: "judgeme",
        // Keep votes_up for sorting later (most helpful reviews first)
        _votesUp: raw.votes_up ?? 0,
    };
}