// Create a Mix & Match bundle.
// Merchant adds a pool of products → customer picks N from the pool.

import { useNavigation, useNavigate, useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "../shopify.server";
import { createBundle } from "../models/bundle.server";
import { computeMixMatchPrice } from "../utils/bundle-price";
import { BackArrow } from "../components/NavArrows.jsx";
import { useRef } from "react";
import { SuccessModal } from "../components/SuccessModal.jsx";
import { BundleDetailsSection } from "../components/bundle-form/BundleDetailsSelection.jsx";
import { DiscountSection } from "../components/bundle-form/DiscountSection.jsx";
import { MediaSection } from "../components/bundle-form/MediaSection.jsx";
import { TagsSection } from "../components/bundle-form/TagsSection.jsx";
import { StatusSection } from "../components/bundle-form/StatusSection.jsx";
import { PriceSection } from "../components/bundle-form/PriceSection.jsx";
import { requireFeatureAccess } from "../featureAccess.server";

export const loader = async ({ request }) => {
    const { session, admin } = await authenticate.admin(request);

    await requireFeatureAccess(session.shop, "MIX_MATCH");
    
    const res = await admin.graphql(`
        query {
            shop {
                currencyCode
            }
        }
    `);
    const data = await res.json();
    const currencyCode = data?.data?.shop?.currencyCode ?? "USD";

    return { shop: session.shop, currencyCode };
};

export const action = async ({ request }) => {
    const { session, admin } = await authenticate.admin(request);
    await requireFeatureAccess(session.shop, "MIX_MATCH");
    
    const formData = await request.formData();

    const title = formData.get("title")?.trim();
    const description = formData.get("description")?.trim();
    const discountType = formData.get("discountType");
    const discountValue = parseFloat(formData.get("discountValue")) || 0;
    const fixedPrice = discountType === "FIXED_PRICE"
        ? parseFloat(formData.get("fixedPrice")) || null
        : null;
    const minSelectCount = parseInt(formData.get("minSelectCount")) || 1;
    const maxSelectCount = parseInt(formData.get("maxSelectCount")) || null;
    const status = formData.get("status") || "ACTIVE";
    const tags = formData.get("tags")?.split(",").map(t => t.trim()).filter(Boolean) || [];
    const mediaUrl = formData.get("mediaUrl")?.trim() || null;
    const rawPrice = formData.get("price");
    const parsedPrice = parseFloat(rawPrice);
    const price = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;

    let components = [];
    try {
        components = JSON.parse(formData.get("components") || "[]");
    } catch {
        return { errors: { form: "Invalid product data. Please try again." } };
    }

    const errors = {};
    if (!title) errors.title = "Bundle title is required.";
    if (components.length < 2) errors.components = "Add at least 2 products to the pool.";
    if (minSelectCount < 1) errors.minSelectCount = "Minimum must be at least 1.";
    if (maxSelectCount !== null && maxSelectCount < minSelectCount)
        errors.maxSelectCount = "Maximum must be ≥ minimum.";
    if (Object.keys(errors).length > 0) return { errors };

    try {
        //  createBundle handles everything — product creation, price, metafields, publish
        const bundle = await createBundle(session.shop, admin, {
            title,
            description,
            type: "MIX_MATCH",
            discountType,
            discountValue,
            fixedPrice,
            minSelectCount,
            maxSelectCount,
            components: components.map((c, i) => ({ ...c, isRequired: false, position: i })),
            status,
            tags,
            mediaUrl,
            price, //  passed to createBundle which sets it on the variant
        });
        return {
            success: true,
            bundleId: bundle.id,
            shopifyProductId: bundle.shopifyProductId,
        };
    } catch (err) {
        console.error("CREATE BUNDLE ERROR:", err);
        return { errors: { form: err.message || "Something went wrong." } };
    }
};

export default function NewMixMatchBundle() {
    const fetcher = useFetcher();
    const actionData = fetcher.data;
    const shopify = useAppBridge();
    const navigate = useNavigate();

    //Use State for form fields
    const [status, setStatus] = useState("ACTIVE");
    const [tags, setTags] = useState("");
    const [mediaUrl, setMediaUrl] = useState("");
    const [mediaPreview, setMediaPreview] = useState(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [discountType, setDiscountType] = useState("PERCENTAGE");
    const [discountValue, setDiscountValue] = useState("10");
    const [fixedPrice, setFixedPrice] = useState("");
    const [components, setComponents] = useState([]);
    const [minSelectCount, setMinSelectCount] = useState("2");
    const [maxSelectCount, setMaxSelectCount] = useState("2");
    const [enableDiscount, setEnableDiscount] = useState(false);
    const isSubmitting = fetcher.state === "submitting";
    const errors = actionData?.errors ?? {};

    const prevFetcherState = useRef(null);

    //success modal state
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successProductId, setSuccessProductId] = useState(null);
    //get shop from loader data
    const { shop, currencyCode } = useLoaderData();


    // Get the currency symbol
    const currencySymbol = new Intl.NumberFormat("en", {
        style: "currency",
        currency: currencyCode,
    })
        .formatToParts(0)
        .find(p => p.type === "currency")?.value ?? currencyCode;

    // Monitor fetcher state to show success modal on successful bundle creation   
    useEffect(() => {
        if (
            fetcher.state === "idle" &&
            fetcher.data?.success &&
            (prevFetcherState.current === "submitting" ||
                prevFetcherState.current === "loading")
        ) {
            shopify.toast.show("Bundle created!");
            setSuccessProductId(fetcher.data.shopifyProductId);
            setShowSuccessModal(true);
            shopify.modal.show("success-modal-mm");
        }
        prevFetcherState.current = fetcher.state;
    }, [fetcher.state, fetcher.data]);

    //-----------------------------------------------------------------------
    // ResourcePicker — window.shopify
    //-----------------------------------------------------------------------

    const openPicker = useCallback(async () => {
        const selected = await shopify.resourcePicker({
            type: "product",
            multiple: true,
            filter: { variants: true },
        });
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
                quantity: 1,
                isRequired: false,
                allVariantIds: product.variants?.map(v => v.id) ?? [],
            };
        });

        setComponents((prev) => {
            const existingIds = new Set(
                prev.map((c) => c.shopifyVariantId ?? c.shopifyProductId),
            );
            return [
                ...prev,
                ...newComponents.filter(
                    (c) => !existingIds.has(c.shopifyVariantId ?? c.shopifyProductId),
                ),
            ];
        });
    }, [shopify]);

    const removeComponent = useCallback((index) => {
        setComponents((prev) => prev.filter((_, i) => i !== index));
    }, []);

    //------------------------------------------------------------------------
    // Form submission handler
    //------------------------------------------------------------------------

    const handleSubmit = useCallback(() => {

        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
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
        formData.append("minSelectCount", minSelectCount);
        formData.append("maxSelectCount", maxSelectCount);
        formData.append("components", JSON.stringify(components));
        formData.append("status", status);
        formData.append("tags", tags);
        formData.append("mediaUrl", mediaUrl);
        const parsedPrice = parseFloat(price);
        if (!isNaN(parsedPrice)) formData.append("price", parsedPrice);
        else formData.append("price", "");
        if (discountType === "FIXED_PRICE") formData.append("fixedPrice", fixedPrice);
        fetcher.submit(formData, {
            method: "POST",
            action: `/app/bundles/new/mix-match?shop=${shop}`,
        });

    }, [title, description, discountType, discountValue, fixedPrice, minSelectCount, maxSelectCount, components, status, tags, mediaUrl, price]);
    //------------------------------------------------------------------------
    //Media handlers
    //------------------------------------------------------------------------
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

    const canSave = title.trim() && components.length >= 2 && !isSubmitting;

    // Price preview — simulate customer picking max allowed items
    const maxN = parseInt(maxSelectCount) || components.length;
    const previewItems = components.slice(0, Math.min(maxN, components.length));

    //  Clean destructuring
    const { originalPrice, bundlePrice, savings } = computeMixMatchPrice(
        previewItems,
        discountType,
        parseFloat(discountValue) || 0,
        discountType === "FIXED_PRICE" ? parseFloat(fixedPrice) || null : null,
        parseFloat(price) || null,
    );

    const placeholderBundleTitle = "e.g. Summer Skincare Kit";
    return (
        <s-page heading="Create mix & match bundle">
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
                disabled={!canSave}
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

            {/* ── Bundle Details ───────────────────────────────────────── */}
            <div style={{ marginBlockStart: "10px" }}>
                <BundleDetailsSection
                    title={title}
                    setTitle={setTitle}
                    placeholderBundleTitle={placeholderBundleTitle}
                    description={description}
                    setDescription={setDescription}
                    errors={errors}
                />
            </div>

            {/* ── Selection Rules ──────────────────────────────────────── */}
            <div style={{ marginBlockStart: "10px" }}></div>
            <s-section heading="Selection rules">
                <s-stack direction="block" gap="base">
                    <s-paragraph tone="subdued">
                        How many items must / can customers select from the pool?
                    </s-paragraph>
                    <s-stack direction="inline" gap="base">
                        <s-text-field
                            label="Minimum items"
                            type="number"
                            value={minSelectCount}
                            min="1"
                            error={errors.minSelectCount}
                            help-text="Customer must pick at least this many"
                            onInput={(e) => setMinSelectCount(e.target.value)}
                        />
                        <s-text-field
                            label="Maximum items"
                            type="number"
                            value={maxSelectCount}
                            min="1"
                            error={errors.maxSelectCount}
                            help-text="Leave equal to min for a fixed count"
                            onInput={(e) => setMaxSelectCount(e.target.value)}
                        />
                    </s-stack>
                </s-stack>
            </s-section>


            {/* ── Product Pool ─────────────────────────────────────────── */}
            <s-section heading="Product pool">
                <s-stack direction="block" gap="base">
                    <s-paragraph tone="subdued">
                        Add all products customers can choose from. They will pick{" "}
                        {minSelectCount}
                        {maxSelectCount && maxSelectCount !== minSelectCount
                            ? `–${maxSelectCount}`
                            : ""}{" "}
                        of these.
                    </s-paragraph>

                    {errors.components && (
                        <s-banner tone="critical">
                            <s-paragraph>{errors.components}</s-paragraph>
                        </s-banner>
                    )}

                    <s-button variant="secondary" onClick={openPicker}>
                        Add products
                    </s-button>

                    {components.length === 0 ? (
                        <s-box
                            padding="base"
                            borderWidth="base"
                            borderRadius="base"
                            background="subdued"
                        >
                            <s-paragraph tone="subdued">
                                No products added yet. Click "Add products" to browse your catalogue.
                            </s-paragraph>
                        </s-box>
                    ) : (
                        <s-stack direction="block" gap="base">
                            {components.map((component, index) => (
                                <s-box
                                    key={index}
                                    padding="base"
                                    borderWidth="base"
                                    borderRadius="base"
                                    background="subdued"
                                >
                                    <s-stack direction="inline" gap="base">
                                        {component.shopifyProductImage && (
                                            <img
                                                src={component.shopifyProductImage}
                                                alt={component.shopifyProductTitle}
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
                                            <s-text>{component.shopifyProductTitle}</s-text>
                                            {component.shopifyVariantTitle &&
                                                component.shopifyVariantTitle !== "Default Title" && (
                                                    <s-text tone="subdued">
                                                        {component.shopifyVariantTitle}
                                                    </s-text>
                                                )}
                                            <s-text tone="subdued">
                                                {currencySymbol}{(component.shopifyVariantPrice ?? 0).toFixed(2)}
                                            </s-text>
                                        </s-stack>
                                        <s-button
                                            variant="tertiary"
                                            tone="critical"
                                            onClick={() => removeComponent(index)}
                                        >
                                            Remove
                                        </s-button>
                                    </s-stack>
                                </s-box>
                            ))}
                        </s-stack>
                    )}
                </s-stack>
            </s-section>

            {/* Status */}
            <StatusSection status={status} setStatus={setStatus} />

            {/* Media */}
            <MediaSection
                mediaPreview={mediaPreview}
                handleFileChange={handleFileChange}
                clearMedia={clearMedia}
            />

            {/* Tags */}
            <TagsSection tags={tags} setTags={setTags} />

            {/* Price */}
            <PriceSection price={price} setPrice={setPrice} currencySymbol={currencySymbol} />

            {/* Discount settings */}
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

            {/* ── ASIDE: Summary ───────────────────────────────────────── */}
            <s-section slot="aside" heading="Bundle summary">
                <s-stack direction="block" gap="tight">
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Products in pool</s-text>
                        <s-text>{components.length}</s-text>
                    </s-stack>
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Customer picks</s-text>
                        <s-text>
                            {minSelectCount}
                            {maxSelectCount && maxSelectCount !== minSelectCount
                                ? `–${maxSelectCount}`
                                : ""}{" "}
                            items
                        </s-text>
                    </s-stack>
                    {components.length > 0 && (
                        <>
                            <s-divider />
                            <s-text tone="subdued">
                                Preview: first {previewItems.length} items selected
                            </s-text>
                            <s-stack direction="inline" gap="base">
                                <s-text tone="subdued" style={{ flex: 1 }}>Original price</s-text>
                                <s-text tone="subdued">{currencySymbol}{originalPrice.toFixed(2)}</s-text>
                            </s-stack>
                            {discountType !== "NONE" && (
                                <s-stack direction="inline" gap="base">
                                    <s-text style={{ flex: 1 }}>Bundle price</s-text>
                                    <s-text tone={savings > 0 ? "success" : undefined}>
                                        {currencySymbol}{bundlePrice.toFixed(2)}
                                    </s-text>
                                </s-stack>
                            )}
                            {savings > 0 && (
                                <s-badge tone="success">
                                    Customer saves {currencySymbol}{savings.toFixed(2)}
                                </s-badge>
                            )}
                        </>
                    )}
                </s-stack>
            </s-section>

            {/* ── ASIDE: How it works ──────────────────────────────────── */}
            <s-section slot="aside" heading="How mix & match works">
                <s-stack direction="block" gap="base">
                    <s-paragraph tone="subdued">
                        <strong>1.</strong> You add a pool of products customers can choose from.
                    </s-paragraph>
                    <s-paragraph tone="subdued">
                        <strong>2.</strong> Customers see the bundle in your storefront and
                        select their preferred items.
                    </s-paragraph>
                    <s-paragraph tone="subdued">
                        <strong>3.</strong> Once they hit the minimum selection, the discount
                        is applied automatically at checkout.
                    </s-paragraph>
                </s-stack>
            </s-section>


            <SuccessModal
                id="success-modal-mm"
                title="Bundle created!"
                message="Mix & match bundle created! Would you like to view the product page?"
                productId={successProductId}
                shop={shop}
                redirectPath="/app/bundles/index"
            />

        </s-page >
    );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);