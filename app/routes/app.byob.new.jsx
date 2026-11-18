// app/routes/app.byob.new.jsx
// Build Your Own Box — create form
// Products section shows info banner + greyed placeholder (no picker — set by customer at storefront)

import { useState, useCallback, useRef, useEffect } from "react";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { BackArrow } from "../components/NavArrows.jsx";
import { createByobBox, getExistingByobBox } from "../models/byob.server.js";
import { SuccessModal } from "../components/SuccessModal.jsx";
import { requireFeatureAccess } from "../featureAccess.server";

// -----------------------------------------------------------------------
// Loader
// -----------------------------------------------------------------------
export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);
     await requireFeatureAccess(session.shop, "BYOB");
    const existingBox = await getExistingByobBox(session.shop);
    return {
        shop: session.shop,
        existingBox: existingBox
            ? { id: existingBox.id, title: existingBox.title, status: existingBox.status }
            : null,
    };
};

// -----------------------------------------------------------------------
// Action
// -----------------------------------------------------------------------
export const action = async ({ request }) => {
    const { session, admin } = await authenticate.admin(request);
    await requireFeatureAccess(session.shop, "BYOB");
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "create") {
        const existingBox = await getExistingByobBox(session.shop);
        if (existingBox) {
            return {
                error: "A BYOB box already exists for this shop. Delete the existing box before creating a new one.",
            };
        }

        const title = formData.get("title");
        const description = formData.get("description");
        const status = formData.get("status");
        const price = parseFloat(formData.get("price") ?? "0") || null;
        const tags = formData.get("tags")?.split(",").map(t => t.trim()).filter(Boolean) || [];
        const mediaUrl = formData.get("mediaUrl")?.trim() || null;
        const discountType = formData.get("discountType") ?? "NONE";
        const discountValue = parseFloat(formData.get("discountValue") ?? "0") || 0;
        const fixedPrice = discountType === "FIXED_PRICE"
            ? parseFloat(formData.get("fixedPrice")) || null
            : null;

        if (!title?.trim()) return { error: "Title is required." };

        try {
            const box = await createByobBox(session.shop, admin, {
                title, description, status, price,
                tags, mediaUrl, discountType, discountValue, fixedPrice,
            });
            return { success: true, shopifyProductId: box.shopifyProductId };
        } catch (err) {
            return { error: err.message };
        }
    }

    return { error: "Unknown intent." };
};

