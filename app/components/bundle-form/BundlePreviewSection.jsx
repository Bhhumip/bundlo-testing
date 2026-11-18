import { useState, useMemo } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

// ── Price calculation ───────────────────────────────────────────────────
function computeBundlePrice({
    selectedProducts,
    enableDiscount,
    discountType,
    discountValue,
    fixedPrice,
    manualPrice,
}) {
    if (!selectedProducts.length) return { original: 0, bundle: 0, savings: 0 };

    const original = selectedProducts.reduce(
        (sum, p) => sum + parseFloat(p.variants?.[0]?.price ?? "0"),
        0
    );

    let bundle = original;

    if (manualPrice && parseFloat(manualPrice) > 0) {
        bundle = parseFloat(manualPrice);
    } else if (enableDiscount) {
        const val = parseFloat(discountValue) || 0;
        if (discountType === "PERCENTAGE" && val > 0) {
            bundle = original * (1 - val / 100);
        } else if (discountType === "FIXED_AMOUNT" && val > 0) {
            bundle = Math.max(0, original - val);
        } else if (discountType === "FIXED_PRICE") {
            const fp = parseFloat(fixedPrice) || 0;
            if (fp > 0) bundle = fp;
        }
    }

    bundle = Math.round(bundle * 100) / 100;
    const savings = Math.round((original - bundle) * 100) / 100;
    return { original, bundle, savings };
}

