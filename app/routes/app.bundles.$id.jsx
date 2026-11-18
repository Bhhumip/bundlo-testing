import { useLoaderData, useActionData, useNavigation, useFetcher, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState, useCallback, useEffect, useRef } from "react";
import { authenticate } from "../shopify.server";
import { getBundle, updateBundle, archiveBundle } from "../models/bundle.server";
import { computeBundlePrice, computeMixMatchPrice, computeVolumePrice, formatTierLabel } from "../utils/bundle-price";
import { BackArrow } from "../components/NavArrows.jsx";
import { SuccessModal } from "../components/SuccessModal.jsx";
import { MultivariantProductPicker } from "../components/bundle-form/MultivariantProductPicker.jsx";
import { DiscountSection } from "../components/bundle-form/DiscountSection.jsx";
import { requireFeatureAccess } from "../featureAccess.server";
// -----------------------------------------------------------------------
// Loader
// -----------------------------------------------------------------------
export const loader = async ({ request, params }) => {
    const { session, admin } = await authenticate.admin(request);
    const bundle = await getBundle(params.id, session.shop);
    if (!bundle) throw new Response("Bundle not found", { status: 404 });
    if (bundle.type === "MIX_MATCH") {
        await requireFeatureAccess(session.shop, "MIX_MATCH");
    }

    if (bundle.type === "MULTIVARIANT") {
    await requireFeatureAccess(session.shop, "MULTIVARIANT");
}
    return { bundle, shop: session.shop };
};

// -----------------------------------------------------------------------
// Action
// -----------------------------------------------------------------------
export const action = async ({ request, params }) => {
    const { session, admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const intent = formData.get("intent");

    const bundle = await getBundle(params.id, session.shop);

if (!bundle) {
    throw new Response("Bundle not found", { status: 404 });
}

    if (intent === "archive") {
        await archiveBundle(params.id, session.shop, admin);
        return { archived: true };
    }

    if (intent === "activate") {
    if (bundle.type === "MIX_MATCH") {
        await requireFeatureAccess(session.shop, "MIX_MATCH");
    }

    if (bundle.type === "MULTIVARIANT") {
        await requireFeatureAccess(session.shop, "MULTIVARIANT");
    }

    await updateBundle(params.id, session.shop, admin, { status: "ACTIVE" });
    return { activated: true };
}

    if (intent === "update") {
        const bundleType = formData.get("bundleType");
        if (bundleType === "MIX_MATCH") {
        await requireFeatureAccess(session.shop, "MIX_MATCH");
    }
        const title = formData.get("title")?.trim();
        const description = formData.get("description")?.trim();
        const status = formData.get("status") || "ACTIVE";
        const tags = formData.get("tags")?.split(",").map(t => t.trim()).filter(Boolean) || [];
        const mediaUrl = formData.get("mediaUrl")?.trim() || null;
        const price = parseFloat(formData.get("price")) || null;
        const errors = {};
        if (!title) errors.title = "Bundle title is required.";

        // ── FIXED ──
        if (bundleType === "FIXED") {
            const discountType = formData.get("discountType");
            const discountValue = parseFloat(formData.get("discountValue")) || 0;
            const fixedPrice = discountType === "FIXED_PRICE"
                ? parseFloat(formData.get("fixedPrice")) || null
                : null;

            let components = [];
            try {
                components = JSON.parse(formData.get("components") || "[]");
            } catch {
                return { errors: { components: "Invalid product data." } };
            }

            if (components.length < 2) errors.components = "Keep at least 2 products.";
            if (Object.keys(errors).length > 0) return { errors };

            try {
                // FIXED type:
                const updated = await updateBundle(params.id, session.shop, admin, {
                    title, description, discountType, discountValue, fixedPrice,
                    components, status, tags, mediaUrl, price,
                });
                return { success: true, message: "Bundle saved!", shopifyProductId: updated.shopifyProductId };

            } catch (err) {
                return { errors: { form: err.message || "Could not save bundle." } };
            }
        }

        // ── VOLUME ──
        if (bundleType === "VOLUME") {
            let components = [];
            let volumeTiers = [];
            try {
                components = JSON.parse(formData.get("components") || "[]");
                volumeTiers = JSON.parse(formData.get("volumeTiers") || "[]");
            } catch {
                return { errors: { form: "Invalid data." } };
            }

            if (components.length < 1) errors.components = "Select at least 1 product.";
            if (volumeTiers.length < 1) errors.volumeTiers = "Add at least 1 volume tier.";

            const quantities = volumeTiers.map((t) => Number(t.minQuantity));
            if (new Set(quantities).size !== quantities.length)
                errors.volumeTiers = "Each tier must have a unique minimum quantity.";

            if (Object.keys(errors).length > 0) return { errors };

            try {
                const updated = await updateBundle(params.id, session.shop, admin, {
                    title, description, discountType: "NONE", discountValue: 0,
                    components, status, tags, mediaUrl, price,
                    volumeTiers: volumeTiers.map((t) => ({
                        minQuantity: Number(t.minQuantity),
                        discountType: t.discountType,
                        discountValue: Number(t.discountValue),
                    })),
                });
                return { success: true, message: "Volume bundle saved!", shopifyProductId: updated.shopifyProductId };

            } catch (err) {
                return { errors: { form: err.message || "Could not save bundle." } };
            }
        }

        // ── MIX_MATCH ──
        if (bundleType === "MIX_MATCH") {
            const discountType = formData.get("discountType");
            const discountValue = parseFloat(formData.get("discountValue")) || 0;
            const fixedPrice = discountType === "FIXED_PRICE"
                ? parseFloat(formData.get("fixedPrice")) || null
                : null;
            const minSelectCount = parseInt(formData.get("minSelectCount")) || 1;
            const maxSelectCount = parseInt(formData.get("maxSelectCount")) || null;

            let components = [];
            try {
                components = JSON.parse(formData.get("components") || "[]");
            } catch {
                return { errors: { components: "Invalid product data." } };
            }

            if (components.length < 2) errors.components = "Add at least 2 products to the pool.";
            if (minSelectCount < 1) errors.minSelectCount = "Minimum must be at least 1.";
            if (maxSelectCount !== null && maxSelectCount < minSelectCount)
                errors.maxSelectCount = "Maximum must be ≥ minimum.";
            if (Object.keys(errors).length > 0) return { errors };

            try {
                const updated = await updateBundle(params.id, session.shop, admin, {
                    title, description, discountType, discountValue, fixedPrice,
                    minSelectCount, maxSelectCount,
                    components: components.map((c, i) => ({ ...c, isRequired: false, position: i })),
                    status, tags, mediaUrl, price,
                });
                return { success: true, message: "Mix & match bundle saved!", shopifyProductId: updated.shopifyProductId };
            } catch (err) {
                return { errors: { form: err.message || "Could not save bundle." } };
            }
        }
        // ── MULTIVARIANT ──
        if (bundleType === "MULTIVARIANT") {
            await requireFeatureAccess(session.shop, "MULTIVARIANT");
            const discountType = formData.get("discountType");
            const discountValue = parseFloat(formData.get("discountValue")) || 0;
            const fixedPrice = discountType === "FIXED_PRICE"
                ? parseFloat(formData.get("fixedPrice")) || null
                : null;

            let components = [];
            let bundleOptions = [];
            try {
                components = JSON.parse(formData.get("components") || "[]");
                bundleOptions = JSON.parse(formData.get("bundleOptions") || "[]");
            } catch {
                return { errors: { form: "Invalid product data." } };
            }

            if (components.length < 1) errors.components = "At least one product is required.";
            if (Object.keys(errors).length > 0) return { errors };

            try {
                const updated = await updateBundle(params.id, session.shop, admin, {
                    title, description, discountType, discountValue, fixedPrice,
                    components, bundleOptions, status, tags, mediaUrl, price,
                });
                return { success: true, message: "Multivariant bundle saved!", shopifyProductId: updated.shopifyProductId };
            } catch (err) {
                return { errors: { form: err.message || "Could not save bundle." } };
            }
        }

        return { errors: { form: "Unknown bundle type." } };
    }

    return { errors: { form: "Unknown action." } };
};

// -----------------------------------------------------------------------
// FIXED Editor
// -----------------------------------------------------------------------
function FixedProductSelector({ components, setComponents, errors, shopify }) {
    const openPicker = useCallback(async () => {
        const selected = await shopify.resourcePicker({ type: "product", multiple: true, filter: { variants: true } });
        if (!selected?.length) return;
        const newComponents = selected.map((product) => {
            const variant = product.variants?.[0];
            return {
                shopifyProductId: product.id,
                shopifyProductTitle: product.title,
                shopifyProductImage: product.images?.[0]?.originalSrc ?? null,
                shopifyVariantId: variant?.id ?? null,
                shopifyVariantTitle: variant?.title ?? null,
                shopifyVariantPrice: parseFloat(variant?.price ?? "0"),
                shopifySku: variant?.sku ?? null,
                quantity: 1, isRequired: true, position: 0,
                allVariantIds: product.variants?.map(v => v.id) ?? [],
            };
        });
        setComponents((prev) => {
            const existingIds = new Set(prev.map((c) => c.shopifyVariantId ?? c.shopifyProductId));
            return [...prev, ...newComponents.filter((c) => !existingIds.has(c.shopifyVariantId ?? c.shopifyProductId))];
        });
    }, [shopify, setComponents]);

    const updateQuantity = useCallback((index, value) => {
        const qty = Math.max(1, parseInt(value) || 1);
        setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, quantity: qty } : c)));
    }, [setComponents]);

    const removeComponent = useCallback((index) => {
        setComponents((prev) => prev.filter((_, i) => i !== index));
    }, [setComponents]);

    return (
        <>
            <s-section heading="Products">
                {errors.components && <s-banner tone="critical"><s-paragraph>{errors.components}</s-paragraph></s-banner>}
                <s-stack direction="block" gap="base">
                    <s-button variant="secondary" onClick={openPicker}>Add products</s-button>
                    {components.length === 0 ? (
                        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
                            <s-paragraph tone="subdued">No products. Add at least 2.</s-paragraph>
                        </s-box>
                    ) : (
                        <s-stack direction="block" gap="base">
                            {components.map((component, index) => (
                                <s-box key={index} padding="base" borderWidth="base" borderRadius="base" background="subdued">
                                    <s-stack direction="inline" gap="base">
                                        <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                                            <s-text>{component.shopifyProductTitle}</s-text>
                                            {component.shopifyVariantTitle && component.shopifyVariantTitle !== "Default Title" && (
                                                <s-text tone="subdued">{component.shopifyVariantTitle}</s-text>
                                            )}
                                            <s-text tone="subdued">${(component.shopifyVariantPrice ?? 0).toFixed(2)} each</s-text>
                                        </s-stack>
                                        <s-stack direction="inline" gap="tight">
                                            <s-text-field label="Qty" label-hidden type="number" value={String(component.quantity)} min="1" style={{ width: "72px" }} onInput={(e) => updateQuantity(index, e.target.value)} />
                                            <s-button variant="tertiary" tone="critical" onClick={() => removeComponent(index)}>Remove</s-button>
                                        </s-stack>
                                    </s-stack>
                                </s-box>
                            ))}
                        </s-stack>
                    )}
                </s-stack>
            </s-section>
        </>
    );

}



