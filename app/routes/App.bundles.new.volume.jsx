// app/routes/app.bundles.new.volume.jsx
// Create a Volume Discount bundle.
// Merchant picks ONE product and sets quantity tiers (buy 2 save 5%, buy 5 save 10%, etc.)

import {
    useLoaderData,
    useNavigation,
    useNavigate,
    useFetcher,
    useActionData,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState, useCallback, useEffect, useRef } from "react";
import { authenticate } from "../shopify.server";
import { createBundle } from "../models/bundle.server";
import { computeVolumePrice, formatTierLabel, computeAllTierPrices } from "../utils/bundle-price";
import { BackArrow } from "../components/NavArrows.jsx";
import { CREATE_PRODUCT_MUTATION, PRODUCT_VARIANT_UPDATE } from "../graphql/bundles.js";
import { SuccessModal } from "../components/SuccessModal.jsx";
import { BundleDetailsSection } from "../components/bundle-form/BundleDetailsSelection.jsx";
import { MediaSection } from "../components/bundle-form/MediaSection.jsx";
import { TagsSection } from "../components/bundle-form/TagsSection.jsx";
import { StatusSection } from "../components/bundle-form/StatusSection.jsx";
import { PriceSection } from "../components/bundle-form/PriceSection.jsx";
import { SingleProductPicker } from "../components/bundle-form/SingleProductPicker.jsx";
import { VolumeTierSection } from "../components/bundle-form/volumeTierSelection";
import { requireFeatureAccess } from "../featureAccess.server";
export const loader = async ({ request }) => {
    const { session, admin } = await authenticate.admin(request);
    await requireFeatureAccess(session.shop, "VOLUME_BUNDLE");
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
    const formData = await request.formData();
    const title = formData.get("title")?.trim();
    const description = formData.get("description")?.trim();
    const status = formData.get("status") || "ACTIVE";
    const tags = formData.get("tags")?.split(",").map(t => t.trim()).filter(Boolean) || [];
    const mediaUrl = formData.get("mediaUrl")?.trim() || null;
    const rawPrice = formData.get("price");
    const parsedPrice = parseFloat(rawPrice);
    const price = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;



    let components = [];
    let volumeTiers = [];
    try {
        components = JSON.parse(formData.get("components") || "[]");
        volumeTiers = JSON.parse(formData.get("volumeTiers") || "[]");
    } catch {
        return { errors: { form: "Invalid data. Please try again." } };
    }

    const errors = {};
    if (!title) errors.title = "Bundle title is required.";
    if (components.length < 1) errors.components = "Please select a product.";
    if (volumeTiers.length < 1) errors.volumeTiers = "Add at least 1 volume tier.";

    // Validate tiers
    const quantities = volumeTiers.map((t) => Number(t.minQuantity));
    if (new Set(quantities).size !== quantities.length)
        errors.volumeTiers = "Each tier must have a unique minimum quantity.";

    if (Object.keys(errors).length > 0) return { errors };

    try {
        const bundle = await createBundle(session.shop, admin, {
            title,
            description,
            price,
            type: "VOLUME",
            discountType: "NONE",
            discountValue: 0,
            components,
            status,
            tags,
            mediaUrl,
            volumeTiers: volumeTiers.map((t) => ({
                minQuantity: Number(t.minQuantity),
                discountType: t.discountType,
                discountValue: Number(t.discountValue),
            })),
        });
        return { success: true, bundleId: bundle.id, shopifyProductId: bundle.shopifyProductId };
    } catch (err) {
        return { errors: { form: err.message || "Something went wrong. Please try again." } };
    }
};

const DEFAULT_TIERS = [
    { minQuantity: "1", discountType: "PERCENTAGE", discountValue: "5" },

];