// ── Accordion product row for desktop modal ─────────────────────────────
function DesktopProductRow({ product }) {
    const [open, setOpen] = useState(false);

    const image = product.images?.[0]?.originalSrc ?? null;
    const price = parseFloat(product.variants?.[0]?.price ?? "0");

    // Collect all options and their values
    const options = product.options ?? [];
    const sizes = options.find(
        (o) => o.name?.toLowerCase() === "size"
    )?.values ?? ["Small", "Medium", "Large", "XL"];

    return (
        <div style={{ borderBottom: "1px solid #e8e8e8", paddingBottom: 0 }}>
            {/* Product info row */}
            <div
                style={{
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    padding: "20px 0 16px",
                }}
            >
                {/* Thumbnail */}
                <div
                    style={{
                        width: 88,
                        height: 100,
                        borderRadius: 8,
                        border: "1px solid #e8e8e8",
                        background: "#f5f5f5",
                        flexShrink: 0,
                        overflow: "hidden",
                    }}
                >
                    {image ? (
                        <img
                            src={image}
                            alt={product.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                    ) : (
                        <div style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ccc",
                            fontSize: 28,
                        }}>□</div>
                    )}
                </div>

                {/* Name + price */}
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontSize: 15,
                        fontWeight: 400,
                        color: "#1a1a1a",
                        lineHeight: 1.4,
                        marginBottom: 6,
                    }}>
                        {product.title}
                    </div>
                    <div style={{ fontSize: 15, color: "#1a1a1a" }}>
                        €{price.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Select variants accordion */}
            <div
                style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 10,
                    marginBottom: 20,
                    overflow: "hidden",
                }}
            >
                {/* Accordion header */}
                <button
                    onClick={() => setOpen((v) => !v)}
                    style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "14px 18px",
                        background: open ? "#fff" : "#fafafa",
                        border: "none",
                        borderBottom: open ? "1px solid #e8e8e8" : "none",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: 15,
                        fontWeight: 500,
                        color: open ? "#185FA5" : "#1a1a1a",
                    }}
                >
                    {/* Chevron */}
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 20,
                            height: 20,
                            flexShrink: 0,
                            transition: "transform 0.2s",
                            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                            color: open ? "#185FA5" : "#555",
                        }}
                    >
                        {/* Down chevron SVG */}
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </span>
                    Select variants
                </button>

                {/* Expanded options */}
                {open && (
                    <div style={{ padding: "16px 18px" }}>
                        <div style={{
                            fontSize: 13,
                            color: "#555",
                            marginBottom: 10,
                            fontWeight: 500,
                        }}>
                            Size
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {sizes.map((size) => (
                                <button
                                    key={size}
                                    style={{
                                        border: "1px solid #ddd",
                                        background: "#f6f6f7",
                                        padding: "8px 16px",
                                        borderRadius: 8,
                                        cursor: "pointer",
                                        fontSize: 13,
                                        color: "#1a1a1a",
                                        fontWeight: 400,
                                        transition: "border-color 0.15s, background 0.15s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#185FA5";
                                        e.currentTarget.style.background = "#E6F1FB";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "#ddd";
                                        e.currentTarget.style.background = "#f6f6f7";
                                    }}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Single product row in mobile preview ──────────────────────────────
function PreviewProductRow({ product, selectedOptionValues }) {
    const optionSummary = useMemo(() => {
        if (!product.options?.length) return null;
        const parts = product.options
            .map((opt) => {
                const sel = selectedOptionValues?.[opt.name];
                if (!sel?.size) return null;
                return [...sel][0];
            })
            .filter(Boolean);
        return parts.length ? parts.join(" - ") : null;
    }, [product, selectedOptionValues]);

    const displayTitle = optionSummary
        ? `${product.title} - ${optionSummary}`
        : product.title;

    const price = parseFloat(product.variants?.[0]?.price ?? "0");
    const image = product.images?.[0]?.originalSrc ?? null;

    return (
        <div>
            <div style={{ height: 1, background: "#f0f0f0", margin: "0 0 12px" }} />
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: 6,
                    border: "1px solid #e8e8e8",
                    background: "#f5f5f5",
                    flexShrink: 0,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    {image ? (
                        <img src={image} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                        <span style={{ fontSize: 24, color: "#ccc" }}>□</span>
                    )}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 400, color: "#1a1a1a", lineHeight: 1.35, marginBottom: 3 }}>
                        {displayTitle}
                    </div>
                    <div style={{ fontSize: 13, color: "#555" }}>
                        €{price.toFixed(2)}
                    </div>
                </div>
            </div>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "#185FA5",
                fontSize: 13,
                cursor: "pointer",
                userSelect: "none",
                marginBottom: 12,
            }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>›</span>
                <span>Select variants</span>
            </div>
        </div>
    );
}

// ── Main export ─────────────────────────────────────────────────────────
export function BundlePreviewSection({
    title,
    selectedProducts,
    selectedOptionValues,
    enableDiscount,
    discountType,
    discountValue,
    fixedPrice,
    price: manualPrice,
    mediaPreview,
    currencyCode = "USD",
}) {
    const [device, setDevice] = useState("mobile");
    const shopify = useAppBridge();

    const handleDeviceClick = (id) => {
        setDevice(id);
        if (id === "desktop") {
            shopify.modal.show("desktop-preview-modal");
        }
    };

    const { original, bundle, savings } = useMemo(
        () => computeBundlePrice({
            selectedProducts,
            enableDiscount,
            discountType,
            discountValue,
            fixedPrice,
            manualPrice,
        }),
        [selectedProducts, enableDiscount, discountType, discountValue, fixedPrice, manualPrice]
    );

    const hasSavings = savings > 0.005;
    const hasProducts = selectedProducts.length > 0;

    const devices = [
        { id: "desktop", icon: "../components/assets/desktop.png", label: "Desktop" },
        { id: "mobile", icon: "../components/assets/mobile.png", label: "Mobile" },
    ];

    return (
        <>
            <s-section slot="aside" heading="Preview">
                {/* Device toggles */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 6,
                    marginBottom: 10,
                }}>
                    {devices.map(({ id, icon, label }) => (
                        <div
                            key={id}
                            onClick={() => handleDeviceClick(id)}
                            title={label}
                            style={{
                                width: 30,
                                height: 30,
                                border: "1px solid",
                                borderColor: device === id ? "#185FA5" : "#e1e3e5",
                                borderRadius: 6,
                                background: device === id ? "#E6F1FB" : "#fff",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <img src={icon} alt={label} style={{ width: 16, height: 16, objectFit: "contain" }} />
                        </div>
                    ))}
                </div>

                {/* Mobile preview card */}
                <div style={{
                    background: "#ebebeb",
                    borderRadius: 10,
                    padding: "4px 4px 4px 8px",
                    position: "relative",
                }}>
                    <div style={{
                        position: "absolute",
                        right: 6,
                        top: 12,
                        bottom: 12,
                        width: 5,
                        background: "#c8c8c8",
                        borderRadius: 3,
                        pointerEvents: "none",
                        zIndex: 1,
                    }}>
                        <div style={{ width: "100%", height: "35%", background: "#999", borderRadius: 3, marginTop: 4 }} />
                    </div>

                    <div style={{
                        background: "#fff",
                        borderRadius: 8,
                        maxHeight: 580,
                        overflowY: "auto",
                        overflowX: "hidden",
                        paddingRight: 4,
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                    }}>
                        <div style={{
                            width: "100%",
                            aspectRatio: "4 / 3",
                            background: "#e0e0e0",
                            borderRadius: "8px 8px 0 0",
                            overflow: "hidden",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}>
                            {mediaPreview ? (
                                <img src={mediaPreview} alt="Bundle" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#999" }}>
                                    <span style={{ fontSize: 32 }}>🖼</span>
                                    <span style={{ fontSize: 12 }}>No image</span>
                                </div>
                            )}
                        </div>

                        <div style={{ padding: "16px 14px 20px" }}>
                            <div style={{ fontSize: 22, fontWeight: 600, color: "#1a1a1a", marginBottom: 6, lineHeight: 1.2 }}>
                                {title?.trim() || <span style={{ color: "#bbb", fontWeight: 400, fontStyle: "italic" }}>Bundle title…</span>}
                            </div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 18 }}>
                                {hasProducts && hasSavings && (
                                    <span style={{ fontSize: 14, color: "#888", textDecoration: "line-through" }}>
                                        €{original.toFixed(2)}
                                    </span>
                                )}
                                <span style={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a" }}>
                                    {hasProducts ? `€${bundle.toFixed(2)}` : <span style={{ color: "#ccc", fontWeight: 400 }}>—</span>}
                                </span>
                            </div>

                            {!hasProducts ? (
                                <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12, color: "#aaa" }}>
                                    Add products to see preview
                                </div>
                            ) : (
                                selectedProducts.map((product) => (
                                    <PreviewProductRow
                                        key={product.id}
                                        product={product}
                                        selectedOptionValues={selectedOptionValues?.[product.id]}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </s-section>

            {/* ── Desktop preview modal ── */}
            <s-modal id="desktop-preview-modal" heading="Bundle preview" size="large">
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "52% 1fr",
                    width: "calc(100% + 40px)",   /* bleed past s-modal's default padding */
                    marginLeft: -20,
                    marginRight: -20,
                    marginBottom: -20,
                    minHeight: "78vh",
                    background: "#fff",
                    overflow: "hidden",
                }}>
                    {/* LEFT — Hero image, sticky */}
                    <div style={{
                        position: "sticky",
                        top: 0,
                        height: "80vh",
                        background: "#f3f3f3",
                        overflow: "hidden",
                        borderRadius: "0 0 0 12px",
                    }}>
                        {mediaPreview ? (
                            <img
                                src={mediaPreview}
                                alt="Bundle"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                        ) : (
                            <div style={{
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#bbb",
                                gap: 12,
                            }}>
                                <span style={{ fontSize: 48 }}>🖼</span>
                                <span style={{ fontSize: 14 }}>No image</span>
                            </div>
                        )}
                    </div>

                    {/* RIGHT — Product details, scrollable */}
                    <div style={{
                        padding: "36px 40px 40px",
                        overflowY: "auto",
                        maxHeight: "80vh",
                        background: "#fff",
                    }}>
                        {/* Bundle title */}
                        <h1 style={{
                            fontSize: 32,
                            fontWeight: 700,
                            lineHeight: 1.15,
                            color: "#111",
                            marginBottom: 16,
                            marginTop: 0,
                            letterSpacing: "-0.3px",
                        }}>
                            {title?.trim() || "Bundle title"}
                        </h1>

                        {/* Price row */}
                        <div style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 12,
                            marginBottom: 32,
                        }}>
                            {hasSavings && (
                                <span style={{
                                    fontSize: 16,
                                    color: "#999",
                                    textDecoration: "line-through",
                                    fontWeight: 400,
                                }}>
                                    €{original.toFixed(2)}
                                </span>
                            )}
                            <span style={{
                                fontSize: 20,
                                fontWeight: 600,
                                color: "#111",
                            }}>
                                {hasProducts ? `€${bundle.toFixed(2)}` : "—"}
                            </span>
                        </div>

                        {/* Products */}
                        <div>
                            {!hasProducts ? (
                                <div style={{
                                    padding: "40px 0",
                                    textAlign: "center",
                                    fontSize: 14,
                                    color: "#bbb",
                                }}>
                                    No products added yet
                                </div>
                            ) : (
                                selectedProducts.map((product) => (
                                    <DesktopProductRow
                                        key={product.id}
                                        product={product}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </s-modal>
        </>
    );
}