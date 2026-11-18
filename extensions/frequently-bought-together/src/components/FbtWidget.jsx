import { useState } from "preact/hooks";
import { DEFAULT_THEME } from "../config/theme.js";
import { PageNav } from "./PageNav.jsx";
import { DiscountBadge } from "./DiscountBadge.jsx";

const PLACEHOLDER = "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";

export function FbtWidget({ fbtSections, cartProductsMap, showError, onAdd, theme = DEFAULT_THEME }) {

    const config = (() => {
    const borderRadiusTokenMap = { 0: "none", 6: "base", 12: "large", 20: "large", 9999: "fullyRounded" };
    const imageRadiusTokenMap = { 0: "none", 6: "base", 10: "large", 12: "large", 20: "large", 9999: "fullyRounded" };
    const gapMap = { tight: "small-200", normal: "base", loose: "large-300" };
    const alignMap = { left: "start", center: "center", right: "end" };
    const cardAlignItemsMap = { top: "start", stretch: "stretch", center: "center", bottom: "end" };
    const aspectMap = { "1:1": "1", "4:5": "3/4", "16:9": "16/9" };
    const btnMap = { filled: "primary", outline: "secondary", plain: "plain", primary: "primary", secondary: "secondary", subtle: "plain" };
    const imgSize = Number(theme.imageSize) || 52;

    // Title size: numeric px → semantic variant (API 2026-04: <s-text size> removed)
    // small → <s-paragraph type="small">, medium → <s-text type="strong">, large → <s-heading>
    const titleSizeVariantMap = (px) => {
        const n = Number(px) || 13;
        if (n < 12) return "small";       // 11 → small
        if (n <= 14) return "medium";     // 13 → medium
        return "large";                    // 15+ → large
    };

    // Padding: numeric px → s-box padding token
    const paddingMap = (px) => {
    const n = Number(px) || 12;
    if (n <= 6) return "small-200";
    if (n <= 14) return "base";
    return "large-300";
};

    return {
        borderRadius: borderRadiusTokenMap[theme.borderRadius] ?? "base",
        imageRadius: imageRadiusTokenMap[theme.imageRadius] ?? "base",
        titleSizeVariant: titleSizeVariantMap(theme.titleSize),
        padding: paddingMap(theme.padding),
        cardAlignItems: cardAlignItemsMap[theme.cardAlignment] ?? "center",
        aspectRatio: aspectMap[theme.imageRatio] ?? "1",
        gap: gapMap[theme.gap] ?? "base",
        inlineAlign: alignMap[theme.textAlignment] ?? "start",
        imgCol: imgSize <= 44 ? "48px" : imgSize <= 60 ? "56px" : "64px",
        gridCols: `repeat(${Math.min(Number(theme.itemsPerRow) || 2, 4)}, 1fr)`,
        isGrid: theme.layoutDirection === "grid",
        isHorizontal: theme.layoutDirection === "horizontal",
        // Card row-height toggle: "stretch" → all cards equal height, "top" → each card compact
        cardBlockSize: theme.cardAlignment === "stretch" ? "100%" : "auto",
        showDivider: theme.showDivider !== false,
        showPrice: theme.showPrice !== false,
        showBadge: theme.showBadge !== false,
        titleFbt: theme.titleFbt || "Frequently bought together",
        buttonVariant: btnMap[theme.buttonVariant] ?? "primary",
        priceTone: "subdued",
        errorTone: "critical",
    };
})();

//console.log("[FBT DEBUG] theme.padding:", theme.padding, "→ padding token:", config.padding, "theme.titleSize:", theme.titleSize, "→ titleSizeVariant:", config.titleSizeVariant);
//console.log("[FBT TEXT ALIGN DEBUG] theme.textAlignment:", theme.textAlignment, "→ config.inlineAlign:", config.inlineAlign);
//console.log("[FBT DISCOUNT DEBUG] theme.discountValue:", theme.discountValue);
// ── State ────────────────────────────────────────────────────────────────
    const [sectionSelected, setSectionSelected] = useState(() =>
        fbtSections.map((s) => new Set(s.recommendations.map((r) => r.variantId)))
    );
    const [currentIndex, setCurrentIndex] = useState(0);
    const [adding, setAdding] = useState(false);
    const [doneSections, setDoneSections] = useState(() => new Set());

    const activeSections = fbtSections
        .map((section, originalIndex) => ({ section, originalIndex }))
        .filter(({ originalIndex }) => !doneSections.has(originalIndex));

    const safeIndex = Math.min(currentIndex, Math.max(0, activeSections.length - 1));
    const current = activeSections[safeIndex];
    if (!current) return null;

    const { section: currentSection, originalIndex } = current;
    const anchor = cartProductsMap[currentSection.anchorProductId];

    function toggleItem(sectionIdx, variantId) {
        setSectionSelected((prev) => {
            const next = [...prev];
            const set = new Set(next[sectionIdx]);
            set.has(variantId) ? set.delete(variantId) : set.add(variantId);
            next[sectionIdx] = set;
            return next;
        });
    }

    const currentSelected = sectionSelected[originalIndex] ?? new Set();
    const selectedItems = currentSection.recommendations.filter((i) => currentSelected.has(i.variantId));
    const totalPrice = selectedItems.reduce((s, i) => s + parseFloat(i.price ?? 0), 0).toFixed(2);
    const selectedCount = selectedItems.length;

    async function handleAddSelected() {
        if (selectedCount === 0) return;
        setAdding(true);
        await onAdd(selectedItems.map((i) => i.variantId), {
            onSuccess: () => {
                setAdding(false);
                setDoneSections((prev) => new Set([...prev, originalIndex]));
                setCurrentIndex(safeIndex > 0 ? safeIndex - 1 : 0);
            },
            onError: () => setAdding(false),
        });
    }

    function goNext() { setCurrentIndex((safeIndex + 1) % activeSections.length); }
    function goPrev() { setCurrentIndex((safeIndex - 1 + activeSections.length) % activeSections.length); }

    const hasMultiple = activeSections.length > 1;

    // ── Shared divider ───────────────────────────────────────────────────────
    function PlusDivider() {
        if (!config.showDivider) return null;
        return (
            <s-grid gridTemplateColumns="1fr auto 1fr" gap="tight" alignItems="center">
                <s-divider />
                <s-text tone="subdued" size="small">＋</s-text>
                <s-divider />
            </s-grid>
        );
    }

    // ── Shared footer ────────────────────────────────────────────────────────
    function Footer() {
         console.log(
        "[FOOTER]",
        "showBadge =", config.showBadge,
        "theme.discountValue =", theme.discountValue
    );
    return (
        <s-box background="subdued" borderRadius={config.borderRadius} padding="base">
            <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
                <s-stack gap="none">
                    <s-text size="small" tone="subdued">
                        {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
                    </s-text>
                    <s-stack direction="inline" gap="small-200" alignItems="center">
                        <s-text type="strong">Total: {anchor.currencyCode} {totalPrice}</s-text>
                        <DiscountBadge
    show={config.showBadge}
    percentage={theme.discountValue}
/>
                    </s-stack>
                </s-stack>
                <s-button
                    variant={config.buttonVariant}
                    loading={adding}
                    disabled={selectedCount === 0}
                    onClick={handleAddSelected}
                >
                    Add selected
                </s-button>
            </s-grid>
        </s-box>
    );
}

    // ────────────────────────────────────────────────────────────────────────
    // LAYOUT 1: VERTICAL — anchor + each rec as a full-width row card
    // Matches the reference widget style exactly
    // ────────────────────────────────────────────────────────────────────────
    function VerticalLayout() {
    return (
        <s-stack gap={config.gap}>

                {/* Anchor card */}
                {anchor && (
                    <s-box background="base" border="base" borderRadius={config.borderRadius} padding="base">
                        <s-grid gridTemplateColumns={`${config.imgCol} 1fr auto`} gap="base" alignItems={config.cardAlignItems}>
                            <s-image
                                src={anchor.image ?? PLACEHOLDER}
                                alt={anchor.title}
                                aspectRatio={config.aspectRatio}
                                borderRadius={config.imageRadius}
                                inlineSize="fill"
                            />
                            <s-stack gap="none" alignItems={config.inlineAlign}>
                                <s-text type="strong">{anchor.title}</s-text>
                                <s-text tone="subdued" size="small">✓ Already in cart</s-text>
                            </s-stack>
                            {config.showPrice && anchor.price && (
                                <s-text tone={config.priceTone}>{anchor.currencyCode} {anchor.price}</s-text>
                            )}
                        </s-grid>
                    </s-box>
                )}

                {/* Rec cards — same row structure as reference widget */}
                {currentSection.recommendations.map((item, i) => {
                    const isChecked = (sectionSelected[originalIndex] ?? new Set()).has(item.variantId);
                    return (
                        <s-stack key={item.variantId ?? i} gap="tight">
                            <PlusDivider />
                            <s-box
                                background="base"
                                border="base"
                                borderRadius={config.borderRadius}
                                padding="base"
                                minInlineSize="0"
                            >
                                <s-grid
                                    gridTemplateColumns={`auto ${config.imgCol} 1fr`}
                                    gap="base"
                                    alignItems={config.cardAlignItems}
                                >
                                    <s-checkbox
                                        checked={isChecked}
                                        onChange={() => toggleItem(originalIndex, item.variantId)}
                                        label=""
                                    />
                                    <s-image
                                        src={item.image ?? PLACEHOLDER}
                                        alt={item.title}
                                        aspectRatio={config.aspectRatio}
                                        borderRadius={config.imageRadius}
                                        inlineSize="fill"
                                    />
                                    {/* inlineSize="100%" on stack + paragraphs = textAlign now has width to align within */}
                                    <s-stack gap="none" inlineSize="100%">
                                        <s-paragraph inlineSize="100%" textAlign={config.inlineAlign}>
                                            <s-text type="strong">{item.title}</s-text>
                                        </s-paragraph>
                                        {config.showPrice && item.price && (
                                            <s-paragraph inlineSize="100%" textAlign={config.inlineAlign}>
                                                <s-text tone={config.priceTone}>{item.currencyCode} {item.price}</s-text>
                                            </s-paragraph>
                                        )}
                    
                                    </s-stack>
                                </s-grid>
                            </s-box>
                        </s-stack>
                    );
                })}

                <Footer />
            </s-stack>
        );
    }

    // ────────────────────────────────────────────────────────────────────────
    // LAYOUT 2: GRID — anchor full width on top, recs in N-column grid below
    // ────────────────────────────────────────────────────────────────────────
    function GridLayout() {
        return (
            <s-stack gap={config.gap}>

                {anchor && (
                    <s-box background="base" border="base" borderRadius={config.borderRadius} padding="base">
                        <s-grid gridTemplateColumns={`${config.imgCol} 1fr auto`} gap="base" alignItems={config.cardAlignItems}>
                            <s-image
                                src={anchor.image ?? PLACEHOLDER}
                                alt={anchor.title}
                                aspectRatio={config.aspectRatio}
                                borderRadius={config.imageRadius}
                                inlineSize="fill"
                            />
                            <s-stack gap="none" alignItems={config.inlineAlign}>
                                <s-text type="strong">{anchor.title}</s-text>
                                <s-text tone="subdued" size="small">✓ Already in cart</s-text>
                            </s-stack>
                            {config.showPrice && anchor.price && (
                                <s-text tone={config.priceTone}>{anchor.currencyCode} {anchor.price}</s-text>
                            )}
                        </s-grid>
                    </s-box>
                )}

                <PlusDivider />

                {/* Grid of rec cards */}
                {/* alignItems now driven by merchant setting: "start" (compact) vs "stretch" (equal height) */}
                <s-grid gridTemplateColumns={config.gridCols} gap={config.gap} alignItems={config.cardAlignItems}>
                    {currentSection.recommendations.map((item, i) => {
                        const isChecked = (sectionSelected[originalIndex] ?? new Set()).has(item.variantId);
                        return (
                            <s-box
                                key={item.variantId ?? i}
                                background="base"
                                border="base"
                                borderRadius={config.borderRadius}
                                padding="base"
                                minInlineSize="0"
                                blockSize={config.cardBlockSize}
                            >
                                <s-grid
                                    gridTemplateColumns={`auto ${config.imgCol} 1fr`}
                                    gap="base"
                                    alignItems={config.cardAlignItems}
                                >
                                    <s-checkbox
                                        checked={isChecked}
                                        onChange={() => toggleItem(originalIndex, item.variantId)}
                                        label=""
                                    />
                                    <s-image
                                        src={item.image ?? PLACEHOLDER}
                                        alt={item.title}
                                        aspectRatio={config.aspectRatio}
                                        borderRadius={config.imageRadius}
                                        inlineSize="fill"
                                    />
                                    {/* inlineSize="100%" on stack + paragraphs = textAlign now has width to align within */}
                                    <s-stack gap="none" inlineSize="100%">
                                        <s-paragraph inlineSize="100%" textAlign={config.inlineAlign}>
                                            <s-text type="strong">{item.title}</s-text>
                                        </s-paragraph>
                                        {config.showPrice && item.price && (
                                            <s-paragraph inlineSize="100%" textAlign={config.inlineAlign}>
                                                <s-text tone={config.priceTone}>{item.currencyCode} {item.price}</s-text>
                                            </s-paragraph>
                                        )}
                                    </s-stack>
                                </s-grid>
                            </s-box>
                        );
                    })}
                </s-grid>

                <Footer />
            </s-stack>
        );
    }

    // ────────────────────────────────────────────────────────────────────────
    // LAYOUT 3: HORIZONTAL — anchor row on top, recs scroll horizontally
    // ────────────────────────────────────────────────────────────────────────
    function HorizontalLayout() {
        return (
            <s-stack gap={config.gap}>

                {anchor && (
                    <s-box background="base" border="base" borderRadius={config.borderRadius} padding="base">
                        <s-grid gridTemplateColumns={`${config.imgCol} 1fr auto`} gap="base" alignItems={config.cardAlignItems}>
                            <s-image
                                src={anchor.image ?? PLACEHOLDER}
                                alt={anchor.title}
                                aspectRatio={config.aspectRatio}
                                borderRadius={config.imageRadius}
                                inlineSize="fill"
                            />
                            <s-stack gap="base" alignItems={config.inlineAlign}>
                                <s-text type="strong">{anchor.title}</s-text>
                                <s-text tone="subdued" size="small">✓ Already in cart</s-text>
                            </s-stack>
                            {config.showPrice && anchor.price && (
                                <s-text tone={config.priceTone}>{anchor.currencyCode} {anchor.price}</s-text>
                            )}
                        </s-grid>
                    </s-box>
                )}

                <PlusDivider />

                {/* Horizontal: use 2-col grid — checkout doesn't support scroll */}
                {/* alignItems now driven by merchant setting: "start" (compact) vs "stretch" (equal height) */}
                <s-grid gridTemplateColumns="1fr 1fr" gap={config.gap} alignItems={config.cardAlignItems}>
                    {currentSection.recommendations.map((item, i) => {
                        const isChecked = (sectionSelected[originalIndex] ?? new Set()).has(item.variantId);
                        return (
                            <s-box
                                key={item.variantId ?? i}
                                background="base"
                                border="base"
                                borderRadius={config.borderRadius}
                                padding="base"
                                minInlineSize="0"
                                blockSize={config.cardBlockSize}
                            >
                                <s-grid
                                    gridTemplateColumns={`auto ${config.imgCol} 1fr`}
                                    gap="base"
                                    alignItems={config.cardAlignItems}
                                >
                                    <s-checkbox
                                        checked={isChecked}
                                        onChange={() => toggleItem(originalIndex, item.variantId)}
                                        label=""
                                    />
                                    <s-image
                                        src={item.image ?? PLACEHOLDER}
                                        alt={item.title}
                                        aspectRatio={config.aspectRatio}
                                        borderRadius={config.imageRadius}
                                        inlineSize="fill"
                                    />
                                    {/* inlineSize="100%" on stack + paragraphs = textAlign now has width to align within */}
                                    <s-stack gap="none" inlineSize="100%">
                                        <s-paragraph inlineSize="100%" textAlign={config.inlineAlign}>
                                            <s-text type="strong">{item.title}</s-text>
                                        </s-paragraph>
                                        {config.showPrice && item.price && (
                                            <s-paragraph inlineSize="100%" textAlign={config.inlineAlign}>
                                                <s-text tone={config.priceTone}>{item.currencyCode} {item.price}</s-text>
                                            </s-paragraph>
                                        )}
                                    </s-stack>
                                </s-grid>
                            </s-box>
                        );
                    })}
                </s-grid>

                <Footer />
            </s-stack>
        );
    }

    // ── Main render ──────────────────────────────────────────────────────────
    const widgetAlignJustify = { left: "start", center: "center", right: "end" }[theme.alignment] ?? "start";
    const widgetMaxWidth = theme.widgetMaxWidth === "100%" ? undefined : theme.widgetMaxWidth;

    console.log("[FBT ALIGN DEBUG]",
        "theme.alignment:", theme.alignment,
        "→ widgetAlignJustify:", widgetAlignJustify,
        "| theme.widgetMaxWidth:", theme.widgetMaxWidth,
        "→ widgetMaxWidth:", widgetMaxWidth);
    return (
    // direction="inline" makes children lay out horizontally; justifyContent then explicitly controls left/center/right position
    <s-stack direction="inline" inlineSize="100%" justifyContent={widgetAlignJustify}>
        <s-box maxInlineSize={widgetMaxWidth}>
            <s-stack gap="small">
                    <s-grid gridTemplateColumns="1fr auto 1fr" gap="small" alignItems="center">
                        <s-divider />
                        {/* API 2026-04: <s-text size> removed. Map merchant setting to semantic variants */}
                        {/* Semantic size variants — 3 distinct sizes using different components */}
                        {config.titleSizeVariant === "large" ? (
                            <s-heading>🛒 {config.titleFbt}</s-heading>
                        ) : config.titleSizeVariant === "small" ? (
                            <s-paragraph type="small">🛒 {config.titleFbt}</s-paragraph>
                        ) : (
                            <s-paragraph>🛒 {config.titleFbt}</s-paragraph>
                        )}
                        <s-divider />
                    </s-grid>

                    <s-box
                        background="subdued"
                        border="base"
                        borderRadius="large"
                        padding={config.padding}
                    >
                        {config.isGrid
                            ? <GridLayout />
                            : config.isHorizontal
                                ? <HorizontalLayout />
                                : <VerticalLayout />
                        }
                    </s-box>

                    {hasMultiple && (
                        <PageNav
                            pageIndex={safeIndex}
                            totalPages={activeSections.length}
                            onPrev={goPrev}
                            onNext={goNext}
                            theme={theme}
                        />
                    )}

                    {showError && (
                        <s-banner tone={config.errorTone}>Could not add items. Please try again.</s-banner>
                    )}

                </s-stack>
            </s-box>
        </s-stack>
    );
}