// components/SharedCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Reusable card row used by Bundle, Recommendation, and FBT widgets.
// Pass `rt` (resolved theme from resolveTheme()) for consistent rendering.
// ─────────────────────────────────────────────────────────────────────────────

import { DiscountBadge } from "./DiscountBadge.jsx";

const PLACEHOLDER = "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";

/**
 * A standard product row card.
 * image | title + subtitle | right-slot (button or price)
 */
export function ProductRow({ image, title, subtitle, price, currencyCode, rt, rightSlot, tone }) {
    return (
        <s-box
            background="base"
            border="base"
            borderRadius={rt.borderRadius}
            padding={rt.cardPadding}
            // Card row-height toggle: "100%" → equal height, "auto" → compact
            blockSize={rt.cardBlockSize}
        >
            <s-grid
    gridTemplateColumns={`${rt.imgCol} 1fr auto`}
    gap={rt.gap}
    alignItems="center"
>
                <s-image
                    src={image ?? PLACEHOLDER}
                    alt={title}
                    aspectRatio={rt.aspectRatio}
                    borderRadius={rt.borderRadius}
                />
                {/* inlineAlignment is deprecated; use inlineSize="100%" + paragraph textAlign instead */}
                <s-stack gap="none" inlineSize="100%">
                    <s-paragraph inlineSize="100%" textAlign={rt.inlineAlign}>
                        <s-text type="strong">{title}</s-text>
                    </s-paragraph>
                    {subtitle && (
                        <s-paragraph inlineSize="100%" textAlign={rt.inlineAlign}>
                            <s-text tone="subdued" size="small">{subtitle}</s-text>
                        </s-paragraph>
                    )}
                    {rt.showPrice && price && (
                        <s-paragraph inlineSize="100%" textAlign={rt.inlineAlign}>
                            <s-text tone="subdued">{price} {currencyCode}</s-text>
                        </s-paragraph>
                    )}
                    {/* Shared DiscountBadge — merchant's percentage applies to all layouts */}
                    <DiscountBadge
    show={rt.showBadge}
    percentage={rt.discountValue}
    inlineAlign={rt.inlineAlign}
/>
                </s-stack>
                {rightSlot}
            </s-grid>
        </s-box>
    );
}

/**
 * Grid card — image on top, text below, button at bottom.
 * Used when layoutDirection = "grid" or "horizontal".
 */
export function ProductGridCard({
    image,
    title,
    price,
    currencyCode,
    badge,
    rt,
    rightSlot,
}) {
    return (
    <s-box
        background="base"
        border="base"
        borderRadius={rt.borderRadius}
        padding={rt.cardPadding}
        minInlineSize="0"
        blockSize={rt.cardBlockSize}
    >
        <s-grid
            gridTemplateRows="auto auto auto"
            gap={rt.gap}
            inlineSize="100%"
        >
            {/* Image - Always Center */}
            <s-box inlineAlignment="center">
                <s-box inlineSize={rt.imgCol}>
                    <s-image
                        src={image ?? PLACEHOLDER}
                        alt={title}
                        aspectRatio={rt.aspectRatio}
                        borderRadius={rt.borderRadius}
                    />
                </s-box>
            </s-box>

            {/* Text */}
            <s-stack gap="none" inlineSize="100%">
                <s-paragraph inlineSize="100%" textAlign={rt.inlineAlign}>
                    <s-text type="strong">{title}</s-text>
                </s-paragraph>

                {rt.showPrice && price && (
                    <s-paragraph inlineSize="100%" textAlign={rt.inlineAlign}>
                        <s-text tone="subdued">
                            {price} {currencyCode}
                        </s-text>
                    </s-paragraph>
                )}

                <DiscountBadge
                    show={rt.showBadge}
                    percentage={rt.discountValue}
                    inlineAlign={rt.inlineAlign}
                />
            </s-stack>

            {/* Button */}
            <s-box inlineAlignment="center">
    {rightSlot}
</s-box>
        </s-grid>
    </s-box>
);
}

/**
 * Outer widget shell — title divider + subdued container.
 */
export function WidgetShell({ title, rt, children, pageNav }) {
   //console.log("[CPR RT DEBUG]", "rt.gap:", rt.gap, "rt.outerPadding:", rt.outerPadding, "rt.titleSizeVariant:", rt.titleSizeVariant);
    return (
        // Outer stack fills the checkout column so widgetAlignJustify has space to shift inner box left/center/right
        <s-stack inlineSize="100%" alignItems={rt.widgetAlignJustify}>
            {/* Inner box is capped at merchant's max width (Full / Compact / Narrow) */}
            <s-box maxInlineSize={rt.widgetMaxWidth} inlineSize="100%">
                <s-stack gap="small">
                    <s-grid gridTemplateColumns="1fr auto 1fr" gap="small" alignItems="center">
                        <s-divider />
                        {/* API 2026-04: <s-text size> removed. Map merchant setting to semantic variants:
                            small → <s-paragraph type="small">
                            medium → <s-text type="strong">
                            large → <s-heading> */}
                        {/* Semantic size variants — 3 distinct sizes using different components */}
                        {rt.titleSizeVariant === "large" ? (
                            <s-heading>{title}</s-heading>
                        ) : rt.titleSizeVariant === "small" ? (
                            <s-paragraph type="small">{title}</s-paragraph>
                        ) : (
                            <s-paragraph>{title}</s-paragraph>
                        )}
                        <s-divider />
                    </s-grid>

                    <s-box background="subdued" border="base" borderRadius="large" padding={rt.outerPadding}>
                        <s-stack gap={rt.gap}>
                            {children}
                        </s-stack>
                    </s-box>

                    {pageNav}
                </s-stack>
            </s-box>
        </s-stack>
    );
}

/**
 * Card list — renders row or grid based on rt.isGrid / rt.isHorizontal.
 */
export function CardList({ items, renderCard, rt }) {
    // Grid / Horizontal
if (rt.isGrid || rt.isHorizontal) {
    return (
        <s-grid
            gridTemplateColumns={rt.gridCols}
            gap={rt.gap}
            alignItems={rt.cardAlignItems}
        >
            {items.map((item, index) => (
                <s-stack key={item.variantId ?? index} gap="tight">
                    {renderCard(item, index)}

                    {rt.showDivider && index < items.length - 1 && (
                        <s-box inlineAlignment="center">
                            <s-text>＋</s-text>
                        </s-box>
                    )}
                </s-stack>
            ))}
        </s-grid>
    );
}

    // Vertical
    return (
        <s-stack gap={rt.gap}>
            {items.map((item, index) => (
                <s-stack key={item.variantId ?? index} gap="tight">
                    {renderCard(item, index)}

                    {rt.showDivider && index < items.length - 1 && (
                        <s-grid
                            gridTemplateColumns="1fr auto 1fr"
                            gap="small"
                            alignItems="center"
                        >
                            <s-divider />
                            <s-text>＋</s-text>
                            <s-divider />
                        </s-grid>
                    )}
                </s-stack>
            ))}
        </s-stack>
    );
}