function FixedDiscountSection({ discountType, setDiscountType, discountValue, setDiscountValue, fixedPrice, setFixedPrice }) {
    return (
        <>
            <s-section heading="Discount">
                <s-stack direction="block" gap="base">
                    <s-select label="Discount type" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                        <s-option value="PERCENTAGE">Percentage off total</s-option>
                        <s-option value="FIXED_AMOUNT">Fixed amount off total</s-option>
                        <s-option value="FIXED_PRICE">Set a fixed price</s-option>
                    </s-select>
                    {discountType === "PERCENTAGE" && (
                        <s-text-field label="Discount percentage" type="number" value={discountValue} suffix="%" min="0" max="100" onInput={(e) => setDiscountValue(e.target.value)} />
                    )}
                    {discountType === "FIXED_AMOUNT" && (
                        <s-text-field label="Amount off" type="number" value={discountValue} prefix="$" min="0" onInput={(e) => setDiscountValue(e.target.value)} />
                    )}
                    {discountType === "FIXED_PRICE" && (
                        <s-text-field label="Bundle price" type="number" value={fixedPrice} prefix="$" min="0" help-text="Exact price the customer pays." onInput={(e) => setFixedPrice(e.target.value)} />
                    )}
                </s-stack>
            </s-section>
        </>
    );
}


