import { useState, useCallback } from "react";

// ── OptionValueDropdowns ─────────────────────────────────────────────────────
// Renders the collapsible option-value checkboxes for a single product.
function OptionValueDropdowns({ product, selectedOptionValues, setSelectedOptionValues }) {
    const [openDropdowns, setOpenDropdowns] = useState({});

    const toggleDropdown = useCallback((optionName) => {
        setOpenDropdowns((prev) => ({
            ...prev,
            [`${product.id}_${optionName}`]: !prev[`${product.id}_${optionName}`],
        }));
    }, [product.id]);

    const toggleOptionValue = useCallback((optionName, value) => {
        setSelectedOptionValues((prev) => {
            const productState = { ...(prev[product.id] ?? {}) };
            const currentSet = new Set(productState[optionName] ?? []);
            if (currentSet.has(value)) currentSet.delete(value);
            else currentSet.add(value);
            productState[optionName] = currentSet;
            return { ...prev, [product.id]: productState };
        });
    }, [product.id, setSelectedOptionValues]);

    const toggleAll = useCallback((opt, checkedCount) => {
        setSelectedOptionValues((prev) => {
            const productState = { ...(prev[product.id] ?? {}) };
            productState[opt.name] = checkedCount === opt.values.length
                ? new Set()
                : new Set(opt.values);
            return { ...prev, [product.id]: productState };
        });
    }, [product.id, setSelectedOptionValues]);

    if (!product.options?.length) return null;

    return (
        <div style={{ borderTop: "1px solid #e1e3e5", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "11px", color: "#6d7175", marginBottom: "2px" }}>
                Select values to include in bundle
            </div>
            {product.options.map((opt) => {
                const dropdownKey = `${product.id}_${opt.name}`;
                const isOpen = !!openDropdowns[dropdownKey];
                const checkedValues = selectedOptionValues[product.id]?.[opt.name] ?? new Set();
                const checkedCount = checkedValues.size;

                return (
                    <div key={opt.name} style={{ border: `1.5px solid ${isOpen ? "#185FA5" : "#e1e3e5"}`, borderRadius: "8px", overflow: "hidden", background: "#ffffff" }}>
                        {/* Trigger row */}
                        <div
                            onClick={() => toggleDropdown(opt.name)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", cursor: "pointer", userSelect: "none", background: isOpen ? "#f6f8fc" : "#ffffff" }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "12px", fontWeight: 500, color: "#202223" }}>{opt.name}</span>
                                <span style={{
                                    fontSize: "11px", padding: "1px 8px", borderRadius: "10px",
                                    background: checkedCount === 0 ? "#FCEBEB" : "#EAF3DE",
                                    color: checkedCount === 0 ? "#791F1F" : "#3B6D11",
                                    fontWeight: 500,
                                }}>
                                    {checkedCount} / {opt.values.length} selected
                                </span>
                            </div>
                            <span style={{ fontSize: "11px", color: "#6d7175", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
                        </div>

                        {/* Expanded list */}
                        {isOpen && (
                            <div style={{ borderTop: "1px solid #e1e3e5" }}>
                                {/* Select all / Deselect all */}
                                <div
                                    onClick={() => toggleAll(opt, checkedCount)}
                                    style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: "#185FA5", cursor: "pointer", background: "#f6f8fc", borderBottom: "1px solid #e1e3e5" }}
                                >
                                    {checkedCount === opt.values.length ? "✕  Deselect all" : "✓  Select all"}
                                </div>
                                {opt.values.map((value) => {
                                    const isChecked = checkedValues.has(value);
                                    return (
                                        <div
                                            key={value}
                                            onClick={() => toggleOptionValue(opt.name, value)}
                                            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", cursor: "pointer", background: isChecked ? "#f0f7ff" : "#ffffff", borderBottom: "1px solid #f5f5f5", transition: "background 0.1s" }}
                                        >
                                            <div style={{
                                                width: "16px", height: "16px", borderRadius: "4px",
                                                border: isChecked ? "none" : "1.5px solid #8c9196",
                                                background: isChecked ? "#185FA5" : "#ffffff",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                flexShrink: 0, transition: "all 0.1s",
                                            }}>
                                                {isChecked && <span style={{ color: "#fff", fontSize: "10px", lineHeight: 1 }}>✓</span>}
                                            </div>
                                            <span style={{ fontSize: "12px", color: "#202223", fontWeight: isChecked ? 500 : 400, flex: 1 }}>{value}</span>
                                            <span style={{ fontSize: "11px", color: "#6d7175", fontStyle: "italic" }}>{product.title} - {value}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── MultivariantProductPicker ────────────────────────────────────────────────
// Props:
//   isMulti            boolean
//   setIsMulti         setter
//   productCount       number
//   setProductCount    setter
//   selectedProducts   array
//   setSelectedProducts setter
//   selectedOptionValues  { [productId]: { [optionName]: Set } }
//   setSelectedOptionValues setter
//   errors             object (from action data)
//   shopify            useAppBridge() instance
//   locked             boolean — when true, hides the single/multi toggle and
//                      product count field (used in edit mode where type is fixed)
export function MultivariantProductPicker({
    isMulti,
    setIsMulti,
    productCount,
    setProductCount,
    selectedProducts,
    setSelectedProducts,
    selectedOptionValues,
    setSelectedOptionValues,
    errors = {},
    shopify,
    locked = false,
}) {
    const initProductOptionState = useCallback((product) => {
        const state = {};
        for (const opt of product.options ?? []) {
            state[opt.name] = new Set(opt.values);
        }
        return state;
    }, []);

    const openPicker = useCallback(async () => {
        const required = isMulti ? productCount : 1;
        if (selectedProducts.length >= required) return;

        const selected = await shopify.resourcePicker({
            type: "product",
            multiple: false,
            filter: { variants: true },
        });
        if (!selected?.length) return;

        const product = selected[0];
        const alreadyAdded = selectedProducts.some((p) => p.id === product.id);
        if (alreadyAdded) {
            shopify.toast.show("This product is already added.");
            return;
        }

        setSelectedOptionValues((prev) => ({
            ...prev,
            [product.id]: initProductOptionState(product),
        }));
        setSelectedProducts((prev) => [...prev, product]);
    }, [isMulti, productCount, selectedProducts, shopify, initProductOptionState, setSelectedProducts, setSelectedOptionValues]);

    const removeProduct = useCallback((productId) => {
        setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
        setSelectedOptionValues((prev) => {
            const next = { ...prev };
            delete next[productId];
            return next;
        });
    }, [setSelectedProducts, setSelectedOptionValues]);

    const getProductVariantCount = useCallback((product) => {
        const productState = selectedOptionValues[product.id];
        if (!productState) return 0;
        return (product.options ?? []).reduce((acc, opt) => {
            return acc * (productState[opt.name]?.size || 1);
        }, 1);
    }, [selectedOptionValues]);

    const totalVariantCount = selectedProducts.reduce(
        (sum, p) => sum + getProductVariantCount(p), 0
    );

    const required = isMulti ? productCount : 1;

    return (
        <s-section heading="Products">
            <s-stack direction="block" gap="base">

                {/* Single / Multi toggle — hidden in edit (locked) mode */}
                {!locked && (
                    <div style={{ display: "flex", gap: "10px" }}>
                        {[
                            { value: false, label: "Single product", sub: "One product, all its variants" },
                            { value: true, label: "Multiple products", sub: "Combine multiple products" },
                        ].map(({ value, label, sub }) => {
                            const active = isMulti === value;
                            return (
                                <div
                                    key={String(value)}
                                    onClick={() => {
                                        setIsMulti(value);
                                        setSelectedProducts([]);
                                        setSelectedOptionValues({});
                                        setProductCount(2);
                                    }}
                                    style={{
                                        flex: 1, padding: "14px 16px", borderRadius: "10px",
                                        border: active ? "2px solid #185FA5" : "1.5px solid #e1e3e5",
                                        background: active ? "#E6F1FB" : "#ffffff",
                                        cursor: "pointer", transition: "all 0.15s",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{
                                            width: "18px", height: "18px", borderRadius: "50%",
                                            border: active ? "5px solid #185FA5" : "2px solid #8c9196",
                                            background: "#fff", flexShrink: 0, transition: "all 0.15s",
                                        }} />
                                        <div>
                                            <div style={{ fontSize: "13px", fontWeight: 500, color: active ? "#185FA5" : "#202223" }}>{label}</div>
                                            <div style={{ fontSize: "11px", color: "#6d7175", marginTop: "2px" }}>{sub}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Product count — multi only, not locked */}
                {!locked && isMulti && (
                    <s-text-field
                        label="Number of products"
                        type="number"
                        value={String(productCount)}
                        min="2" max="10"
                        help-text="Exactly this many products must be added."
                        onInput={(e) => {
                            const val = Math.max(2, Math.min(10, parseInt(e.target.value) || 2));
                            setProductCount(val);
                            setSelectedProducts([]);
                            setSelectedOptionValues({});
                        }}
                    />
                )}

                {/* Progress row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <s-text tone="subdued">
                        {selectedProducts.length} / {required} product{required > 1 ? "s" : ""} added
                    </s-text>
                    {selectedProducts.length > 0 && (
                        <div style={{
                            fontSize: "11px", padding: "2px 10px", borderRadius: "10px",
                            background: totalVariantCount > 1000 ? "#FCEBEB" : "#EAF3DE",
                            color: totalVariantCount > 1000 ? "#791F1F" : "#3B6D11",
                            fontWeight: 500,
                        }}>
                            {totalVariantCount} total variants
                        </div>
                    )}
                </div>

                {/* Product list */}
                {selectedProducts.length === 0 ? (
                    <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
                        <s-paragraph tone="subdued">No products added yet. Click below to add.</s-paragraph>
                    </s-box>
                ) : (
                    <s-stack direction="block" gap="base">
                        {selectedProducts.map((product) => (
                            <s-box key={product.id} padding="base" borderWidth="base" borderRadius="base" background="subdued">
                                <s-stack direction="block" gap="base">
                                    {/* Product header */}
                                    <s-stack direction="inline" gap="base">
                                        {product.images?.[0]?.originalSrc && (
                                            <img
                                                src={product.images[0].originalSrc}
                                                alt={product.title}
                                                style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                                            />
                                        )}
                                        <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                                            <s-text>{product.title}</s-text>
                                            <s-text tone="subdued">
                                                {product.variants?.length ?? 0} variants total
                                                &nbsp;·&nbsp;
                                                <span style={{ color: "#3B6D11", fontWeight: 500 }}>
                                                    {getProductVariantCount(product)} selected
                                                </span>
                                            </s-text>
                                        </s-stack>
                                        <s-button variant="tertiary" tone="critical" onClick={() => removeProduct(product.id)}>
                                            Remove
                                        </s-button>
                                    </s-stack>

                                    {/* Option value dropdowns */}
                                    <OptionValueDropdowns
                                        product={product}
                                        selectedOptionValues={selectedOptionValues}
                                        setSelectedOptionValues={setSelectedOptionValues}
                                    />
                                </s-stack>
                            </s-box>
                        ))}
                    </s-stack>
                )}

                {/* Add product button */}
                {selectedProducts.length < required && (
                    <s-button variant="secondary" onClick={openPicker}>
                        Add product ({selectedProducts.length}/{required})
                    </s-button>
                )}

                {errors.components && (
                    <s-banner tone="critical">
                        <s-paragraph>{errors.components}</s-paragraph>
                    </s-banner>
                )}
            </s-stack>
        </s-section>
    );
}