// app/reviews/adapters/metafield.js
//
// ─────────────────────────────────────────────────────────────────────────────
//
// This is the fallback adapter. It works for ANY review app because
// Judge.me, Loox, Yotpo, and Stamped all write to the same standard
// Shopify metafields: reviews.rating and reviews.rating_count.
//
// What you get:   rating 4.8  ·  127 reviews  
// What you don't: reviewer names, body text, photos
//
// This adapter is used when:
//   - No publicToken is configured (merchant hasn't set up Judge.me yet)
//   - Judge.me fetch fails (fallback so the block doesn't disappear entirely)
//   - Merchant uses a different review app we haven't built an adapter for yet
//
// The checkout block will show star ratings without full testimonial cards
// when this adapter is the source.
// ─────────────────────────────────────────────────────────────────────────────

import { extractNumericId } from "../reviews/adapter.js";

// ─────────────────────────────────────────────────────────────────────────────
// THE ADAPTER OBJECT
// ─────────────────────────────────────────────────────────────────────────────

export const MetafieldAdapter = {
    name: "metafield",

    /**
     * Fetches aggregate rating data from Shopify's standard review metafields.
     * Uses Shopify Admin GraphQL API — no third-party token needed.
     *
     * @param {string[]} shopifyProductIds  - numeric product IDs
     * @param {Object}   config
     * @param {string}   config.shop         - myshopify domain
     * @param {string}   config.accessToken  - Shopify Admin API access token
     *                                         (from your session/authenticate)
     *
     * @returns {Promise<NormalizedReview[]>}
     * Note: Returns synthetic "aggregate" reviews — one per product showing
     * the aggregate rating. Not real individual reviews but useful for
     * displaying star ratings when full review content isn't available.
     */
    async getReviews(shopifyProductIds, config) {
        if (!config?.accessToken || !shopifyProductIds?.length) {
            return [];
        }

        try {
            const numericIds = shopifyProductIds.map(extractNumericId);

            // Fetch metafields for all products in one GraphQL query
            const ratings = await fetchRatingsFromMetafields(numericIds, config);

            // Convert rating data into NormalizedReview format
            // These are synthetic — not real reviews, just aggregate stats
            return ratings.map((r) => ({
                id: `metafield-${r.shopifyProductId}`,
                rating: r.averageRating,
                title: "",     // no individual review text available
                body: "",
                reviewerName: "",
                pictureUrls: [],
                productTitle: r.productTitle,
                shopifyProductId: r.shopifyProductId,
                createdAt: new Date().toISOString(),
                source: "metafield",
                // Extra fields for aggregate display
                _totalCount: r.totalCount,
                _isAggregate: true,   // flag so the UI can render differently
            }));

        } catch (error) {
            console.error("[MetafieldAdapter] getReviews failed:", error);
            return [];
        }
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPER: fetchRatingsFromMetafields
//
// Uses Shopify Admin GraphQL to read reviews.rating and reviews.rating_count
// for multiple products in a single query.
//
// ─────────────────────────────────────────────────────────────────────────────

async function fetchRatingsFromMetafields(numericIds, config) {
    const { shop, accessToken } = config;


    const gids = numericIds.map((id) => `gid://shopify/Product/${id}`);

    // GraphQL query: fetch title + both review metafields for a list of products
    // The `nodes` query accepts an array of GIDs and returns them in one round-trip
    const query = `
    query GetProductRatings($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          title
          ratingMetafield: metafield(namespace: "reviews", key: "rating") {
            value
          }
          ratingCountMetafield: metafield(namespace: "reviews", key: "rating_count") {
            value
          }
        }
      }
    }
  `;

    const res = await fetch(
        `https://${shop}/admin/api/2024-10/graphql.json`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": accessToken,
            },
            body: JSON.stringify({ query, variables: { ids: gids } }),
        }
    );

    if (!res.ok) {
        console.warn("[MetafieldAdapter] GraphQL request failed:", res.status);
        return [];
    }

    const json = await res.json();
    const nodes = json?.data?.nodes ?? [];

    // Parse each product node into a clean rating object
    return nodes
        .filter(Boolean)
        .map((node) => {
            const numericId = node.id.split("/").at(-1);


            let averageRating = 0;
            try {
                const ratingObj = JSON.parse(node.ratingMetafield?.value ?? "{}");
                averageRating = parseFloat(ratingObj.value ?? "0");
            } catch { /* malformed — leave as 0 */ }

            const totalCount = parseInt(node.ratingCountMetafield?.value ?? "0", 10);

            return {
                shopifyProductId: numericId,
                productTitle: node.title ?? "",
                averageRating: isNaN(averageRating) ? 0 : averageRating,
                totalCount: isNaN(totalCount) ? 0 : totalCount,
            };
        })
        .filter((r) => r.averageRating > 0); // only include products that have reviews
}