// -----------------------------------------------------------------------
// VOLUME Editor
// -----------------------------------------------------------------------
function VolumeEditor({ product, setProduct, tiers, setTiers, previewQty, setPreviewQty, errors, shopify, price }) {
    const openPicker = useCallback(async () => {
        const selected = await shopify.resourcePicker({ type: "product", multiple: false, filter: { variants: true } });
        if (!selected?.length) return;
        const p = selected[0];
        const variant = p.variants?.[0];
        setProduct({
            shopifyProductId: p.id,
            shopifyProductTitle: p.title,
            shopifyProductImage: p.images?.[0]?.originalSrc ?? null,
            shopifyVariantId: variant?.id ?? null,
            shopifyVariantTitle: variant?.title ?? null,
            shopifyVariantPrice: parseFloat(variant?.price ?? "0"),
            shopifySku: variant?.sku ?? null,
            quantity: 1, isRequired: true, position: 0,
            allVariantIds: product.variants?.map(v => v.id) ?? [],
        });
    }, [shopify, setProduct]);

    const addTier = () => setTiers((prev) => [...prev, { minQuantity: "", discountType: "PERCENTAGE", discountValue: "" }]);
    const updateTier = (index, field, value) => setTiers((prev) => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
    const removeTier = (index) => setTiers((prev) => prev.filter((_, i) => i !== index));

    const unitPrice = (price && parseFloat(price) > 0)
        ? parseFloat(price)
        : (product?.shopifyVariantPrice ?? 0);

    const parsedTiers = tiers
        .filter((t) => t.minQuantity && t.discountValue)
        .map((t) => ({ minQuantity: Number(t.minQuantity), discountType: t.discountType, discountValue: Number(t.discountValue) }));
    const pricePreview = product ? computeVolumePrice(unitPrice, previewQty, parsedTiers, parseFloat(price) || null) : null;

    return (
        <>
            <s-section heading="Product">
                {errors.components && <s-banner tone="critical"><s-paragraph>{errors.components}</s-paragraph></s-banner>}
                <s-stack direction="block" gap="base">
                    <s-paragraph tone="subdued">Volume discounts apply to a single product.</s-paragraph>
                    <s-button variant="secondary" onClick={openPicker}>{product ? "Change product" : "Select product"}</s-button>
                    {product && (
                        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
                            <s-stack direction="inline" gap="base">
                                {product.shopifyProductImage && (
                                    <img src={product.shopifyProductImage} alt={product.shopifyProductTitle} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                                )}
                                <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                                    <s-text>{product.shopifyProductTitle}</s-text>
                                    {product.shopifyVariantTitle && product.shopifyVariantTitle !== "Default Title" && (
                                        <s-text tone="subdued">{product.shopifyVariantTitle}</s-text>
                                    )}
                                    <s-text tone="subdued">${unitPrice.toFixed(2)} per unit</s-text>
                                </s-stack>
                                <s-button variant="tertiary" tone="critical" onClick={() => setProduct(null)}>Remove</s-button>
                            </s-stack>
                        </s-box>
                    )}
                </s-stack>
            </s-section>

            <s-section heading="Discount tiers">
                {errors.volumeTiers && <s-banner tone="critical"><s-paragraph>{errors.volumeTiers}</s-paragraph></s-banner>}
                <s-stack direction="block" gap="base">
                    <s-paragraph tone="subdued">Set quantity thresholds and discounts per tier.</s-paragraph>
                    {tiers.map((tier, index) => (
                        <s-box key={index} padding="base" borderWidth="base" borderRadius="base" background="subdued">
                            <s-stack direction="inline" gap="base">
                                <s-text-field label="Min qty" type="number" value={String(tier.minQuantity)} min="1" style={{ width: "80px" }} onInput={(e) => updateTier(index, "minQuantity", e.target.value)} />
                                <s-select label="Discount type" value={tier.discountType} onChange={(e) => updateTier(index, "discountType", e.target.value)}>
                                    <s-option value="PERCENTAGE">% off</s-option>
                                    <s-option value="FIXED_AMOUNT">$ off per unit</s-option>
                                </s-select>
                                <s-text-field label="Value" type="number" value={String(tier.discountValue)} min="0" style={{ width: "80px" }} onInput={(e) => updateTier(index, "discountValue", e.target.value)} />
                                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "4px" }}>
                                    <s-button variant="tertiary" tone="critical" onClick={() => removeTier(index)}>Remove</s-button>
                                </div>
                            </s-stack>
                        </s-box>
                    ))}
                    <s-button variant="secondary" onClick={addTier}>Add tier</s-button>
                </s-stack>
            </s-section>

            {/* Volume aside panels rendered inline for slot support */}
            <s-section slot="aside" heading="Price preview">
                {!product || parsedTiers.length === 0 ? (
                    <s-paragraph tone="subdued">Select a product and add tiers to preview pricing.</s-paragraph>
                ) : (
                    <s-stack direction="block" gap="base">
                        <s-text-field label="Preview quantity" type="number" value={String(previewQty)} min="1" onInput={(e) => setPreviewQty(Math.max(1, parseInt(e.target.value) || 1))} />
                        <s-divider />
                        <s-stack direction="inline" gap="base">
                            <s-text tone="subdued" style={{ flex: 1 }}>Unit price</s-text>
                            <s-text tone="subdued">${unitPrice.toFixed(2)}</s-text>
                        </s-stack>
                        {pricePreview?.tier && (
                            <s-stack direction="inline" gap="base">
                                <s-text tone="subdued" style={{ flex: 1 }}>Tier applied</s-text>
                                <s-badge tone="info">{formatTierLabel(pricePreview.tier)}</s-badge>
                            </s-stack>
                        )}
                        <s-stack direction="inline" gap="base">
                            <s-text tone="subdued" style={{ flex: 1 }}>Price per unit</s-text>
                            <s-text>${pricePreview?.pricePerUnit.toFixed(2)}</s-text>
                        </s-stack>
                        <s-divider />
                        <s-stack direction="inline" gap="base">
                            <s-text style={{ flex: 1 }}>Total for {previewQty}</s-text>
                            <s-text tone={pricePreview?.savings > 0 ? "success" : undefined}>${pricePreview?.totalPrice.toFixed(2)}</s-text>
                        </s-stack>
                        {pricePreview?.savings > 0 && (
                            <s-badge tone="success">Customer saves ${pricePreview.savings.toFixed(2)}</s-badge>
                        )}
                    </s-stack>
                )}
            </s-section>

            <s-section slot="aside" heading="All tiers">
                {parsedTiers.length === 0 ? (
                    <s-paragraph tone="subdued">No valid tiers yet.</s-paragraph>
                ) : (
                    <s-stack direction="block" gap="tight">
                        {[...parsedTiers].sort((a, b) => a.minQuantity - b.minQuantity).map((tier, i) => (
                            <s-stack key={i} direction="inline" gap="base">
                                <s-text tone="subdued" style={{ flex: 1 }}>Buy {tier.minQuantity}+</s-text>
                                <s-text>{tier.discountType === "PERCENTAGE" ? `${tier.discountValue}% off` : `$${tier.discountValue} off/unit`}</s-text>
                            </s-stack>
                        ))}
                    </s-stack>
                )}
            </s-section>
        </>
    );
}

