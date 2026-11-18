// extensions/checkout-testimonials/src/utils.js
// Pure JS — no framework imports needed here

/**
 * Strips Shopify GID prefix from product ID
 * "gid://shopify/Product/8765432100" → "8765432100"
 */
export function extractNumericId(gidOrId) {
    if (!gidOrId) return String(gidOrId ?? "");
    const str = String(gidOrId);
    return str.includes("/") ? str.split("/").at(-1) : str;
}

/**
 * Truncates text to maxLength, adds "…" if cut
 */
export function truncate(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text ?? "";
    return text.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Converts a numeric rating to star string
 * 4.8 → "★★★★☆"
 */
export function starsString(rating) {
    const rounded = Math.round((rating ?? 0) * 2) / 2;
    const full = Math.floor(rounded);
    const half = rounded % 1 !== 0;
    const empty = 5 - full - (half ? 1 : 0);
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}