export function DonationsCheckoutPreview({ theme }) {
    const borderRadiusMap = { none: "0px", base: "6px", large: "12px" };
    const gapMap = { tight: "6px", base: "10px", loose: "16px" };
    const paddingMap = { tight: "10px", base: "14px", loose: "20px" };
    const buttonStyleMap = {
        filled: { background: "#111827", color: "#fff", border: "none" },
        outline: { background: "#fff", color: "#111827", border: "1px solid #111827" },
        plain: { background: "transparent", color: "#111827", border: "none" },
    };

    const radius = borderRadiusMap[theme.borderRadius] ?? "6px";
    const gap = gapMap[theme.gap] ?? "10px";
    const padding = paddingMap[theme.padding] ?? "14px";
    const buttonStyle = buttonStyleMap[theme.buttonVariant] ?? buttonStyleMap.outline;

    return (
        <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: radius,
            padding: padding,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: gap,
        }}>
            <div style={{ fontSize: "14px", fontWeight: 600 }}>{theme.headline}</div>
            {theme.subheading && (
                <div style={{ fontSize: "12px", color: "#6d7175" }}>{theme.subheading}</div>
            )}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {(theme.donationTiers ?? []).map((amt) => (
                    <span key={amt} style={{
                        fontSize: "12px",
                        padding: "6px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: radius,
                    }}>${amt}</span>
                ))}
            </div>
            {theme.allowCustomAmount && (
                <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                    + custom amount (${theme.customMinAmount}–${theme.customMaxAmount})
                </div>
            )}
            <button style={{
                fontSize: "13px",
                padding: "8px",
                borderRadius: radius,
                ...buttonStyle,
            }}>{theme.ctaLabel}</button>
            {theme.impactMessage && (
                <div style={{ fontSize: "11px", color: "#6d7175" }}>{theme.impactMessage}</div>
            )}
        </div>
    );
}