// -----------------------------------------------------------------------
// MIX_MATCH Editor
// -----------------------------------------------------------------------
function MixMatchProductsSection({ components, setComponents, minSelectCount, setMinSelectCount, maxSelectCount, setMaxSelectCount, errors, shopify }) {
    const openPicker = useCallback(async () => {
        const selected = await shopify.resourcePicker({ type: "product", multiple: true, filter: { variants: true } });
        if (!selected?.length) return;
        const newComponents = selected.map((product) => {
            const variant = product.variants?.[0];
            return {
                shopifyProductId: product.id,
                shopifyProductTitle: product.title,
                shopifyProductImage: product.images?.[0]?.originalSrc ?? null,
                shopifyVariantId: variant?.id ?? null,
                shopifyVariantTitle: variant?.title ?? null,
                shopifyVariantPrice: parseFloat(variant?.price ?? "0"),
                shopifySku: variant?.sku ?? null,
                quantity: 1, isRequired: false, position: 0,
                allVariantIds: product.variants?.map(v => v.id) ?? [],
            };
        });
        setComponents((prev) => {
            const existingIds = new Set(prev.map((c) => c.shopifyVariantId ?? c.shopifyProductId));
            return [...prev, ...newComponents.filter((c) => !existingIds.has(c.shopifyVariantId ?? c.shopifyProductId))];
        });
    }, [shopify, setComponents]);

    const removeComponent = useCallback((index) => {
        setComponents((prev) => prev.filter((_, i) => i !== index));
    }, [setComponents]);

    return (
        <>
            <s-section heading="Selection rules">
                <s-stack direction="block" gap="base">
                    <s-paragraph tone="subdued">How many items must / can customers select from the pool?</s-paragraph>
                    <s-stack direction="inline" gap="base">
                        <s-text-field label="Minimum items" type="number" value={String(minSelectCount)} min="1" error={errors.minSelectCount} help-text="Customer must pick at least this many" onInput={(e) => setMinSelectCount(e.target.value)} />
                        <s-text-field label="Maximum items" type="number" value={String(maxSelectCount)} min="1" error={errors.maxSelectCount} help-text="Leave equal to min for a fixed count" onInput={(e) => setMaxSelectCount(e.target.value)} />
                    </s-stack>
                </s-stack>
            </s-section>

            <s-section heading="Product pool">
                {errors.components && <s-banner tone="critical"><s-paragraph>{errors.components}</s-paragraph></s-banner>}
                <s-stack direction="block" gap="base">
                    <s-paragraph tone="subdued">
                        Add all products customers can choose from. They will pick {minSelectCount}
                        {maxSelectCount && maxSelectCount !== minSelectCount ? `–${maxSelectCount}` : ""} of these.
                    </s-paragraph>
                    <s-button variant="secondary" onClick={openPicker}>Add products</s-button>
                    {components.length === 0 ? (
                        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
                            <s-paragraph tone="subdued">No products added yet. Add at least 2.</s-paragraph>
                        </s-box>
                    ) : (
                        <s-stack direction="block" gap="base">
                            {components.map((component, index) => (
                                <s-box key={index} padding="base" borderWidth="base" borderRadius="base" background="subdued">
                                    <s-stack direction="inline" gap="base">
                                        {component.shopifyProductImage && (
                                            <img src={component.shopifyProductImage} alt={component.shopifyProductTitle} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                                        )}
                                        <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                                            <s-text>{component.shopifyProductTitle}</s-text>
                                            {component.shopifyVariantTitle && component.shopifyVariantTitle !== "Default Title" && (
                                                <s-text tone="subdued">{component.shopifyVariantTitle}</s-text>
                                            )}
                                            <s-text tone="subdued">${(component.shopifyVariantPrice ?? 0).toFixed(2)}</s-text>
                                        </s-stack>
                                        <s-button variant="tertiary" tone="critical" onClick={() => removeComponent(index)}>Remove</s-button>
                                    </s-stack>
                                </s-box>
                            ))}
                        </s-stack>
                    )}
                </s-stack>
            </s-section>
        </>
    );
}
function MixMatchDiscountSection({ discountType, setDiscountType, discountValue, setDiscountValue, fixedPrice, setFixedPrice }) {
    return (
        <>
            <s-section heading="Discount">
                <s-stack direction="block" gap="base">
                    <s-paragraph tone="subdued">Applied when the customer completes their selection.</s-paragraph>
                    <s-select label="Discount type" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                        <s-option value="PERCENTAGE">Percentage off total</s-option>
                        <s-option value="FIXED_AMOUNT">Fixed amount off total</s-option>
                        <s-option value="FIXED_PRICE">Set a fixed price</s-option>
                        <s-option value="NONE">No discount (informational only)</s-option>
                    </s-select>
                    {discountType === "PERCENTAGE" && (
                        <s-text-field label="Discount percentage" type="number" value={discountValue} suffix="%" min="0" max="100" onInput={(e) => setDiscountValue(e.target.value)} />
                    )}
                    {discountType === "FIXED_AMOUNT" && (
                        <s-text-field label="Amount off" type="number" value={discountValue} prefix="$" min="0" onInput={(e) => setDiscountValue(e.target.value)} />
                    )}
                    {discountType === "FIXED_PRICE" && (
                        <s-text-field label="Bundle price" type="number" value={fixedPrice} prefix="$" min="0" help-text="Total price the customer pays for their selection." onInput={(e) => setFixedPrice(e.target.value)} />
                    )}
                </s-stack>
            </s-section>
        </>
    );
}

