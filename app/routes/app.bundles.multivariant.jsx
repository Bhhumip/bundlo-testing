// app/routes/app.bundles.multivariant.jsx

import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState, useEffect, useRef, useCallback } from "react";
import { authenticate } from "../shopify.server";
import { BackArrow } from "../components/NavArrows.jsx";
import { BundleDetailsSection } from "../components/bundle-form/BundleDetailsSelection.jsx";
import { SuccessModal } from "../components/SuccessModal.jsx";
import { createMultivariantBundle } from "../models/multivariant.server.js";
import { DiscountSection } from "../components/bundle-form/DiscountSection.jsx";
import { StatusSection } from "../components/bundle-form/StatusSection.jsx";
import { TagsSection } from "../components/bundle-form/TagsSection.jsx";
import { PriceSection } from "../components/bundle-form/PriceSection.jsx";
import { MediaSection } from "../components/bundle-form/MediaSection.jsx";
import { BundlePreviewSection } from "../components/bundle-form/BundlePreviewSection.jsx";
import { requireFeatureAccess } from "../featureAccess.server";
// -----------------------------------------------------------------------
// Loader — fetch shop and currency code for price formatting
// -----------------------------------------------------------------------
export const loader = async ({ request }) => {
    const { session, admin } = await authenticate.admin(request);
    await requireFeatureAccess(session.shop, "MULTIVARIANT");

    const res = await admin.graphql(`
        query { shop { currencyCode } }
    `);
    const data = await res.json();

    return {
        shop: session.shop,
        currencyCode: data?.data?.shop?.currencyCode ?? "USD",
    };
};

