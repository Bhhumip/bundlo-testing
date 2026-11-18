// ─────────────────────────────────────────────────────────────────────────────
//
// This file defines the "shape" that every review provider adapter must follow.
// 
//
// it's documentation + the shared data shape.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NORMALIZED REVIEW
 * -----------------
 * This is the standard shape every adapter must return.
 * No matter if the data came from Judge.me, Yotpo, or Shopify metafields 
 * 
 *
 * @typedef {Object} NormalizedReview
 * @property {string}   id             - Unique ID for this review (from provider)
 * @property {number}   rating         - Star rating 1–5
 * @property {string}   title          - Review headline e.g. "Love this product"
 * @property {string}   body           - Full review text
 * @property {string}   reviewerName   - Customer's display name e.g. "Sarah M."
 * @property {string[]} pictureUrls    - Array of image URLs (can be empty [])
 * @property {string}   productTitle   - Name of the product being reviewed
 * @property {string}   shopifyProductId - Numeric Shopify product ID
 * @property {string}   createdAt      - ISO date string
 * @property {string}   source         - Which provider: "judgeme" | "yotpo" | "metafield"
 */

/**
 * ADAPTER CONFIG
 * --------------
 *
 * @typedef {Object} AdapterConfig
 * @property {string}   shop           - myshopify domain
 * @property {string}   [publicToken]  - API token for the provider 
 * @property {string}   [accessToken]  - Shopify access token (for metafield adapter)
 * @property {number}   [perProduct]   - How many reviews to fetch per product (default 5)
 */

/**
 * BASE ADAPTER INTERFACE
 * ----------------------
 * Every adapter must implement these two things:
 *
 * 1. name       → a string identifying the provider
 * 2. getReviews → async function that takes productIds + config, returns NormalizedReview[]
 *
 * 
 */

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPER — used by ALL adapters, defined once here
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strips the Shopify GID prefix from a product ID.
 *
 * Shopify stores product IDs as GIDs (Global IDs):
 *   "gid://shopify/Product/8765432100"
 *
 * But Judge.me, Yotpo etc. want just the numeric part:
 *   "8765432100"
 *
 * This function handles both formats safely 
 * @param {string} gidOrId
 * @returns {string} numeric product ID as string
 *
 * @example
 * extractNumericId("gid://shopify/Product/8765432100") // → "8765432100"
 * extractNumericId("8765432100")                       // → "8765432100"
 */
export function extractNumericId(gidOrId) {
    if (!gidOrId) return String(gidOrId);
    const str = String(gidOrId);
    return str.includes("/") ? str.split("/").at(-1) : str;
}

/**
 * Truncates review body text to a max length for display in checkout.
 * Adds "…" if truncated.
 *
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncateBody(text, maxLength = 120) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Checks if a cached entry is still fresh.
 * Returns true if the cachedAt date is within the TTL window.
 *
 * @param {Date}   cachedAt  - When the entry was cached
 * @param {number} ttlHours  - How many hours until stale (default 6)
 * @returns {boolean}
 */
export function isCacheFresh(cachedAt, ttlHours = 6) {
    if (!cachedAt) return false;
    const ageMs = Date.now() - new Date(cachedAt).getTime();
    const ttlMs = ttlHours * 60 * 60 * 1000;
    return ageMs < ttlMs;
}


// Every adapter file (judgeme.js, yotpo.js etc.) exports an object
// that looks exactly like this:
//
// export const MyProviderAdapter = {
//   name: "myprovider",
//
//   async getReviews(shopifyProductIds, config) {
//     // shopifyProductIds: string[] of numeric IDs ["123", "456"]
//     // config: AdapterConfig
//     //
//     // Must return: NormalizedReview[]
//     // Must NEVER throw — catch all errors and return [] on failure
//     //
//     return [];
//   }
// };
//
// That's it. The API route calls adapter.getReviews(ids, config) and gets
// back NormalizedReview[] — it never looks inside the adapter.
// ─────────────────────────────────────────────────────────────────────────────