// -----------------------------------------------------------------------
// MULTIVARIANT Editor
// -----------------------------------------------------------------------
function MultivariantEditor({
    bundle,
    isMulti,
    setIsMulti,
    productCount,
    setProductCount,
    selectedProducts,
    setSelectedProducts,
    selectedOptionValues,
    setSelectedOptionValues,
    enableDiscount,
    setEnableDiscount,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    fixedPrice,
    setFixedPrice,
    errors,
    shopify,
}) {
    // Variant count helpers (same logic as create flow)
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

    return (
        <>
            {/* type is fixed in edit — hide toggle */}
            <MultivariantProductPicker
                isMulti={isMulti}
                setIsMulti={setIsMulti}
                productCount={productCount}
                setProductCount={setProductCount}
                selectedProducts={selectedProducts}
                setSelectedProducts={setSelectedProducts}
                selectedOptionValues={selectedOptionValues}
                setSelectedOptionValues={setSelectedOptionValues}
                errors={errors}
                shopify={shopify}
                locked={true}
            />

            {/* Discount */}
            <DiscountSection
                enableDiscount={enableDiscount}
                setEnableDiscount={setEnableDiscount}
                discountType={discountType}
                setDiscountType={setDiscountType}
                discountValue={discountValue}
                setDiscountValue={setDiscountValue}
                fixedPrice={fixedPrice}
                setFixedPrice={setFixedPrice}
            />

            {/* Aside: bundle summary */}
            <s-section slot="aside" heading="Bundle summary">
                <s-stack direction="block" gap="tight">
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Mode</s-text>
                        <s-text>{isMulti ? "Multi product" : "Single product"}</s-text>
                    </s-stack>
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Products</s-text>
                        <s-text>{selectedProducts.length}</s-text>
                    </s-stack>
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Total variants</s-text>
                        <s-text>{totalVariantCount}</s-text>
                    </s-stack>
                    {selectedProducts.map((p) => (
                        <s-stack key={p.id} direction="inline" gap="base">
                            <s-text tone="subdued" style={{ flex: 1 }}>{p.title}</s-text>
                            <s-text>{getProductVariantCount(p)} variants</s-text>
                        </s-stack>
                    ))}
                </s-stack>
            </s-section>

            {/* Aside: checklist */}
            <s-section slot="aside" heading="Checklist">
                <s-stack direction="block" gap="tight">
                    <s-text tone={selectedProducts.length > 0 ? "subdued" : undefined}>
                        {selectedProducts.length > 0 ? "✓" : "→"} Products added
                    </s-text>
                    <s-text tone={selectedProducts.every(p =>
                        (p.options ?? []).every(opt =>
                            (selectedOptionValues[p.id]?.[opt.name]?.size ?? 0) > 0
                        )
                    ) ? "subdued" : undefined}>
                        {selectedProducts.every(p =>
                            (p.options ?? []).every(opt =>
                                (selectedOptionValues[p.id]?.[opt.name]?.size ?? 0) > 0
                            )
                        ) ? "✓" : "→"} All options configured
                    </s-text>
                </s-stack>
            </s-section>
        </>
    );
}