export default function NewVolumeBundle() {
    // 1. All router/bridge hooks first
    const actionData = useActionData();
    const navigation = useNavigation();
    const fetcher = useFetcher();
    const navigate = useNavigate();
    const shopify = useAppBridge();

    // 2. ALL useState hooks together
    const [status, setStatus] = useState("ACTIVE");
    const [tags, setTags] = useState("");
    const [mediaUrl, setMediaUrl] = useState("");
    const [mediaPreview, setMediaPreview] = useState(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [product, setProduct] = useState(null);
    const [tiers, setTiers] = useState(DEFAULT_TIERS);
    const [previewQty, setPreviewQty] = useState(1);
    // Success modal state
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successProductId, setSuccessProductId] = useState(null);
    // Get previous fetcher state to detect transitions
    const prevFetcherState = useRef(null);
    // Get shop from loader
    const { shop, currencyCode } = useLoaderData();


    // Get the currency symbol
    const currencySymbol = new Intl.NumberFormat("en", {
        style: "currency",
        currency: currencyCode,
    })
        .formatToParts(0)
        .find(p => p.type === "currency")?.value ?? currencyCode;
    // 3. Derived values AFTER all hooks
    const errors = fetcher.data?.errors ?? actionData?.errors ?? {};
    const isSubmitting = fetcher.state === "submitting";
    // 4. useEffect
    //  useEffect that navigates on success:
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
            shopify.modal.show("success-modal-v");
        }
        prevFetcherState.current = fetcher.state;
    }, [fetcher.state, fetcher.data]);



    const openPicker = useCallback(async () => {
        const selected = await shopify.resourcePicker({
            type: "product",
            multiple: false,
            filter: { variants: true },
        });
        if (!selected?.length) return;
        const p = selected[0];
        const variant = p.variants?.[0];
        setProduct({
            shopifyProductId: p.id,
            shopifyProductTitle: p.title,
            shopifyProductImage: p.images?.[0]?.originalSrc ?? null,
            //shopifyVariantId: variant?.id ?? null,
            shopifyVariantTitle: variant?.title ?? null,
            shopifyVariantPrice: parseFloat(variant?.price ?? "0"),
            shopifySku: variant?.sku ?? null,
            quantity: 1,
            isRequired: true,
            position: 0,
            allVariantIds: p.variants?.map(v => v.id) ?? [],
        });
    }, [shopify]);

    const addTier = () => {
        setTiers((prev) => [
            ...prev,
            { minQuantity: "", discountType: "PERCENTAGE", discountValue: "" },
        ]);
    };

    const updateTier = (index, field, value) => {
        setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
    };

    const removeTier = (index) => {
        setTiers((prev) => prev.filter((_, i) => i !== index));
    };




    const handleSubmit = useCallback(() => {
        const formData = new FormData();
        formData.append("title", title);

        formData.append("description", description);
        formData.append("components", JSON.stringify(product ? [product] : []));
        formData.append("volumeTiers", JSON.stringify(tiers));
        formData.append("status", status);
        formData.append("tags", tags);
        formData.append("mediaUrl", mediaUrl);
        const parsedPrice = parseFloat(price);
        if (!isNaN(parsedPrice)) formData.append("price", parsedPrice);
        else formData.append("price", "");
        fetcher.submit(formData, {
            method: "POST",
            action: `/app/bundles/new/volume?shop=${shop}`,
        });
    }, [title, description, product, tiers, fetcher, status, tags, mediaUrl, price]);

    // Handle Media Upload
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

    const canSave = title.trim() && product && tiers.length >= 1 && !isSubmitting;

    // Price preview
    const parsedPrice = parseFloat(price) || null;
    const unitPrice = product?.shopifyVariantPrice ?? 0;
    const parsedTiers = tiers
        .filter((t) => t.minQuantity && t.discountValue)
        .map((t) => ({
            minQuantity: Number(t.minQuantity),
            discountType: t.discountType,
            discountValue: Number(t.discountValue),
        }));
    const pricePreview = computeVolumePrice(unitPrice, previewQty, parsedTiers, parsedPrice);

    //Price  Preview
    const allTierPreviews = computeAllTierPrices(
        unitPrice,
        previewQty,
        parsedTiers,
        parsedPrice
    );
    const placeholderBundleTitle = "e.g. Buy More, Save More";

    return (
        <s-page heading="Create volume Bundle">


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

            <div style={{ marginBlockStart: "10px" }}></div>
            {/* ── Product ──────────────────────────────────────────────── */}
            <SingleProductPicker
                product={product}
                setProduct={setProduct}
                openPicker={openPicker}
                previewQty={previewQty}
                setPreviewQty={setPreviewQty}
            />

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

            {/* ── Volume Tiers ─────────────────────────────────────────── */}

            <VolumeTierSection
                tiers={tiers}
                addTier={addTier}
                updateTier={updateTier}
                removeTier={removeTier}
                errors={errors}
                currencySymbol={currencySymbol}
            />


            {/* ── ASIDE: Price Preview ─────────────────────────────────── */}
            <s-section slot="aside" heading="Price preview">
                {!product || parsedTiers.length === 0 ? (
                    <s-paragraph tone="subdued">
                        Select a product and add tiers to preview pricing.
                    </s-paragraph>
                ) : (
                    <s-stack direction="block" gap="base">
                        <s-text-field
                            label="Preview quantity"
                            type="number"
                            value={String(previewQty)}
                            min="1"
                            onInput={(e) => setPreviewQty(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                        <s-divider />
                        <s-stack direction="inline" gap="base">
                            <s-text tone="subdued" style={{ flex: 1 }}>Unit price</s-text>
                            <s-text tone="subdued">
                                {currencySymbol}{(parsedPrice && parsedPrice > 0 ? parsedPrice : unitPrice).toFixed(2)}
                            </s-text>
                        </s-stack>
                        {pricePreview.tier && (
                            <s-stack direction="inline" gap="base">
                                <s-text tone="subdued" style={{ flex: 1 }}>Tier applied</s-text>
                                <s-badge tone="info">{formatTierLabel(pricePreview.tier)}</s-badge>
                            </s-stack>
                        )}
                        <s-stack direction="inline" gap="base">
                            <s-text tone="subdued" style={{ flex: 1 }}>Price per unit</s-text>
                            <s-text>{currencySymbol}{pricePreview.pricePerUnit.toFixed(2)}</s-text>
                        </s-stack>
                        <s-divider />
                        <s-stack direction="inline" gap="base">
                            <s-text style={{ flex: 1 }}>Total for {previewQty}</s-text>
                            <s-text tone={pricePreview.savings > 0 ? "success" : undefined}>
                                {currencySymbol}{pricePreview.totalPrice.toFixed(2)}
                            </s-text>
                        </s-stack>
                        {pricePreview.savings > 0 && (
                            <s-badge tone="success">
                                Customer saves {currencySymbol}{pricePreview.savings.toFixed(2)}
                            </s-badge>
                        )}
                    </s-stack>
                )}
            </s-section>


            {/* ── ASIDE: Tier Table ─────────────────────────────────────── */}
            <s-section slot="aside" heading="All tiers">
                {parsedTiers.length === 0 ? (
                    <s-paragraph tone="subdued">No valid tiers yet.</s-paragraph>
                ) : (
                    <s-stack direction="block" gap="tight">
                        {[...parsedTiers]
                            .sort((a, b) => a.minQuantity - b.minQuantity)
                            .map((tier, i) => (
                                <s-stack key={i} direction="inline" gap="base">
                                    <s-text tone="subdued" style={{ flex: 1 }}>
                                        Buy {tier.minQuantity}+
                                    </s-text>
                                    <s-text>
                                        {tier.discountType === "PERCENTAGE"
                                            ? `${currencySymbol}${tier.discountValue}% off`
                                            : `${currencySymbol}${tier.discountValue} off/unit`}
                                    </s-text>
                                </s-stack>
                            ))}
                    </s-stack>
                )}
            </s-section>
            {/* ── ASIDE: All Tier Previews ─────────────────────────────────── */}
            <s-section slot="aside" heading="All tier prices">
                <s-stack direction="block" gap="tight">
                    <s-text tone="subdued">Price for each tier</s-text>

                    {allTierPreviews.map((tier, index) => (
                        <s-stack key={index} direction="inline" gap="base">
                            <s-text style={{ flex: 1 }}>
                                {formatTierLabel(tier)}
                            </s-text>

                            <s-text>
                                {currencySymbol}{tier.totalPrice.toFixed(2)}
                            </s-text>

                            {tier.isApplicable && (
                                <s-badge tone="success">Eligible</s-badge>
                            )}
                        </s-stack>
                    ))}
                </s-stack>
            </s-section>

            <SuccessModal
                id="success-modal-v"
                title="Bundle created!"
                message="Volume bundle created! Would you like to view the product page?"
                productId={successProductId}
                shop={shop}
                redirectPath="/app/bundles/index"
            />



        </s-page >
    );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);