// -----------------------------------------------------------------------
// Guard — shown when a box already exists
// -----------------------------------------------------------------------
function BoxExistsGuard({ existingBox }) {
    const navigate = useNavigate();
    return (
        <s-page heading="Create Build Your Own Box">
            <s-button
                slot="secondary-actions"
                variant="tertiary"
                icon="arrow-left"
                onClick={() => navigate(-1)}
            >
                Back to previous page
            </s-button>
            <div style={{ marginBlockStart: "20px" }}>
                <s-banner tone="warning">
                    Only one BYOB box is allowed per shop. Delete the existing box to create a new one.
                </s-banner>
                <div style={{ marginBlockStart: "20px" }}>
                    <s-section heading="Existing box">
                        <s-stack direction="block" gap="base">
                            <s-stack direction="inline" gap="base">
                                <s-text tone="subdued" style={{ flex: 1 }}>Title</s-text>
                                <s-text>{existingBox.title}</s-text>
                            </s-stack>
                            <s-stack direction="inline" gap="base">
                                <s-text tone="subdued" style={{ flex: 1 }}>Status</s-text>
                                <s-text>{existingBox.status}</s-text>
                            </s-stack>
                            <s-button
                                variant="primary"
                                onClick={() => navigate(`/app/byob/${existingBox.id}`)}
                            >
                                Edit existing box
                            </s-button>
                        </s-stack>
                    </s-section>
                </div>
            </div>
        </s-page>
    );
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------
export default function ByobNew() {
    const { shop, existingBox } = useLoaderData();
    const navigate = useNavigate();
    const fetcher = useFetcher();
    const shopify = useAppBridge();

    const isSubmitting = fetcher.state !== "idle";
    const actionData = fetcher.data;

    // ── Form state ──
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("ACTIVE");
    const [price, setPrice] = useState("");
    const [tags, setTags] = useState("");
    const [mediaUrl, setMediaUrl] = useState("");
    const [mediaPreview, setMediaPreview] = useState(null);
    const [discountType, setDiscountType] = useState("NONE");
    const [discountValue, setDiscountValue] = useState("");
    const [fixedPrice, setFixedPrice] = useState("");
    const [successProductId, setSuccessProductId] = useState(null);

    const prevFetcherState = useRef(null);

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

    const handleDiscard = useCallback(() => {
        shopify.modal.show("discard-byob-modal");
    }, [shopify]);

    const confirmDiscard = useCallback(() => {
        shopify.modal.hide("discard-byob-modal");
        navigate("/app/byob");
    }, [navigate, shopify]);

    const handleSubmit = useCallback(() => {
        if (!title.trim()) {
            shopify.toast.show("Title is required.", { isError: true });
            return;
        }
        fetcher.submit(
            {
                intent: "create",
                title, description, status,
                price: price || "0",
                tags, mediaUrl, discountType,
                discountValue: discountValue || "0",
                fixedPrice: fixedPrice || "0",
            },
            { method: "POST" }
        );
    }, [fetcher, title, description, status, price, tags, mediaUrl, discountType, discountValue, fixedPrice, shopify]);

    useEffect(() => {
        if (
            fetcher.state === "idle" &&
            fetcher.data?.success &&
            (prevFetcherState.current === "submitting" || prevFetcherState.current === "loading")
        ) {
            shopify.toast.show("Build Your Own Box created!");
            setSuccessProductId(fetcher.data.shopifyProductId);
            shopify.modal.show("success-modal-byob");
        }
        prevFetcherState.current = fetcher.state;
    }, [fetcher.state, fetcher.data]);

    // ── Summary price ──
    const parsedPrice = parseFloat(price) || null;
    const parsedDiscount = parseFloat(discountValue) || 0;
    const parsedFixed = parseFloat(fixedPrice) || null;

    function computeSummaryPrice() {
        if (!parsedPrice) return null;
        if (discountType === "FIXED_PRICE") return parsedFixed;
        if (discountType === "PERCENTAGE") return parsedPrice - (parsedPrice * parsedDiscount / 100);
        if (discountType === "FIXED_AMOUNT") return parsedPrice - parsedDiscount;
        return parsedPrice;
    }
    const summaryPrice = computeSummaryPrice();
    const savings = parsedPrice && summaryPrice !== null ? parsedPrice - summaryPrice : 0;

    if (existingBox) return <BoxExistsGuard existingBox={existingBox} />;

    return (
        <s-page heading="Create Build Your Own Box">
            <s-button
                slot="secondary-actions"
                variant="tertiary"
                icon="arrow-left"
                onClick={() => navigate(-1)}
            >
                Back to previous page
            </s-button>

            <div style={{ marginBlockStart: "20px" }}>

                {actionData?.error && (
                    <s-banner tone="critical" style={{ marginBottom: "16px" }}>
                        {actionData.error}
                    </s-banner>
                )}

                {/* ── Section 1: Bundle details ── */}
                <s-section heading="Bundle details">
                    <s-stack direction="block" gap="base">
                        <s-text-field
                            label="Title"
                            value={title}
                            placeholder="e.g. Summer Special Box"
                            onInput={(e) => setTitle(e.target.value)}
                        />
                        <s-text-field
                            label="Description"
                            placeholder="Describe what customers can build…"
                            multiline="3"
                            value={description}
                            onInput={(e) => setDescription(e.target.value)}
                        />
                        <s-select
                            label="Status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value || e.detail?.value || "DRAFT")}
                        >
                            <s-option value="ACTIVE">Active — visible to customers</s-option>
                            <s-option value="DRAFT">Draft — hidden from storefront</s-option>
                        </s-select>
                    </s-stack>
                </s-section>

                <div style={{ marginBlockStart: "20px" }} />

                {/* ── Section 2: Products — info only, no picker ── */}
                <s-section heading="Products">
                    <s-stack direction="block" gap="base">
                        <s-banner tone="info">
                            Products for this box are selected by the customer directly from the storefront.
                            You do not need to pre-select products here.
                        </s-banner>
                        <div
                            style={{
                                border: "1px dashed #d1d5db",
                                borderRadius: "8px",
                                padding: "24px",
                                background: "#f9fafb",
                                textAlign: "center",
                                opacity: 0.6,
                                pointerEvents: "none",
                                userSelect: "none",
                            }}
                        >
                            <s-text tone="subdued">
                                🛍️ Product slots will appear here once the customer builds their box from the storefront.
                            </s-text>
                        </div>
                    </s-stack>
                </s-section>

                <div style={{ marginBlockStart: "20px" }} />

                {/* ── Section 3: Price ── */}
                <s-section heading="Price">
                    <s-text-field
                        label="Base price"
                        type="number"
                        value={price}
                        prefix="$"
                        min="0"
                        placeholder="0.00"
                        help-text="Optional base price before any discount is applied."
                        onInput={(e) => setPrice(e.target.value)}
                    />
                </s-section>

                <div style={{ marginBlockStart: "20px" }} />

                {/* ── Section 4: Discount ── */}
                <s-section heading="Discount">
                    <s-stack direction="block" gap="base">
                        <s-paragraph tone="subdued">
                            Applied automatically when the customer completes their box at checkout.
                        </s-paragraph>
                        <s-select
                            label="Discount type"
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value)}
                        >
                            <s-option value="NONE">No discount</s-option>
                            <s-option value="PERCENTAGE">Percentage off total</s-option>
                            <s-option value="FIXED_AMOUNT">Fixed amount off total</s-option>
                            <s-option value="FIXED_PRICE">Set a fixed price</s-option>
                        </s-select>
                        {discountType === "PERCENTAGE" && (
                            <s-text-field
                                label="Discount percentage"
                                type="number"
                                value={discountValue}
                                suffix="%"
                                min="0"
                                max="100"
                                onInput={(e) => setDiscountValue(e.target.value)}
                            />
                        )}
                        {discountType === "FIXED_AMOUNT" && (
                            <s-text-field
                                label="Amount off"
                                type="number"
                                value={discountValue}
                                prefix="$"
                                min="0"
                                onInput={(e) => setDiscountValue(e.target.value)}
                            />
                        )}
                        {discountType === "FIXED_PRICE" && (
                            <s-text-field
                                label="Box price"
                                type="number"
                                value={fixedPrice}
                                prefix="$"
                                min="0"
                                help-text="Exact price the customer pays for the completed box."
                                onInput={(e) => setFixedPrice(e.target.value)}
                            />
                        )}
                    </s-stack>
                </s-section>

                <div style={{ marginBlockStart: "20px" }} />

                {/* ── Section 5: Media ── */}
                <s-section heading="Media">
                    <s-stack direction="block" gap="base">
                        {mediaPreview ? (
                            <s-stack direction="block" gap="tight">
                                <img
                                    src={mediaPreview}
                                    alt="Box image"
                                    style={{
                                        width: 200, height: 200,
                                        objectFit: "cover", borderRadius: 8,
                                        border: "1px solid #e1e3e5",
                                    }}
                                />
                                <div style={{ marginBlockStart: "12px" }} />
                                <s-stack direction="inline" gap="tight">
                                    <s-button
                                        variant="secondary"
                                        onClick={() => document.getElementById("byob-media-input-new").click()}
                                    >
                                        Change image
                                    </s-button>
                                    <s-button variant="tertiary" tone="critical" onClick={clearMedia}>
                                        Remove
                                    </s-button>
                                </s-stack>
                                <s-text tone="subdued" style={{ fontSize: "12px" }}>
                                    New image selected — will be uploaded on save
                                </s-text>
                            </s-stack>
                        ) : (
                            <s-stack direction="block" gap="tight">
                                <div style={{
                                    width: 200, height: 200,
                                    border: "2px dashed #d1d5db", borderRadius: 8,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    background: "#f9fafb",
                                }}>
                                    <s-text tone="subdued">No image</s-text>
                                </div>
                                <s-button
                                    variant="secondary"
                                    onClick={() => document.getElementById("byob-media-input-new").click()}
                                >
                                    Upload image
                                </s-button>
                            </s-stack>
                        )}
                        <input
                            id="byob-media-input-new"
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handleFileChange}
                        />
                    </s-stack>
                </s-section>

                <div style={{ marginBlockStart: "20px" }} />

                {/* ── Section 6: Tags ── */}
                <s-section heading="Tags">
                    <s-text-field
                        label="Tags"
                        value={tags}
                        placeholder="summer, combo, gift"
                        help-text="Comma separated. Used for filtering and search."
                        onInput={(e) => setTags(e.target.value)}
                    />
                </s-section>

                {/* ── Action buttons ── */}
                <div style={{ marginBlockStart: "20px" }}>
                    <s-stack direction="inline" gap="base">
                        <s-button
                            variant="primary"
                            onClick={handleSubmit}
                            loading={isSubmitting ? true : undefined}
                        >
                            Save box
                        </s-button>
                        <s-button variant="tertiary" onClick={handleDiscard}>
                            Discard
                        </s-button>
                    </s-stack>
                </div>

            </div>

            {/* ── Aside: Box summary ── */}
            <s-section slot="aside" heading="Box summary">
                <s-stack direction="block" gap="tight">
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Type</s-text>
                        <s-text>Build Your Own Box</s-text>
                    </s-stack>
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Status</s-text>
                        <s-text>{status === "ACTIVE" ? "Active" : "Draft"}</s-text>
                    </s-stack>
                    {parsedPrice && (
                        <>
                            <s-divider />
                            <s-stack direction="inline" gap="base">
                                <s-text tone="subdued" style={{ flex: 1 }}>Base price</s-text>
                                <s-text tone="subdued">${parsedPrice.toFixed(2)}</s-text>
                            </s-stack>
                            {discountType !== "NONE" && summaryPrice !== null && (
                                <s-stack direction="inline" gap="base">
                                    <s-text style={{ flex: 1 }}>Box price</s-text>
                                    <s-text tone={savings > 0 ? "success" : undefined}>
                                        ${Math.max(0, summaryPrice).toFixed(2)}
                                    </s-text>
                                </s-stack>
                            )}
                            {savings > 0 && (
                                <s-badge tone="success">Customer saves ${savings.toFixed(2)}</s-badge>
                            )}
                        </>
                    )}
                    <s-divider />
                    <s-paragraph tone="subdued" style={{ fontSize: "12px" }}>
                        Products are selected by the customer on the storefront.
                    </s-paragraph>
                </s-stack>
            </s-section>

            {/* Discard modal */}
            <ui-modal id="discard-byob-modal" variant="small">
                <p style={{ padding: "16px" }}>
                    You have unsaved changes. Are you sure you want to discard them?
                </p>
                <ui-title-bar title="Discard changes?">
                    <button variant="primary" tone="critical" onClick={confirmDiscard}>Discard</button>
                    <button onClick={() => shopify.modal.hide("discard-byob-modal")}>Keep editing</button>
                </ui-title-bar>
            </ui-modal>

            {/* Success modal */}
            <SuccessModal
                id="success-modal-byob"
                title="Box created!"
                message="Build Your Own Box created! Would you like to view the product page?"
                productId={successProductId}
                shop={shop}
                redirectPath="/app/byob"
            />

        </s-page>
    );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);