// -----------------------------------------------------------------------
// Main EditBundle component
// -----------------------------------------------------------------------
export default function EditBundle() {
    const { bundle, shop } = useLoaderData();
    const fetcher = useFetcher();
    const actionData = fetcher.data;
    const navigation = useNavigation();
    const navigate = useNavigate();
    const shopify = useAppBridge();

    const isSubmitting = fetcher.state === "submitting";
    const currentIntent = fetcher.formData?.get("intent");
    // Success modals
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successProductId, setSuccessProductId] = useState(null);

    useEffect(() => {
        if (fetcher.data?.activated) {
            shopify.toast.show("Bundle is now active!");

        }
    }, [fetcher.data?.activated]);



    // Track previous fetcher state to detect completion
    const prevFetcherState = useRef(null);

    useEffect(() => {

        if (
            fetcher.state === "idle" &&
            fetcher.data?.success &&
            fetcher.data?.message &&
            (prevFetcherState.current === "submitting" || prevFetcherState.current === "loading")
        ) {

            shopify.toast.show(fetcher.data.message);
            setSuccessProductId(fetcher.data.shopifyProductId);
            setShowSuccessModal(true);
            shopify.modal.show("success-modal-edit");
        }
        prevFetcherState.current = fetcher.state;
    }, [fetcher.state, fetcher.data]);
    // ── Shared state ──
    const [title, setTitle] = useState(bundle.title);
    const [description, setDescription] = useState(bundle.description ?? "");
    const [status, setStatus] = useState(bundle.status ?? "ACTIVE");
    const [tags, setTags] = useState(Array.isArray(bundle.tags)
        ? bundle.tags.join(", ")
        : bundle.tags ?? "");
    const [mediaUrl, setMediaUrl] = useState(bundle.mediaUrl ?? "");
    const [mediaPreview, setMediaPreview] = useState(bundle.mediaUrl ?? null);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [price, setPrice] = useState(String(bundle.price ?? ""));
    // ── FIXED state ──
    const [discountType, setDiscountType] = useState(bundle.discountType ?? "PERCENTAGE");
    const [discountValue, setDiscountValue] = useState(String(bundle.discountValue ?? "10"));
    const [fixedPrice, setFixedPrice] = useState(String(bundle.fixedPrice ?? ""));
    const [components, setComponents] = useState(
        (bundle.components ?? []).map((c) => ({
            shopifyProductId: c.shopifyProductId,
            shopifyProductTitle: c.shopifyProductTitle,
            shopifyProductImage: c.shopifyProductImage ?? null,
            shopifyVariantId: c.shopifyVariantId ?? null,
            shopifyVariantTitle: c.shopifyVariantTitle ?? null,
            shopifyVariantPrice: c.shopifyVariantPrice ?? null,
            shopifySku: c.shopifySku ?? null,
            quantity: c.quantity,
            isRequired: c.isRequired,
            position: c.position,
        }))
    );

    // ── VOLUME state ──
    // Volume uses single product — pull first component
    const [product, setProduct] = useState(
        bundle.type === "VOLUME" && bundle.components?.length > 0
            ? bundle.components[0]
            : null
    );
    const [tiers, setTiers] = useState(
        (bundle.volumeTiers ?? []).map((t) => ({
            minQuantity: String(t.minQuantity),
            discountType: t.discountType,
            discountValue: String(t.discountValue),
        }))
    );
    const [previewQty, setPreviewQty] = useState(1);

    // ── MIX_MATCH state ──
    const [minSelectCount, setMinSelectCount] = useState(String(bundle.minSelectCount ?? "2"));
    const [maxSelectCount, setMaxSelectCount] = useState(String(bundle.maxSelectCount ?? "2"));

    const errors = actionData?.errors ?? {};

    // ── MULTIVARIANT state ──
    const [selectedProducts, setSelectedProducts] = useState(() => {
        if (bundle.type !== "MULTIVARIANT") return [];

        // Deduplicate by shopifyProductId (DB may store one row per variant)
        const seen = new Set();
        return (bundle.components ?? []).filter((c) => {
            if (seen.has(c.shopifyProductId)) return false;
            seen.add(c.shopifyProductId);
            return true;
        }).map((c) => ({
            id: c.shopifyProductId,
            title: c.shopifyProductTitle,
            // Remap DB image field → resource picker shape
            images: c.shopifyProductImage ? [{ originalSrc: c.shopifyProductImage }] : [],
            // Parse JSON strings from DB (SQLite stores as String)
            options: c.options ? JSON.parse(c.options) : [],
            variants: c.variants ? JSON.parse(c.variants) : [],
        }));
    });

    const [selectedOptionValues, setSelectedOptionValues] = useState(() => {
        if (bundle.type !== "MULTIVARIANT") return {};

        // Try bundleOptions first (most accurate — preserves user's selection)
        const stored = bundle.bundleOptions
            ? JSON.parse(bundle.bundleOptions)
            : [];

        if (stored.length > 0) {
            const result = {};
            for (const bo of stored) {
                result[bo.productId] = {};
                for (const opt of bo.options ?? []) {
                    result[bo.productId][opt.name] = new Set(opt.selectedValues ?? []);
                }
            }
            return result;
        }

        // Fallback: derive from component.options, select all values
        const result = {};
        const seen = new Set();
        for (const c of bundle.components ?? []) {
            if (seen.has(c.shopifyProductId)) continue;
            seen.add(c.shopifyProductId);
            const opts = c.options ? JSON.parse(c.options) : [];
            result[c.shopifyProductId] = {};
            for (const opt of opts) {
                result[c.shopifyProductId][opt.name] = new Set(opt.values ?? []);
            }
        }
        return result;
    });

    const [mvIsMulti, setMvIsMulti] = useState(bundle.isMulti ?? false);
    const [mvProductCount, setMvProductCount] = useState(bundle.productCount ?? 1);
    const [enableDiscount, setEnableDiscount] = useState(
        bundle.type === "MULTIVARIANT"
            ? (bundle.discountType ?? "NONE") !== "NONE"
            : false
    );

    // Media handlers
    const handleFileChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setMediaPreview(ev.target.result);
            setMediaUrl(ev.target.result);
        };
        reader.readAsDataURL(file);
    }, []);

    const clearMedia = useCallback(() => {
        setMediaPreview(null);
        setMediaUrl("");
    }, []);

    // ── handleSave — sends right fields per type ──
    const handleSave = useCallback(() => {

        const formData = new FormData();
        formData.append("intent", "update");
        formData.append("bundleType", bundle.type);
        formData.append("title", title);
        formData.append("description", description);
        formData.append("status", status);
        formData.append("tags", tags);
        formData.append("mediaUrl", mediaUrl);
        formData.append("price", price);
        if (bundle.type === "FIXED") {
            formData.append("discountType", discountType);
            formData.append("discountValue", discountValue);
            formData.append("components", JSON.stringify(components));
            if (discountType === "FIXED_PRICE") formData.append("fixedPrice", fixedPrice);
        }

        if (bundle.type === "VOLUME") {
            formData.append("components", JSON.stringify(product ? [product] : []));
            formData.append("volumeTiers", JSON.stringify(tiers));
        }

        if (bundle.type === "MIX_MATCH") {
            formData.append("discountType", discountType);
            formData.append("discountValue", discountValue);
            formData.append("minSelectCount", minSelectCount);
            formData.append("maxSelectCount", maxSelectCount);
            formData.append("components", JSON.stringify(components));
            if (discountType === "FIXED_PRICE") formData.append("fixedPrice", fixedPrice);
        }

        if (bundle.type === "MULTIVARIANT") {
            formData.append("discountType", enableDiscount ? discountType : "NONE");
            formData.append("discountValue", enableDiscount ? discountValue : "0");
            if (enableDiscount && discountType === "FIXED_PRICE") {
                formData.append("fixedPrice", fixedPrice);
            }
            formData.append("components", JSON.stringify(
                selectedProducts.map((p, i) => ({
                    shopifyProductId: p.id,
                    shopifyProductTitle: p.title,
                    shopifyProductImage: p.images?.[0]?.originalSrc ?? null,
                    shopifyVariantId: p.variants?.[0]?.id ?? null,
                    shopifyVariantTitle: p.variants?.[0]?.title ?? null,
                    shopifyVariantPrice: parseFloat(p.variants?.[0]?.price ?? "0"),
                    shopifySku: p.variants?.[0]?.sku ?? null,
                    quantity: 1, isRequired: true, position: i,
                    // Pass options + variants so updateBundle can persist them
                    options: p.options ?? [],
                    variants: p.variants ?? [],
                }))
            ));
            const bundleOptions = selectedProducts.map((product) => ({
                productId: product.id,
                options: (product.options ?? []).map((opt) => ({
                    name: opt.name,
                    selectedValues: [...(selectedOptionValues[product.id]?.[opt.name] ?? [])],
                })),
            }));
            formData.append("bundleOptions", JSON.stringify(bundleOptions));
            formData.append("isMulti", String(mvIsMulti));
            formData.append("productCount", String(mvProductCount));
        }

        fetcher.submit(formData, { method: "POST" });
    }, [bundle.type, title, description, status, tags, mediaUrl, discountType, discountValue, fixedPrice, components, product, tiers, minSelectCount, maxSelectCount, fetcher, price, selectedProducts, selectedOptionValues, mvIsMulti, mvProductCount, enableDiscount]);

    const handleActivate = useCallback(() => {
        fetcher.submit({ intent: "activate" }, { method: "POST" });
    }, [fetcher]);

    const handleArchive = useCallback(() => {
        setShowArchiveConfirm(false);
        fetcher.submit({ intent: "archive" }, { method: "POST" });
    }, [fetcher]);

    // ── canSave per type ──
    const canSave = (() => {
        if (!title.trim() || isSubmitting) return false;
        if (bundle.type === "FIXED") return components.length >= 2;
        if (bundle.type === "VOLUME") return !!product && tiers.length >= 1;
        if (bundle.type === "MIX_MATCH") return components.length >= 2;
        if (bundle.type === "MULTIVARIANT") {
            return selectedProducts.length > 0 &&
                selectedProducts.every((p) =>
                    (p.options ?? []).every(
                        (opt) => (selectedOptionValues[p.id]?.[opt.name]?.size ?? 0) > 0
                    )
                );
        }
        return false;
    })();

    // ── Price preview ──
    const parsedDiscount = parseFloat(discountValue) || 0;
    const parsedFixed = parseFloat(fixedPrice) || null;
    const parsedBasePrice = parseFloat(price) || null;

    const originalPrice = components.reduce(
        (sum, c) => sum + (c.shopifyVariantPrice ?? 0) * c.quantity, 0
    );

    // Use base price if entered, else use sum of components
    const effectiveBasePrice = parsedBasePrice ?? originalPrice;

    const bundlePrice = components.length > 0 && bundle.type === "FIXED"
        ? computeBundlePrice(components, discountType, parsedDiscount, parsedFixed, parsedBasePrice)
        : null;
    const savings = bundlePrice != null ? originalPrice - bundlePrice : 0;

    // MixMatch price preview
    const maxN = parseInt(maxSelectCount) || components.length;
    const previewItems = components.slice(0, Math.min(maxN, components.length));
    const mixMatchPreview = bundle.type === "MIX_MATCH" && components.length > 0
        ? computeMixMatchPrice(previewItems, discountType, parsedDiscount, discountType === "FIXED_PRICE" ? parsedFixed : null, parsedBasePrice)
        : null;

    function typeLabel() {
        if (bundle.type === "FIXED") return "Fixed bundle";
        if (bundle.type === "VOLUME") return "Volume bundle";
        if (bundle.type === "MIX_MATCH") return "Mix & match";
        return bundle.type;
    }

    function statusLabel() {
        if (bundle.status === "ACTIVE") return "Active";
        if (bundle.status === "DRAFT") return "Draft";
        if (bundle.status === "ARCHIVED") return "Archived";
        return bundle.status;
    }

    return (
        <s-page heading={bundle.title}>
            <s-button
                slot="primary-action"
                disabled={!canSave ? true : undefined}
                loading={isSubmitting && currentIntent === "update" ? true : undefined}
                onClick={handleSave}
            >
                Save Bundle
            </s-button>

            <s-button
                slot="secondary-actions"
                variant="tertiary"
                onClick={() => navigate(-1)}
            >
                Back to previous page
            </s-button>

            <s-stack direction="inline" gap="base" align="center" slot="nav">
                {(bundle.status === "DRAFT" || bundle.status === "ARCHIVED") && (
                    <s-button variant="success" onClick={handleActivate}>
                        Activate
                    </s-button>
                )}
                {bundle.status !== "ARCHIVED" && (
                    <s-button variant="tertiary" tone="critical" onClick={() => setShowArchiveConfirm(true)}>
                        Archive
                    </s-button>
                )}
            </s-stack>
            {errors.form && (
                <s-banner tone="critical" heading="Could not save bundle">
                    <s-paragraph>{errors.form}</s-paragraph>
                </s-banner>
            )}

            {/* ── Shared: Bundle details ── */}

            <div style={{ marginBlockStart: "10px" }}>     </div>

            <s-section heading="Bundle details">
                <s-stack direction="block" gap="base">
                    <s-text-field label="Title" value={title} onInput={(e) => setTitle(e.target.value)} error={errors.title} />
                    <s-text-field label="Description" placeholder="Describe what's included…" multiline="3" value={description} onInput={(e) => setDescription(e.target.value)} />
                </s-stack>
            </s-section>

            {bundle.type === "FIXED" && (
                <FixedProductSelector
                    components={components} setComponents={setComponents}
                    discountType={discountType} setDiscountType={setDiscountType}
                    discountValue={discountValue} setDiscountValue={setDiscountValue}
                    fixedPrice={fixedPrice} setFixedPrice={setFixedPrice}
                    errors={errors} shopify={shopify}
                />
            )}

            {bundle.type === "MIX_MATCH" && (
                <MixMatchProductsSection
                    components={components} setComponents={setComponents}
                    minSelectCount={minSelectCount} setMinSelectCount={setMinSelectCount}
                    maxSelectCount={maxSelectCount} setMaxSelectCount={setMaxSelectCount}
                    errors={errors} shopify={shopify}
                />
            )}




            {/* ── Shared: Status ── */}
            <s-section heading="Status & visibility">
                <s-select label="Bundle status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <s-option value="ACTIVE">Active — visible to customers</s-option>
                    <s-option value="DRAFT">Draft — hidden from storefront</s-option>
                </s-select>
            </s-section>

            {/* ── Shared: Media ── */}
            <s-section heading="Media">
                <s-stack direction="block" gap="base">
                    {mediaPreview ? (
                        <s-stack direction="block" gap="tight">
                            <img
                                src={mediaPreview}
                                alt="Bundle image"
                                style={{
                                    width: 200,
                                    height: 200,
                                    objectFit: "cover",
                                    borderRadius: 8,
                                    border: "1px solid #e1e3e5",
                                }}
                            />
                            <div style={{ marginBlockStart: "20px" }} />
                            <s-stack direction="inline" gap="tight">
                                {/* Change image */}
                                <s-button
                                    variant="secondary"
                                    onClick={() => document.getElementById("media-input-edit").click()}
                                >
                                    Change image
                                </s-button>
                                {/* Remove image */}
                                <s-button variant="tertiary" tone="critical" onClick={clearMedia}>
                                    Remove
                                </s-button>
                            </s-stack>
                            <s-text tone="subdued" style={{ fontSize: "12px" }}>
                                {mediaUrl?.startsWith("data:image")
                                    ? "New image selected — will be uploaded on save"
                                    : "Current bundle image"}
                            </s-text>
                        </s-stack>
                    ) : (
                        <s-stack direction="block" gap="tight">
                            <div style={{
                                width: 200, height: 200,
                                border: "2px dashed #d1d5db",
                                borderRadius: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "#f9fafb",
                            }}>
                                <s-text tone="subdued">No image</s-text>
                            </div>

                            <s-button
                                variant="secondary"
                                onClick={() => document.getElementById("media-input-edit").click()}
                            >
                                Upload image
                            </s-button>
                        </s-stack>
                    )}
                    <input
                        id="media-input-edit"
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />
                </s-stack>
            </s-section>

            {/* ── Shared: Tags ── */}
            <s-section heading="Tags">
                <s-text-field
                    label="Tags"
                    value={tags}
                    placeholder="summer, combo, socks"
                    help-text="Comma separated. Used for filtering and search."
                    onInput={(e) => setTags(e.target.value)}
                />
            </s-section>

            {/* ── Shared: Price ── */}
            <s-section heading="Price">
                <s-stack direction="block" gap="base">
                    <s-text-field
                        label="Base Price"
                        type="number"
                        value={price}
                        prefix="$"
                        min="0"
                        placeholder="Enter bundle base price"
                        onInput={(e) => setPrice(e.target.value)}
                        help-text="Optional: Set a manual base price for the bundle."
                    />
                </s-stack>
            </s-section>

            {/* ── Type-specific editors ── */}
            {bundle.type === "FIXED" && (
                <FixedDiscountSection
                    discountType={discountType} setDiscountType={setDiscountType}
                    discountValue={discountValue} setDiscountValue={setDiscountValue}
                    fixedPrice={fixedPrice} setFixedPrice={setFixedPrice}
                    errors={errors} shopify={shopify}
                />
            )}
            {bundle.type === "VOLUME" && (
                <VolumeEditor
                    product={product} setProduct={setProduct}
                    tiers={tiers} setTiers={setTiers}
                    previewQty={previewQty} setPreviewQty={setPreviewQty}
                    errors={errors} shopify={shopify}
                    price={price}
                />
            )}
            {bundle.type === "MIX_MATCH" && (
                <MixMatchDiscountSection
                    discountType={discountType} setDiscountType={setDiscountType}
                    discountValue={discountValue} setDiscountValue={setDiscountValue}
                    fixedPrice={fixedPrice} setFixedPrice={setFixedPrice}
                    errors={errors} shopify={shopify}
                    price={price}
                />
            )}
            {bundle.type === "MULTIVARIANT" && (
                <MultivariantEditor
                    bundle={bundle}
                    isMulti={mvIsMulti}
                    setIsMulti={setMvIsMulti}
                    productCount={mvProductCount}
                    setProductCount={setMvProductCount}
                    selectedProducts={selectedProducts}
                    setSelectedProducts={setSelectedProducts}
                    selectedOptionValues={selectedOptionValues}
                    setSelectedOptionValues={setSelectedOptionValues}
                    enableDiscount={enableDiscount}
                    setEnableDiscount={setEnableDiscount}
                    discountType={discountType}
                    setDiscountType={setDiscountType}
                    discountValue={discountValue}
                    setDiscountValue={setDiscountValue}
                    fixedPrice={fixedPrice}
                    setFixedPrice={setFixedPrice}
                    errors={errors}
                    shopify={shopify}
                />
            )}





            {/* ── ASIDE: Bundle summary (FIXED + MIX_MATCH) ── */}
            {(bundle.type === "FIXED" || bundle.type === "MIX_MATCH") && (
                <s-section slot="aside" heading="Bundle summary">
                    {components.length === 0 ? (
                        <s-paragraph tone="subdued">Add products to see price preview.</s-paragraph>
                    ) : (
                        <s-stack direction="block" gap="tight">
                            {bundle.type === "MIX_MATCH" && (
                                <>
                                    <s-stack direction="inline" gap="base">
                                        <s-text tone="subdued" style={{ flex: 1 }}>Products in pool</s-text>
                                        <s-text>{components.length}</s-text>
                                    </s-stack>
                                    <s-stack direction="inline" gap="base">
                                        <s-text tone="subdued" style={{ flex: 1 }}>Customer picks</s-text>
                                        <s-text>{minSelectCount}{maxSelectCount && maxSelectCount !== minSelectCount ? `–${maxSelectCount}` : ""} items</s-text>
                                    </s-stack>
                                    <s-divider />
                                    <s-text tone="subdued">Preview: first {previewItems.length} items selected</s-text>
                                    <s-stack direction="inline" gap="base">
                                        <s-text tone="subdued" style={{ flex: 1 }}>Original price</s-text>
                                        <s-text tone="subdued">${mixMatchPreview?.originalPrice.toFixed(2)}</s-text>
                                    </s-stack>
                                    {discountType !== "NONE" && mixMatchPreview && (
                                        <s-stack direction="inline" gap="base">
                                            <s-text style={{ flex: 1 }}>Bundle price</s-text>
                                            <s-text tone={mixMatchPreview.savings > 0 ? "success" : undefined}>${mixMatchPreview.bundlePrice.toFixed(2)}</s-text>
                                        </s-stack>
                                    )}
                                    {mixMatchPreview?.savings > 0 && (
                                        <s-badge tone="success">Customer saves ${mixMatchPreview.savings.toFixed(2)}</s-badge>
                                    )}
                                </>
                            )}
                            {bundle.type === "FIXED" && (
                                <>
                                    {components.map((c, i) => (
                                        <s-stack key={i} direction="inline" gap="base">
                                            <s-text style={{ flex: 1 }} tone="subdued">{c.quantity}× {c.shopifyProductTitle}</s-text>
                                            <s-text tone="subdued">${((c.shopifyVariantPrice ?? 0) * c.quantity).toFixed(2)}</s-text>
                                        </s-stack>
                                    ))}
                                    <s-divider />
                                    <s-stack direction="inline" gap="base">
                                        <s-text style={{ flex: 1 }} tone="subdued">Original price</s-text>
                                        <s-text tone="subdued">${originalPrice.toFixed(2)}</s-text>
                                    </s-stack>
                                    {bundlePrice !== null && (
                                        <s-stack direction="inline" gap="base">
                                            <s-text style={{ flex: 1 }}>Bundle price</s-text>
                                            <s-text tone={savings > 0 ? "success" : undefined}>${bundlePrice.toFixed(2)}</s-text>
                                        </s-stack>
                                    )}
                                    {savings > 0 && <s-badge tone="success">Customer saves ${savings.toFixed(2)}</s-badge>}
                                </>
                            )}
                        </s-stack>
                    )}
                </s-section>

            )}




            {/* ── ASIDE: Bundle info (all types) ── */}
            <s-section slot="aside" heading="Bundle info">
                <s-stack direction="block" gap="tight">
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Status</s-text>
                        <s-text>{statusLabel()}</s-text>
                    </s-stack>
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Type</s-text>
                        <s-text>{typeLabel()}</s-text>
                    </s-stack>
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Created</s-text>
                        <s-text>
                            {new Date(bundle.createdAt).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric",
                            })}
                        </s-text>
                    </s-stack>
                    {bundle.shopifyProductId && (
                        <s-stack direction="inline" gap="base">
                            <s-text tone="subdued" style={{ flex: 1 }}>Shopify product</s-text>
                            <s-text>{bundle.shopifyProductId.split("/").pop()}</s-text>
                        </s-stack>
                    )}
                </s-stack>
            </s-section>



            {/* ── Archive modal ── */}
            {showArchiveConfirm && (
                <s-modal
                    heading="Archive this bundle?"
                    open={showArchiveConfirm ? true : undefined}
                    onClose={() => setShowArchiveConfirm(false)}
                >
                    <s-stack direction="block" gap="base">
                        <s-paragraph>Archiving <strong>{bundle.title}</strong> will hide it from your storefront. The Shopify product will be set to Draft.</s-paragraph>
                        <s-paragraph tone="subdued">You can reactivate this bundle at any time.</s-paragraph>
                    </s-stack>
                    <s-stack slot="actions" direction="inline" gap="base">
                        <s-button tone="critical" loading={isSubmitting && currentIntent === "archive" ? true : undefined} onClick={handleArchive}>Archive bundle</s-button>
                        <s-button variant="tertiary" onClick={() => setShowArchiveConfirm(false)}>Cancel</s-button>
                    </s-stack>
                </s-modal>
            )}
            <SuccessModal
                id="success-modal-edit"
                title="Bundle updated!"
                productId={successProductId}
                shop={shop}
                message="Your bundle was updated successfully."
                redirectPath="/app/bundles/index"
            />

        </s-page>
    );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);