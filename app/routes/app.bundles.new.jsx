// Create bundle form — fixed bundle type.

import { useNavigation, useFetcher, useNavigate, Outlet, useLocation, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState, useCallback, useEffect, useRef } from "react";
import { authenticate } from "../shopify.server";
import { createBundle } from "../models/bundle.server";
import { computeBundlePrice } from "../utils/bundle-price";
import { BackArrow, ForwardArrow } from "../components/NavArrows.jsx";
import { redirect } from "react-router";
import { BundleDetailsSection } from "../components/bundle-form/BundleDetailsSelection.jsx";
import { SuccessModal } from "../components/SuccessModal.jsx";
import { DiscountSection } from "../components/bundle-form/DiscountSection.jsx";
import { MediaSection } from "../components/bundle-form/MediaSection.jsx";
import { TagsSection } from "../components/bundle-form/TagsSection.jsx";
import { StatusSection } from "../components/bundle-form/StatusSection.jsx";
import { PriceSection } from "../components/bundle-form/PriceSection.jsx";
import { requireFeatureAccess } from "../featureAccess.server";

// -----------------------------------------------------------------------
// Loader
// -----------------------------------------------------------------------
export const loader = async ({ request }) => {
    const { session, admin } = await authenticate.admin(request);
    await requireFeatureAccess(session.shop, "FIXED_BUNDLE");
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

// -----------------------------------------------------------------------
// Action
// -----------------------------------------------------------------------
export const action = async ({ request }) => {
    const { session, admin } = await authenticate.admin(request);
    await requireFeatureAccess(session.shop, "FIXED_BUNDLE");

    //Get form data

    const formData = await request.formData();

    //Extracting data from form

    const title = formData.get("title")?.trim();
    const description = formData.get("description")?.trim();
    const discountType = formData.get("discountType");
    const discountValue = parseFloat(formData.get("discountValue")) || 0;
    const fixedPrice = discountType === "FIXED_PRICE"
        ? parseFloat(formData.get("fixedPrice")) || null
        : null;
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
        return { errors: { components: "Invalid product data. Please try again." } };
    }


    const errors = {};
    if (!title) errors.title = "Bundle title is required.";
    if (components.length < 2) errors.components = "Please add at least 2 products.";

    if (Object.keys(errors).length > 0) return { errors };

    try {
        const bundle = await createBundle(session.shop, admin, {
            title, description, discountType, discountValue, fixedPrice, components,
            status, tags, mediaUrl, price,

        });
        return { success: true, bundleId: bundle.id, shopifyProductId: bundle.shopifyProductId };
    } catch (err) {
        return { errors: { form: err.message || "Something went wrong." } };
    }
};

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------
export default function NewBundle() {


    const location = useLocation();
    const fetcher = useFetcher();
    const navigation = useNavigation();
    const navigate = useNavigate();
    const shopify = useAppBridge();

    //Use state for form fields

    const [mediaPreview, setMediaPreview] = useState(null);
    const isSubmitting = navigation.state === "submitting" || fetcher.state === "submitting";
    const result = fetcher.data;
    const errors = result?.errors ?? {};
    const [status, setStatus] = useState("ACTIVE");
    const [tags, setTags] = useState("");
    const [mediaUrl, setMediaUrl] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [discountType, setDiscountType] = useState("PERCENTAGE");
    const [discountValue, setDiscountValue] = useState("10");
    const [fixedPrice, setFixedPrice] = useState("");
    const [components, setComponents] = useState([]);
    const [enableDiscount, setEnableDiscount] = useState(false);
    //price
    const [price, setPrice] = useState("");

    //Prodct page redirect states
    const { shop, currencyCode } = useLoaderData();



    // Get the currency symbol
    const currencySymbol = new Intl.NumberFormat("en", {
        style: "currency",
        currency: currencyCode,
    })
        .formatToParts(0)
        .find(p => p.type === "currency")?.value ?? currencyCode;
    // Ref to track previous fetcher state for modal logic    
    const prevFetcherState = useRef(null); // add ref
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successProductId, setSuccessProductId] = useState(null);


    useEffect(() => {
        if (
            fetcher.state === "idle" &&
            fetcher.data?.success &&
            (prevFetcherState.current === "submitting" ||
                prevFetcherState.current === "loading")
        ) {

            setSuccessProductId(fetcher.data.shopifyProductId);
            setShowSuccessModal(true);
            shopify.modal.show("success-modal-new");

        }
        prevFetcherState.current = fetcher.state;
    }, [fetcher.state, fetcher.data]);

    // Global Enter key handler to prevent form submission 
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


    // -----------------------------------------------------------------------
    // ResourcePicker — window.shopify 
    // -----------------------------------------------------------------------
    const openPicker = useCallback(async () => {
        const selected = await window.shopify.resourcePicker({
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
                shopifyVariantTitle: variant?.title ?? null,
                shopifyVariantPrice: parseFloat(variant?.price ?? "0"),
                shopifySku: variant?.sku ?? null,
                quantity: 1,
                isRequired: true,
                allVariantIds: product.variants?.map(v => v.id) ?? [],
            };
        });

        setComponents((prev) => {
            const existingIds = new Set(prev.map((c) => c.shopifyVariantId ?? c.shopifyProductId));
            const fresh = newComponents.filter(
                (c) => !existingIds.has(c.shopifyVariantId ?? c.shopifyProductId),
            );
            return [...prev, ...fresh];
        });
    }, []);

    const updateQuantity = useCallback((index, value) => {
        const qty = Math.max(1, parseInt(value) || 1);
        setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, quantity: qty } : c)));
    }, []);

    const removeComponent = useCallback((index) => {
        setComponents((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleSubmit = useCallback(() => {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("status", status);
        formData.append("tags", tags);
        formData.append("mediaUrl", mediaUrl);
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
        formData.append("components", JSON.stringify(components));
        const parsedPrice = parseFloat(price);
        if (!isNaN(parsedPrice)) formData.append("price", parsedPrice);
        else formData.append("price", "");
        fetcher.submit(formData, {
            method: "POST",
            action: `/app/bundles/new`,
        });
    }, [title, description, discountType, discountValue, fixedPrice, components, status, tags, mediaUrl, price, shop, enableDiscount]);

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

    // Live price preview
    const parsedDiscount = parseFloat(discountValue) || 0;
    const parsedFixed = parseFloat(fixedPrice) || null;
    const originalPrice = components.reduce((sum, c) => sum + (c.shopifyVariantPrice ?? 0) * c.quantity, 0);
    const bundlePrice = components.length > 0
        ? computeBundlePrice(components, discountType, parsedDiscount, parsedFixed, parseFloat(price))
        : null;
    const savings = bundlePrice != null ? originalPrice - bundlePrice : 0;

    const canSave = title.trim().length > 0 && components.length >= 2 && !isSubmitting;
    const placeholderBundleTitle = "e.g. Summer Skincare Kit";
    // Redirect to index if not on the new bundle page (e.g. after successful submission)
    if (location.pathname !== "/app/bundles/new") {
        return <Outlet />;
    }
    return (
        <s-page heading="Create bundle">
           <s-button
                slot="secondary-actions"
                variant="tertiary"
                icon="arrow-left"
                onClick={() => navigate(-1)}
            >
                Back to previous page
            </s-button>

            <s-button
                type="button"
                slot="primary-action"
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

            {/* Bundle details */}
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

            {/* Products */}
            <div style={{ marginBlockStart: "10px" }}></div>
            <s-section heading="Products">
                {errors.components && (
                    <s-banner tone="critical">
                        <s-paragraph>{errors.components}</s-paragraph>
                    </s-banner>
                )}

                <s-stack direction="block" gap="base">
                    <s-paragraph tone="subdued">
                        Add at least 2 products to create a fixed bundle.
                    </s-paragraph>

                    <s-button variant="secondary" onClick={openPicker}>
                        Add products
                    </s-button>

                    {components.length === 0 ? (
                        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
                            <s-paragraph tone="subdued">
                                No products added yet. Click "Add products" to browse.
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
                                        <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                                            <s-text>{component.shopifyProductTitle}</s-text>
                                            {component.shopifyVariantTitle &&
                                                component.shopifyVariantTitle !== "Default Title" && (
                                                    <s-text tone="subdued">{component.shopifyVariantTitle}</s-text>
                                                )}
                                            <s-text tone="subdued">
                                                {currencySymbol}{(component.shopifyVariantPrice ?? 0).toFixed(2)} each
                                            </s-text>
                                        </s-stack>

                                        <s-stack direction="inline" gap="tight">
                                            <s-text-field
                                                label="Qty"
                                                label-hidden
                                                type="number"
                                                value={String(component.quantity)}
                                                min="1"
                                                style={{ width: "72px" }}
                                                onInput={(e) => updateQuantity(index, e.target.value)}
                                            />
                                            <s-button
                                                variant="tertiary"
                                                tone="critical"
                                                onClick={() => removeComponent(index)}
                                            >
                                                Remove
                                            </s-button>
                                        </s-stack>
                                    </s-stack>
                                </s-box>
                            ))}
                        </s-stack>
                    )}
                </s-stack>
            </s-section>

            {/* Status */}
            <StatusSection status={status} setStatus={setStatus} />

            {/* Media upload */}
            <MediaSection
                mediaPreview={mediaPreview}
                handleFileChange={handleFileChange}
                clearMedia={clearMedia}
            />

            {/* Tags Section */}
            <TagsSection tags={tags} setTags={setTags} />

            {/* Price settings */}
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

            {/* Price summary aside */}
            <s-section slot="aside" heading="Bundle summary" gap="base">
                {components.length === 0 ? (
                    <s-paragraph tone="subdued">
                        Add products to see the price preview.
                    </s-paragraph>
                ) : (
                    <s-stack direction="block" gap="tight">
                        {components.map((c, i) => (
                            <s-stack key={i} direction="inline" gap="base">
                                <s-text style={{ flex: 1 }} tone="subdued">
                                    {c.quantity}× {c.shopifyProductTitle}
                                </s-text>
                                <s-text tone="subdued">
                                    {currencySymbol}{((c.shopifyVariantPrice ?? 0) * c.quantity).toFixed(2)}
                                </s-text>
                            </s-stack>
                        ))}

                        <s-divider />

                        <s-stack direction="inline" gap="base">
                            <s-text style={{ flex: 1 }} tone="subdued">Original price</s-text>
                            <s-text tone="subdued">{currencySymbol}{originalPrice.toFixed(2)}</s-text>
                        </s-stack>

                        {bundlePrice !== null && (
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
                    </s-stack>

                )}
            </s-section>

            {/* Success modal */}
            <SuccessModal
                id="success-modal-new"
                title="Bundle created!"
                message="Fixed bundle created! Would you like to view the product page?"
                productId={successProductId}
                shop={shop}
                redirectPath="/app/bundles/index"
            />
        </s-page>
    );
}

export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};