// -----------------------------------------------------------------------
// Action
// -----------------------------------------------------------------------
export const action = async ({ request }) => {
    const { session, admin } = await authenticate.admin(request);
    await requireFeatureAccess(session.shop, "MULTIVARIANT");
    const formData = await request.formData();

    // ── Section 1 fields ──
    const title = formData.get("title")?.trim();
    const description = formData.get("description")?.trim();

    // ── Section 2 fields ──
    const isMulti = formData.get("isMulti") === "true";
    const productCount = parseInt(formData.get("productCount"), 10) || 1;
    let components = [];
    try {
        components = JSON.parse(formData.get("components") || "[]");
    } catch {
        return { errors: { form: "Invalid product data." } };
    }

    // Section 3 fields
    const status = formData.get("status") || "ACTIVE";
    const tags = formData.get("tags")
        ?.split(",").map((t) => t.trim()).filter(Boolean) || [];
    const mediaUrl = formData.get("mediaUrl")?.trim() || null;
    const rawPrice = formData.get("price");
    const parsedPrice = parseFloat(rawPrice);
    const price = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;
    const discountType = formData.get("discountType") || "NONE";
    const discountValue = parseFloat(formData.get("discountValue")) || 0;
    const fixedPrice = discountType === "FIXED_PRICE"
        ? parseFloat(formData.get("fixedPrice")) || null
        : null;

    const variantLimit = parseInt(formData.get("variantLimit"), 10) || 1000;

    let bundleOptions = [];
    try {
        bundleOptions = JSON.parse(formData.get("bundleOptions") || "[]");
    } catch {
        return { errors: { form: "Invalid bundle options." } };
    }


    // ── Validate ──
    const errors = {};
    if (!title) errors.title = "Bundle title is required.";

    if (!isMulti && components.length !== 1)
        errors.components = "Please add one product.";
    if (isMulti && components.length !== productCount)
        errors.components = `Please add exactly ${productCount} products.`;
    if (Object.keys(errors).length > 0) return { errors };


    try {
        const bundle = await createMultivariantBundle(session.shop, admin, {
            title,
            description,
            discountType,
            discountValue,
            fixedPrice,
            status,
            tags,
            mediaUrl,
            price,
            isMulti,
            productCount,
            variantLimit,
            bundleOptions,
            components,
        });
        return {
            success: true,
            bundleId: bundle.id,
            shopifyProductId: bundle.shopifyProductId,
        };
    } catch (err) {
        return { errors: { form: err.message || "Something went wrong." } };
    }
};

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------
export default function NewMultivariantBundle() {
    const { shop, currencyCode } = useLoaderData();
    const fetcher = useFetcher();
    const shopify = useAppBridge();
    const navigate = useNavigate();
    const prevFetcherState = useRef(null);

    // ── Section 1 state ──
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    // ── Section 2 state ──
    const [isMulti, setIsMulti] = useState(false);
    const [productCount, setProductCount] = useState(2);
    const [selectedProducts, setSelectedProducts] = useState([]);
    //dropdown states
    // selectedOptionValues tracks which values are checked per product per option
    // Structure: { [productId]: { [optionName]: Set(["Red", "Blue"]) } }
    const [selectedOptionValues, setSelectedOptionValues] = useState({});

    // which dropdown is currently open
    // Structure: { [productId_optionName]: boolean }
    const [openDropdowns, setOpenDropdowns] = useState({});
    // ── Derived ──
    const isSubmitting = fetcher.state === "submitting";
    const errors = fetcher.data?.errors ?? {};


    // Section 3 state
    const [enableDiscount, setEnableDiscount] = useState(false);
    const [discountType, setDiscountType] = useState("PERCENTAGE");
    const [discountValue, setDiscountValue] = useState("10");
    const [fixedPrice, setFixedPrice] = useState("");
    const [status, setStatus] = useState("ACTIVE");
    const [tags, setTags] = useState("");
    const [price, setPrice] = useState("");
    const [mediaUrl, setMediaUrl] = useState("");
    const [mediaPreview, setMediaPreview] = useState(null);
    //Succes modal state
    const [successProductId, setSuccessProductId] = useState(null);
    // Can save if title is present, not submitting, required product count met, and all options have at least one value checked
    const canSave =
        title.trim().length > 0 &&
        !isSubmitting &&
        (
            (!isMulti && selectedProducts.length === 1) ||
            (isMulti && selectedProducts.length === productCount)
        ) &&
        selectedProducts.every((p) =>
            (p.options ?? []).every(
                (opt) => (selectedOptionValues[p.id]?.[opt.name]?.size ?? 0) > 0
            )
        );
    // ── handleSubmit — grows as sections are added ──
    const handleSubmit = useCallback(() => {
        const formData = new FormData();

        // Section 1
        formData.append("title", title);
        formData.append("description", description);
        //section 2
        formData.append("isMulti", isMulti);
        formData.append("productCount", productCount);
        formData.append("components", JSON.stringify(
            selectedProducts.map((p, i) => ({
                shopifyProductId: p.id,
                shopifyProductTitle: p.title,
                shopifyProductImage: p.images?.[0]?.originalSrc ?? null,
                shopifyVariantId: p.variants?.[0]?.id ?? null,
                shopifyVariantTitle: p.variants?.[0]?.title ?? null,
                shopifyVariantPrice: parseFloat(p.variants?.[0]?.price ?? "0"),
                shopifySku: p.variants?.[0]?.sku ?? null,
                quantity: 1,
                isRequired: true,
                position: i,
                options: (p.options ?? []).map(opt => ({
                    id: opt.id ?? null,
                    name: opt.name,
                    values: opt.values,
                })),
                variants: p.variants ?? [],
            }))
        ));

        // Build bundleOptions from selectedOptionValues
        const bundleOptions = selectedProducts.map((product) => ({
            productId: product.id,
            options: (product.options ?? []).map((opt) => ({
                name: opt.name,
                selectedValues: [...(selectedOptionValues[product.id]?.[opt.name] ?? [])],
            })),
        }));

        formData.append("bundleOptions", JSON.stringify(bundleOptions));
        // Section 3
        formData.append("status", status);
        formData.append("tags", tags);
        formData.append("mediaUrl", mediaUrl);
        const parsedPrice = parseFloat(price);
        if (!isNaN(parsedPrice)) formData.append("price", parsedPrice);
        else formData.append("price", "");

        if (!enableDiscount) {
            formData.append("discountType", "NONE");
            formData.append("discountValue", "0");
        } else {
            formData.append("discountType", discountType);
            formData.append("discountValue", discountValue);
            if (discountType === "FIXED_PRICE") {
                formData.append("fixedPrice", fixedPrice);
            }
        }

        fetcher.submit(formData, {
            method: "POST",
            action: "/app/bundles/multivariant",
        });
    }, [
        title, description, isMulti, productCount,
        selectedProducts, selectedOptionValues,
        status, tags, mediaUrl, price,
        enableDiscount, discountType, discountValue, fixedPrice,
        fetcher
    ]);

    // ── Success effect ──
    useEffect(() => {
        if (
            fetcher.state === "idle" &&
            fetcher.data?.success &&
            (prevFetcherState.current === "submitting" ||
                prevFetcherState.current === "loading")
        ) {
            setSuccessProductId(fetcher.data.shopifyProductId);
            shopify.modal.show("success-modal-mv");
        }
        prevFetcherState.current = fetcher.state;
    }, [fetcher.state, fetcher.data]);

    // ── Prevent Enter key submission ──
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        document.addEventListener("keydown", handler, true);
        return () => document.removeEventListener("keydown", handler, true);
    }, []);


    // Called when a product is added — initialise all values as checked
    const initProductOptionState = useCallback((product) => {
        const state = {};
        for (const opt of product.options ?? []) {
            state[opt.name] = new Set(opt.values);
        }
        return state;
    }, []);

    // ── Resource Picker ──
    const openPicker = useCallback(async () => {
        // Block if already at required count
        const required = isMulti ? productCount : 1;
        if (selectedProducts.length >= required) return;

        const selected = await shopify.resourcePicker({
            type: "product",
            multiple: false, // always one at a time
            filter: { variants: true },
        });

        if (!selected?.length) return;

        const product = selected[0];


        // Prevent duplicates
        const alreadyAdded = selectedProducts.some(
            (p) => p.id === product.id
        );
        if (alreadyAdded) {
            shopify.toast.show("This product is already added.");
            return;
        }
        // Initialise all option values as checked for this product
        setSelectedOptionValues((prev) => ({
            ...prev,
            [product.id]: initProductOptionState(product),
        }));

        setSelectedProducts((prev) => [...prev, product]);
    }, [isMulti, productCount, selectedProducts, shopify, initProductOptionState]);

    const removeProduct = useCallback((productId) => {
        setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
        setSelectedOptionValues((prev) => {
            const next = { ...prev };
            delete next[productId];
            return next;
        });
    }, []);


    // Toggle a single option value checkbox
    const toggleOptionValue = useCallback((productId, optionName, value) => {
        setSelectedOptionValues((prev) => {
            const productState = { ...(prev[productId] ?? {}) };
            const currentSet = new Set(productState[optionName] ?? []);
            if (currentSet.has(value)) {
                currentSet.delete(value);
            } else {
                currentSet.add(value);
            }
            productState[optionName] = currentSet;
            return { ...prev, [productId]: productState };
        });
    }, []);

    // Toggle dropdown open/close
    const toggleDropdown = useCallback((productId, optionName) => {
        const key = `${productId}_${optionName}`;
        setOpenDropdowns((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    }, []);

    // Compute variant count for one product based on checked values
    const getProductVariantCount = useCallback((product) => {
        const productState = selectedOptionValues[product.id];
        if (!productState) return 0;
        return product.options.reduce((acc, opt) => {
            const selectedCount = productState[opt.name]?.size ?? 0;
            return acc * (selectedCount || 1);
        }, 1);
    }, [selectedOptionValues]);

    // Total variants across all products
    const totalVariantCount = selectedProducts.reduce(
        (sum, p) => sum + getProductVariantCount(p), 0
    );
    // Currency formatter for price preview
    const currencySymbol = new Intl.NumberFormat("en", {
        style: "currency",
        currency: currencyCode,
    })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currencyCode;

    //file handler
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

    return (
        <s-page heading="Create multivariant bundle">

            <s-button
                slot="secondary-actions"
                variant="tertiary"
                icon="arrow-left"
                onClick={() => navigate(-1)}
            >
                Back to previous page
            </s-button>

            <s-button
                slot="primary-action"
                variant="primary"
                disabled={!canSave ? true : undefined}
                loading={isSubmitting ? true : undefined}
                onClick={handleSubmit}
            >
                Save bundle
            </s-button>

            {errors.form && (
                <s-banner tone="critical" heading="Could not create bundle">
                    <s-paragraph>{errors.form}</s-paragraph>
                </s-banner>
            )}

            {/* ── Section 1: Title & Description ── */}
            <div style={{ marginBlockStart: "10px" }}>
                <BundleDetailsSection
                    title={title}
                    setTitle={setTitle}
                    placeholderBundleTitle="e.g. Runner Colour Pack"
                    description={description}
                    setDescription={setDescription}
                    errors={errors}
                />
            </div>

            {/* Section 2 — Product selection */}
            <div style={{ marginBlockStart: "10px" }} />
            {/* Section 2 — Product selection */}
            <div style={{ marginBlockStart: "10px" }} />
            <s-section heading="Products">
                <s-stack direction="block" gap="base">

                    {/* ── Rich toggle ── */}
                    <div style={{ display: "flex", gap: "10px" }}>
                        {/* Single product pill */}
                        <div
                            onClick={() => {
                                setIsMulti(false);
                                setSelectedProducts([]);
                                setSelectedOptionValues({});
                                setProductCount(2);
                            }}
                            style={{
                                flex: 1,
                                padding: "14px 16px",
                                borderRadius: "10px",
                                border: !isMulti
                                    ? "2px solid #185FA5"
                                    : "1.5px solid #e1e3e5",
                                background: !isMulti ? "#E6F1FB" : "#ffffff",
                                cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                            }}>
                                <div style={{
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: "50%",
                                    border: !isMulti ? "5px solid #185FA5" : "2px solid #8c9196",
                                    background: "#fff",
                                    flexShrink: 0,
                                    transition: "all 0.15s",
                                }} />
                                <div>
                                    <div style={{
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        color: !isMulti ? "#185FA5" : "#202223",
                                    }}>
                                        Single product
                                    </div>
                                    <div style={{
                                        fontSize: "11px",
                                        color: "#6d7175",
                                        marginTop: "2px",
                                    }}>
                                        One product, all its variants
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Multi product pill */}
                        <div
                            onClick={() => {
                                setIsMulti(true);
                                setSelectedProducts([]);
                                setSelectedOptionValues({});
                                setProductCount(2);
                            }}
                            style={{
                                flex: 1,
                                padding: "14px 16px",
                                borderRadius: "10px",
                                border: isMulti
                                    ? "2px solid #185FA5"
                                    : "1.5px solid #e1e3e5",
                                background: isMulti ? "#E6F1FB" : "#ffffff",
                                cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                            }}>
                                <div style={{
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: "50%",
                                    border: isMulti ? "5px solid #185FA5" : "2px solid #8c9196",
                                    background: "#fff",
                                    flexShrink: 0,
                                    transition: "all 0.15s",
                                }} />
                                <div>
                                    <div style={{
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        color: isMulti ? "#185FA5" : "#202223",
                                    }}>
                                        Multiple products
                                    </div>
                                    <div style={{
                                        fontSize: "11px",
                                        color: "#6d7175",
                                        marginTop: "2px",
                                    }}>
                                        Combine multiple products
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Product count — multi only ── */}
                    {isMulti && (
                        <s-text-field
                            label="Number of products"
                            type="number"
                            value={String(productCount)}
                            min="2"
                            max="10"
                            help-text="Exactly this many products must be added."
                            onInput={(e) => {
                                const val = Math.max(2, Math.min(10, parseInt(e.target.value) || 2));
                                setProductCount(val);
                                setSelectedProducts([]);
                                setSelectedOptionValues({});
                            }}
                        />
                    )}

                    {/* ── Progress ── */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}>
                        <s-text tone="subdued">
                            {selectedProducts.length} / {isMulti ? productCount : 1} product
                            {(isMulti ? productCount : 1) > 1 ? "s" : ""} added
                        </s-text>
                        {selectedProducts.length > 0 && (
                            <div style={{
                                fontSize: "11px",
                                padding: "2px 10px",
                                borderRadius: "10px",
                                background: totalVariantCount > 1000
                                    ? "#FCEBEB"
                                    : "#EAF3DE",
                                color: totalVariantCount > 1000
                                    ? "#791F1F"
                                    : "#3B6D11",
                                fontWeight: 500,
                            }}>
                                {totalVariantCount} total variants
                            </div>
                        )}
                    </div>

                    {/* ── Product list with option dropdowns ── */}
                    {selectedProducts.length === 0 ? (
                        <s-box
                            padding="base"
                            borderWidth="base"
                            borderRadius="base"
                            background="subdued"
                        >
                            <s-paragraph tone="subdued">
                                No products added yet. Click below to add.
                            </s-paragraph>
                        </s-box>
                    ) : (
                        <s-stack direction="block" gap="base">
                            {selectedProducts.map((product) => {
                                const productVariantCount = getProductVariantCount(product);

                                return (
                                    <s-box
                                        key={product.id}
                                        padding="base"
                                        borderWidth="base"
                                        borderRadius="base"
                                        background="subdued"
                                    >
                                        <s-stack direction="block" gap="base">

                                            {/* Product header */}
                                            <s-stack direction="inline" gap="base">
                                                {product.images?.[0]?.originalSrc && (
                                                    <img
                                                        src={product.images[0].originalSrc}
                                                        alt={product.title}
                                                        style={{
                                                            width: 48,
                                                            height: 48,
                                                            borderRadius: 8,
                                                            objectFit: "cover",
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                )}
                                                <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                                                    <s-text>{product.title}</s-text>
                                                    <s-text tone="subdued">
                                                        {product.variants?.length ?? 0} variants total
                                                        &nbsp;·&nbsp;
                                                        <span style={{
                                                            color: "#3B6D11",
                                                            fontWeight: 500,
                                                        }}>
                                                            {productVariantCount} selected
                                                        </span>
                                                    </s-text>
                                                </s-stack>
                                                <s-button
                                                    variant="tertiary"
                                                    tone="critical"
                                                    onClick={() => removeProduct(product.id)}
                                                >
                                                    Remove
                                                </s-button>
                                            </s-stack>

                                            {/* Option dropdowns — inline expanding lists */}
                                            {(product.options ?? []).length > 0 && (
                                                <div style={{
                                                    borderTop: "1px solid #e1e3e5",
                                                    paddingTop: "10px",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "8px",
                                                }}>
                                                    <div style={{
                                                        fontSize: "11px",
                                                        color: "#6d7175",
                                                        marginBottom: "2px",
                                                    }}>
                                                        Select values to include in bundle
                                                    </div>

                                                    {(product.options ?? []).map((opt) => {
                                                        const dropdownKey = `${product.id}_${opt.name}`;
                                                        const isOpen = !!openDropdowns[dropdownKey];
                                                        const checkedValues = selectedOptionValues[product.id]?.[opt.name] ?? new Set();
                                                        const checkedCount = checkedValues.size;

                                                        return (
                                                            <div
                                                                key={opt.name}
                                                                style={{
                                                                    border: "1.5px solid",
                                                                    borderColor: isOpen ? "#185FA5" : "#e1e3e5",
                                                                    borderRadius: "8px",
                                                                    overflow: "hidden",
                                                                    background: "#ffffff",
                                                                }}
                                                            >
                                                                {/* Trigger row — click to toggle open/close */}
                                                                <div
                                                                    onClick={() => toggleDropdown(product.id, opt.name)}
                                                                    style={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "space-between",
                                                                        padding: "10px 12px",
                                                                        cursor: "pointer",
                                                                        userSelect: "none",
                                                                        background: isOpen ? "#f6f8fc" : "#ffffff",
                                                                    }}
                                                                >
                                                                    <div style={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: "8px",
                                                                    }}>
                                                                        <span style={{
                                                                            fontSize: "12px",
                                                                            fontWeight: 500,
                                                                            color: "#202223",
                                                                        }}>
                                                                            {opt.name}
                                                                        </span>
                                                                        <span style={{
                                                                            fontSize: "11px",
                                                                            padding: "1px 8px",
                                                                            borderRadius: "10px",
                                                                            background: checkedCount === 0 ? "#FCEBEB" : "#EAF3DE",
                                                                            color: checkedCount === 0 ? "#791F1F" : "#3B6D11",
                                                                            fontWeight: 500,
                                                                        }}>
                                                                            {checkedCount} / {opt.values.length} selected
                                                                        </span>
                                                                    </div>
                                                                    <span style={{
                                                                        fontSize: "11px",
                                                                        color: "#6d7175",
                                                                        display: "inline-block",
                                                                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                                                        transition: "transform 0.2s",
                                                                    }}>
                                                                        ▾
                                                                    </span>
                                                                </div>

                                                                {/* Inline expanded list — renders below trigger, no float */}
                                                                {isOpen && (
                                                                    <div style={{
                                                                        borderTop: "1px solid #e1e3e5",
                                                                    }}>
                                                                        {/* Select all / Deselect all row */}
                                                                        <div
                                                                            onClick={() => {
                                                                                setSelectedOptionValues((prev) => {
                                                                                    const productState = { ...(prev[product.id] ?? {}) };
                                                                                    const allSelected = checkedCount === opt.values.length;
                                                                                    productState[opt.name] = allSelected
                                                                                        ? new Set()
                                                                                        : new Set(opt.values);
                                                                                    return { ...prev, [product.id]: productState };
                                                                                });
                                                                            }}
                                                                            style={{
                                                                                padding: "8px 12px",
                                                                                fontSize: "11px",
                                                                                fontWeight: 600,
                                                                                color: "#185FA5",
                                                                                cursor: "pointer",
                                                                                background: "#f6f8fc",
                                                                                borderBottom: "1px solid #e1e3e5",
                                                                            }}
                                                                        >
                                                                            {checkedCount === opt.values.length
                                                                                ? "✕  Deselect all"
                                                                                : "✓  Select all"}
                                                                        </div>

                                                                        {/* Value rows */}
                                                                        {opt.values.map((value) => {
                                                                            const isChecked = checkedValues.has(value);

                                                                            // Build full variant title preview
                                                                            // Format: ProductName - OptionValue (single option)
                                                                            // Format: ProductName - Value1 - Value2 (multiple options shown per row)
                                                                            const variantPreview = `${product.title} - ${value}`;

                                                                            return (
                                                                                <div
                                                                                    key={value}
                                                                                    onClick={() => toggleOptionValue(product.id, opt.name, value)}
                                                                                    style={{
                                                                                        display: "flex",
                                                                                        alignItems: "center",
                                                                                        gap: "10px",
                                                                                        padding: "9px 12px",
                                                                                        cursor: "pointer",
                                                                                        background: isChecked ? "#f0f7ff" : "#ffffff",
                                                                                        borderBottom: "1px solid #f5f5f5",
                                                                                        transition: "background 0.1s",
                                                                                    }}
                                                                                >
                                                                                    {/* Custom checkbox */}
                                                                                    <div style={{
                                                                                        width: "16px",
                                                                                        height: "16px",
                                                                                        borderRadius: "4px",
                                                                                        border: isChecked ? "none" : "1.5px solid #8c9196",
                                                                                        background: isChecked ? "#185FA5" : "#ffffff",
                                                                                        display: "flex",
                                                                                        alignItems: "center",
                                                                                        justifyContent: "center",
                                                                                        flexShrink: 0,
                                                                                        transition: "all 0.1s",
                                                                                    }}>
                                                                                        {isChecked && (
                                                                                            <span style={{
                                                                                                color: "#fff",
                                                                                                fontSize: "10px",
                                                                                                lineHeight: 1,
                                                                                            }}>
                                                                                                ✓
                                                                                            </span>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Value name */}
                                                                                    <span style={{
                                                                                        fontSize: "12px",
                                                                                        color: "#202223",
                                                                                        fontWeight: isChecked ? 500 : 400,
                                                                                        flex: 1,
                                                                                    }}>
                                                                                        {value}
                                                                                    </span>

                                                                                    {/* Full variant title preview */}
                                                                                    <span style={{
                                                                                        fontSize: "11px",
                                                                                        color: "#6d7175",
                                                                                        fontStyle: "italic",
                                                                                    }}>
                                                                                        {variantPreview}
                                                                                    </span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                        </s-stack>
                                    </s-box>
                                );
                            })}
                        </s-stack>
                    )}

                    {/* ── Add product button ── */}
                    {selectedProducts.length < (isMulti ? productCount : 1) && (
                        <s-button variant="secondary" onClick={openPicker}>
                            Add product ({selectedProducts.length}/
                            {isMulti ? productCount : 1})
                        </s-button>
                    )}

                    {/* ── Validation error ── */}
                    {errors.components && (
                        <s-banner tone="critical">
                            <s-paragraph>{errors.components}</s-paragraph>
                        </s-banner>
                    )}

                </s-stack>
            </s-section>

            {/* ── Section 3: Discount ── */}
            <div style={{ marginBlockStart: "10px" }} />
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

            {/* ── Section 3: Status ── */}
            <StatusSection status={status} setStatus={setStatus} />

            {/* ── Section 3: Media ── */}
            <MediaSection
                mediaPreview={mediaPreview}
                handleFileChange={handleFileChange}
                clearMedia={clearMedia}
            />

            {/* ── Section 3: Tags ── */}
            <TagsSection tags={tags} setTags={setTags} />

            {/* ── Section 3: Price ── */}
            <PriceSection
                price={price}
                setPrice={setPrice}
                currencySymbol={currencySymbol}
            />

            <SuccessModal
                id="success-modal-mv"
                title="Bundle created!"
                message="Multivariant bundle created!Would you like to view the product page?"
                productId={successProductId}
                shop={shop}
                redirectPath="/app/bundles/index"
            />

            {/* ── ASIDE: Checklist ── */}
            <s-section slot="aside" heading="Checklist">
                <s-stack direction="block" gap="tight">
                    <s-text tone={title.trim() ? "subdued" : undefined}>
                        {title.trim() ? "✓" : "→"} Bundle title set
                    </s-text>
                    <s-text tone={selectedProducts.length === (isMulti ? productCount : 1) ? "subdued" : undefined}>
                        {selectedProducts.length === (isMulti ? productCount : 1) ? "✓" : "→"} Products added ({selectedProducts.length}/{isMulti ? productCount : 1})
                    </s-text>
                    <s-text>
                        {canSave ? "✓" : "→"} All options configured
                    </s-text>
                </s-stack>
            </s-section>


            {/* ── ASIDE: Bundle Summary ── */}
            <s-section slot="aside" heading="Bundle summary">
                <s-stack direction="block" gap="tight">
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Mode</s-text>
                        <s-text>{isMulti ? "Multi product" : "Single product"}</s-text>
                    </s-stack>
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Products</s-text>
                        <s-text>{selectedProducts.length} / {isMulti ? productCount : 1}</s-text>
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

            <BundlePreviewSection
                title={title}
                selectedProducts={selectedProducts}
                selectedOptionValues={selectedOptionValues}
                enableDiscount={enableDiscount}
                discountType={discountType}
                discountValue={discountValue}
                fixedPrice={fixedPrice}
                price={price}
                mediaPreview={mediaPreview}
                currencyCode={currencyCode}
            />

        </s-page>
    );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);