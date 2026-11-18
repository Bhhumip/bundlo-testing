// app/routes/app.byob.$id.jsx
// Edit Build Your Own Box
// Products section shows info banner + greyed placeholder (no picker — set by customer at storefront)

import { useState, useCallback, useEffect, useRef } from "react";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { BackArrow } from "../components/NavArrows.jsx";
import { SuccessModal } from "../components/SuccessModal.jsx";
import { getByobBox, updateByobBox, deleteByobBox } from "../models/byob.server.js";
import { DiscountSection } from "../components/bundle-form/DiscountSection.jsx";
import { requireFeatureAccess } from "../featureAccess.server";
// -----------------------------------------------------------------------
// Loader
// -----------------------------------------------------------------------
export const loader = async ({ request, params }) => {
    const { session } = await authenticate.admin(request);
    await requireFeatureAccess(session.shop, "BYOB");
    const box = await getByobBox(params.id, session.shop);
    if (!box) throw new Response("BYOB box not found", { status: 404 });
    return { box, shop: session.shop };
};

// -----------------------------------------------------------------------
// Action
// -----------------------------------------------------------------------
export const action = async ({ request, params }) => {
    const { session, admin } = await authenticate.admin(request);
    await requireFeatureAccess(session.shop, "BYOB");
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "update") {
        const title = formData.get("title")?.trim();
        const description = formData.get("description")?.trim() ?? "";
        const status = formData.get("status") ?? "ACTIVE";
        const price = parseFloat(formData.get("price") ?? "0") || null;
        const tags = formData.get("tags")?.split(",").map(t => t.trim()).filter(Boolean) || [];
        const mediaUrl = formData.get("mediaUrl")?.trim() || null;
        const discountType = formData.get("discountType") ?? "NONE";
        const discountValue = parseFloat(formData.get("discountValue") ?? "0") || 0;
        const fixedPrice = discountType === "FIXED_PRICE"
            ? parseFloat(formData.get("fixedPrice")) || null
            : null;

        if (!title) return { errors: { title: "Title is required." } };

        try {
            const updated = await updateByobBox(params.id, session.shop, admin, {
                title, description, status, price,
                tags, mediaUrl, discountType, discountValue, fixedPrice,
            });
            return {
                success: true,
                message: "BYOB box saved!",
                shopifyProductId: updated.shopifyProductId,
            };
        } catch (err) {
            return { errors: { form: err.message || "Could not save box." } };
        }
    }

    if (intent === "archive") {
        try {
            await updateByobBox(params.id, session.shop, admin, { status: "DRAFT" });
            return { archived: true };
        } catch (err) {
            return { errors: { form: err.message } };
        }
    }

    if (intent === "activate") {
        try {
            await updateByobBox(params.id, session.shop, admin, { status: "ACTIVE" });
            return { activated: true };
        } catch (err) {
            return { errors: { form: err.message } };
        }
    }

    if (intent === "delete") {
        try {
            await deleteByobBox(params.id, session.shop, admin);
            return { deleted: true };
        } catch (err) {
            return { errors: { form: err.message } };
        }
    }

    return { errors: { form: "Unknown action." } };
};

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------
export default function ByobEdit() {
    const { box, shop } = useLoaderData();
    const fetcher = useFetcher();
    const navigate = useNavigate();
    const shopify = useAppBridge();

    const isSubmitting = fetcher.state === "submitting";
    const currentIntent = fetcher.formData?.get("intent");
    const errors = fetcher.data?.errors ?? {};

    const prevFetcherState = useRef(null);

    // ── Form state — initialised from loader ──
    const [title, setTitle] = useState(box.title ?? "");
    const [description, setDescription] = useState(box.description ?? "");
    const [status, setStatus] = useState(box.status ?? "ACTIVE");
    const [price, setPrice] = useState(String(box.price ?? ""));
    const [tags, setTags] = useState(
        Array.isArray(box.tags)
            ? box.tags.join(", ")
            : box.tags
                ? (() => { try { return JSON.parse(box.tags).join(", "); } catch { return box.tags; } })()
                : ""
    );
    const [mediaUrl, setMediaUrl] = useState(box.mediaUrl ?? "");
    const [mediaPreview, setMediaPreview] = useState(box.mediaUrl ?? null);
    const [discountType, setDiscountType] = useState(box.discountType ?? "NONE");
    const [discountValue, setDiscountValue] = useState(String(box.discountValue ?? ""));
    const [fixedPrice, setFixedPrice] = useState(String(box.fixedPrice ?? ""));
    const [successProductId, setSuccessProductId] = useState(null);
    const [enableDiscount, setEnableDiscount] = useState(
        (box.discountType ?? "NONE") !== "NONE"
    );

    // ── Handle action responses ──
    useEffect(() => {
        if (
            fetcher.state === "idle" &&
            fetcher.data?.success &&
            (prevFetcherState.current === "submitting" || prevFetcherState.current === "loading")
        ) {
            shopify.toast.show(fetcher.data.message ?? "Saved!");
            setSuccessProductId(fetcher.data.shopifyProductId);
            shopify.modal.show("success-modal-byob-edit");
        }
        if (fetcher.state === "idle" && fetcher.data?.archived) {
            shopify.toast.show("Box archived.");
            setStatus("DRAFT");
        }
        if (fetcher.state === "idle" && fetcher.data?.activated) {
            shopify.toast.show("Box is now active!");
            setStatus("ACTIVE");
        }
        if (fetcher.state === "idle" && fetcher.data?.deleted) {
            shopify.toast.show("Box deleted.");
            navigate("/app/dashboard");
        }
        prevFetcherState.current = fetcher.state;
    }, [fetcher.state, fetcher.data]);

    // ── Handlers ──
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

    const handleSave = useCallback(() => {
        if (!title.trim()) {
            shopify.toast.show("Title is required.", { isError: true });
            return;
        }
        fetcher.submit(
            {
                intent: "update",
                title, description, status,
                price: price || "0",
                tags, mediaUrl,
                discountType: enableDiscount ? discountType : "NONE",
                discountValue: enableDiscount ? (discountValue || "0") : "0",
                fixedPrice: enableDiscount ? (fixedPrice || "0") : "0",
            },
            { method: "POST" }
        );
    }, [fetcher, title, description, status, price, tags, mediaUrl,
        enableDiscount, discountType, discountValue, fixedPrice, shopify]);

    const handleArchive = useCallback(() => {
        shopify.modal.hide("archive-byob-modal");
        fetcher.submit({ intent: "archive" }, { method: "POST" });
    }, [fetcher, shopify]);

    const handleActivate = useCallback(() => {
        fetcher.submit({ intent: "activate" }, { method: "POST" });
    }, [fetcher]);

    const handleDelete = useCallback(() => {
        shopify.modal.hide("delete-byob-modal");
        fetcher.submit({ intent: "delete" }, { method: "POST" });
    }, [fetcher, shopify]);

    const canSave = !!title.trim() && !isSubmitting;

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

    function statusLabel() {
        if (status === "ACTIVE") return "Active";
        if (status === "DRAFT") return "Draft";
        if (status === "ARCHIVED") return "Archived";
        return status;
    }

    return (
        <s-page heading={box.title}>

            {/* Primary save action */}
            <s-button
                slot="primary-action"
                disabled={!canSave ? true : undefined}
                loading={isSubmitting && currentIntent === "update" ? true : undefined}
                onClick={handleSave}
            >
                Save box
            </s-button>

            {/* Back button */}
            <s-button
                slot="secondary-actions"
                variant="tertiary"
                icon="arrow-left"
                onClick={() => navigate(-1)}
            >
                Back to previous page
            </s-button>

            {/* Nav bar — Activate / Archive */}
            <s-stack direction="inline" gap="base" align="center" slot="nav">
                {(status === "DRAFT" || status === "ARCHIVED") && (
                    <s-button
                        variant="success"
                        onClick={handleActivate}
                        loading={isSubmitting && currentIntent === "activate" ? true : undefined}
                    >
                        Activate
                    </s-button>
                )}
                {status !== "ARCHIVED" && (
                    <s-button
                        variant="tertiary"
                        tone="critical"
                        onClick={() => shopify.modal.show("archive-byob-modal")}
                    >
                        Archive
                    </s-button>
                )}
            </s-stack>


            <div style={{ marginBlockStart: "20px" }}>

                {errors.form && (
                    <s-banner tone="critical" style={{ marginBottom: "16px" }}>
                        {errors.form}
                    </s-banner>
                )}



                {/* ── Warning banner ── */}
                <s-banner tone="info" style={{ marginBottom: "16px" }}>
                    Changes to this box will affect the storefront immediately if the box is Active.
                    Consider setting it to Draft before making major edits.
                </s-banner>



                <div style={{ marginBlockStart: "20px" }}></div>
                {/* ── Section 1: Bundle details ── */}
                <s-section heading="Bundle details">
                    <s-stack direction="block" gap="base">
                        <s-text-field
                            label="Title"
                            value={title}
                            error={errors.title}
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
                                        onClick={() => document.getElementById("byob-media-input-edit").click()}
                                    >
                                        Change image
                                    </s-button>
                                    <s-button variant="tertiary" tone="critical" onClick={clearMedia}>
                                        Remove
                                    </s-button>
                                </s-stack>
                                <s-text tone="subdued" style={{ fontSize: "12px" }}>
                                    {mediaUrl?.startsWith("data:image")
                                        ? "New image selected — will be uploaded on save"
                                        : "Current box image"}
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
                                    onClick={() => document.getElementById("byob-media-input-edit").click()}
                                >
                                    Upload image
                                </s-button>
                            </s-stack>
                        )}
                        <input
                            id="byob-media-input-edit"
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

                <div style={{ marginBlockStart: "20px" }} />

                {/* ── Section 7: Danger zone ── */}
                <s-section heading="Danger zone">
                    <s-stack direction="block" gap="base">
                        <s-banner tone="warning">
                            Deleting this box is permanent and cannot be undone. The associated Shopify
                            product will also be removed. Once deleted, you can create a new BYOB box.
                        </s-banner>
                        <div>
                            <s-button
                                variant="primary"
                                tone="critical"
                                loading={isSubmitting && currentIntent === "delete" ? true : undefined}
                                onClick={() => shopify.modal.show("delete-byob-modal")}
                            >
                                Delete this box
                            </s-button>
                        </div>
                    </s-stack>
                </s-section>

            </div>

            {/* ── Aside: Box summary ── */}
            <s-section slot="aside" heading="Box summary">
                <s-stack direction="block" gap="tight">
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Type</s-text>
                        <s-text>Build Your Own Box</s-text>
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

            {/* ── Aside: Bundle info ── */}
            <s-section slot="aside" heading="Bundle info">
                <s-stack direction="block" gap="tight">
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Status</s-text>
                        <s-text>{statusLabel()}</s-text>
                    </s-stack>
                    <s-stack direction="inline" gap="base">
                        <s-text tone="subdued" style={{ flex: 1 }}>Created</s-text>
                        <s-text>
                            {new Date(box.createdAt).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric",
                            })}
                        </s-text>
                    </s-stack>
                    {box.shopifyProductId && (
                        <s-stack direction="inline" gap="base">
                            <s-text tone="subdued" style={{ flex: 1 }}>Shopify product</s-text>
                            <s-text>{box.shopifyProductId.split("/").pop()}</s-text>
                        </s-stack>
                    )}
                </s-stack>
            </s-section>

            {/* ── Modals ── */}
            <ui-modal id="archive-byob-modal" variant="small">
                <p style={{ padding: "16px" }}>
                    Archiving <strong>{title}</strong> will hide it from your storefront.
                    The Shopify product will be set to Draft. You can reactivate it anytime.
                </p>
                <ui-title-bar title="Archive this box?">
                    <button variant="primary" tone="critical" onClick={handleArchive}>Archive</button>
                    <button onClick={() => shopify.modal.hide("archive-byob-modal")}>Keep editing</button>
                </ui-title-bar>
            </ui-modal>

            <ui-modal id="delete-byob-modal" variant="small">
                <p style={{ padding: "16px" }}>
                    This will permanently delete <strong>{title}</strong> and its Shopify product.
                    This action <strong>cannot be undone</strong>. Once deleted, you can create a new BYOB box.
                </p>
                <ui-title-bar title="Delete this box?">
                    <button variant="primary" tone="critical" onClick={handleDelete}>Yes, delete box</button>
                    <button onClick={() => shopify.modal.hide("delete-byob-modal")}>Cancel</button>
                </ui-title-bar>
            </ui-modal>

            <SuccessModal
                id="success-modal-byob-edit"
                title="Box updated!"
                message="Your BYOB box was updated successfully."
                productId={successProductId}
                shop={shop}
                redirectPath="/app/dashboard"
            />

        </s-page>
    );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);