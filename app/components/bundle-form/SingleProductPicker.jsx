export function SingleProductPicker({
    product,
    setProduct,
    openPicker,
    previewQty,
    setPreviewQty,
}) {
    return (
        <s-section heading="Product">
            <s-paragraph tone="subdued">
                Volume discounts apply to a single product. Customers get a
                bigger discount the more they buy.
            </s-paragraph>
            <s-button variant="secondary" onClick={openPicker}>
                {product ? "Change product" : "Select product"}
            </s-button>

            <div style={{ marginBlockStart: "6px" }}></div>
            {product && (
                <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
                    <s-stack direction="inline" gap="base">
                        {product.shopifyProductImage && (
                            <img
                                src={product.shopifyProductImage}
                                alt={product.shopifyProductTitle}
                                style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }}
                            />
                        )}
                        <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                            <s-text>{product.shopifyProductTitle}</s-text>
                            {product.shopifyVariantTitle && product.shopifyVariantTitle !== "Default Title" && (
                                <s-text tone="subdued">{product.shopifyVariantTitle}</s-text>
                            )}
                            <s-stack direction="inline" gap="base" align="center">

                                <s-button
                                    variant="tertiary"
                                    onClick={() => setPreviewQty(Math.max(1, previewQty - 1))}
                                >
                                    -
                                </s-button>

                                <s-text>{previewQty}</s-text>

                                <s-button
                                    variant="tertiary"
                                    onClick={() => setPreviewQty(previewQty + 1)}
                                >
                                    +
                                </s-button>

                            </s-stack>
                        </s-stack>
                        <s-button variant="tertiary" tone="critical" onClick={() => setProduct(null)}>
                            Remove
                        </s-button>
                    </s-stack>
                </s-box>
            )}
        </s-section>
    );
}