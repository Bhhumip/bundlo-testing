// config/resolveTheme.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth: converts raw merchant theme → valid Shopify s- tokens
// Import this in every widget. Never map tokens inline in components again.
// ─────────────────────────────────────────────────────────────────────────────

const BORDER_RADIUS = { 0: "none", 6: "base", 12: "large", 20: "large", 9999: "fullyRounded" };
// Shopify valid gap tokens: small-200 (tight), base (normal), large-300 (loose)
const GAP = { tight: "small-200", normal: "base", loose: "large-300" };
const TEXT_ALIGN = { left: "start", center: "center", right: "end" };
const CARD_ALIGN_ITEMS = { top: "start", stretch: "stretch" };
const WIDGET_ALIGN = { left: "start", center: "center", right: "end" };
// Title size numeric px → semantic variant ("small" | "medium" | "large")
// API 2026-04: <s-text size> was removed, so we map to semantic components instead
// LayoutTab options: 11 (Small), 13 (Medium), 15 (Large)
const TITLE_SIZE = { 11: "small", 13: "medium", 15: "large" };
const ASPECT_RATIO = { "1:1": "1", "4:5": "4/5", "16:9": "16/9" };
// Shopify Checkout UI Extensions (API 2026-04+) no longer support the
// `plain` button variant on <s-button>.
const BTN_VARIANT = {
    // raw DB values
    filled: "primary", outline: "secondary", plain: "plain",
    // already-converted pass-through (prevents double-mapping)
    primary: "primary", secondary: "secondary",
};

export function resolveTheme(theme = {}) {
    const p = Number(theme.padding) || 12;
    const imgSize = Number(theme.imageSize) || 52;
    const dir = theme.layoutDirection || "vertical";
    const cols = Math.min(Number(theme.itemsPerRow) || 2, 4);

    return {
       // mobileLayout: theme.mobileLayout ?? "stack",
        // ── Visual tokens ────────────────────────────────────────────────────
        borderRadius: BORDER_RADIUS[theme.borderRadius] ?? "base",
        gap: GAP[theme.gap] ?? "base",
       // Padding slider (4-32px) → Shopify tokens
        outerPadding: p <= 10 ? "small-200" : p <= 18 ? "base" : "large-300",
        cardPadding: p <= 10 ? "small-200" : p <= 18 ? "base" : "large-300",
        inlineAlign: TEXT_ALIGN[theme.textAlignment] ?? "start",
        aspectRatio: ASPECT_RATIO[theme.imageRatio] ?? "1",
        imgCol:imgSize <= 44? "40px": imgSize <= 60? "60px": "80px",
        // Widget title semantic variant — merchant-controlled from Text tab
        // (Renders as <s-paragraph type="small"> | <s-text type="strong"> | <s-heading>)
        titleSizeVariant: TITLE_SIZE[Number(theme.titleSize)] ?? "medium",
        buttonVariant: BTN_VARIANT[theme.buttonVariant] ?? "secondary",

        // ── Widget-level positioning (outer align + max width) ───────────────
        widgetAlignJustify: WIDGET_ALIGN[theme.alignment] ?? "start",
        widgetMaxWidth: theme.widgetMaxWidth === "100%" ? undefined : theme.widgetMaxWidth,

        // ── Card alignment inside grid rows ──────────────────────────────────
        cardAlignItems: CARD_ALIGN_ITEMS[theme.cardAlignment] ?? "start",
        // Card blockSize toggle: "stretch" → 100% (equal height), "top" → auto (compact)
        cardBlockSize: theme.cardAlignment === "stretch" ? "100%" : "auto",

        // ── Layout flags ─────────────────────────────────────────────────────
        isGrid: dir === "grid",
        isHorizontal: dir === "horizontal",
        isVertical: dir === "vertical",
        gridCols: `repeat(${cols}, 1fr)`,

        // ── Display flags ────────────────────────────────────────────────────
        showPrice: theme.showPrice !== false,
        showDivider: theme.showDivider !== false,
        showBadge: theme.showBadge !== false,
        discountValue: Number(theme.discountValue) || 0,
        

        // ── Titles ───────────────────────────────────────────────────────────
        titleBundle: theme.titleBundle || "Complete the bundle",
        titleRecommendations: theme.titleRecommendations || "You may also like",
        titleOrderHistory: theme.titleOrderHistory || "Buy again",
        titleBestSellers: theme.titleBestSellers || "Popular right now",
        titleFbt: theme.titleFbt || "Frequently bought together",
    };
}