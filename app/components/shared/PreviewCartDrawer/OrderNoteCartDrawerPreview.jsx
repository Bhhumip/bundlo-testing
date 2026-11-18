export function OrderNoteCartDrawerPreview({ theme }) {
    const borderRadiusMap = { none: "0px", base: "6px", large: "12px" };
    const gapMap = { tight: "6px", base: "10px", loose: "16px" };
    const paddingMap = { tight: "10px", base: "14px", loose: "20px" };

    const radius = borderRadiusMap[theme.borderRadius] ?? "6px";
    const gap = gapMap[theme.gap] ?? "10px";
    const padding = paddingMap[theme.padding] ?? "14px";

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
            <div style={{ fontSize: "14px", fontWeight: 600 }}>
                {theme.label || "Order note"}
            </div>
            <textarea
                readOnly
                placeholder={theme.placeholder}
                style={{
                    fontSize: "13px",
                    padding: "8px",
                    borderRadius: radius,
                    border: "1px solid #d1d5db",
                    resize: "none",
                    height: "60px",
                    fontFamily: "inherit",
                }}
            />
            {theme.maxLength ? (
                <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                    0/{theme.maxLength}
                </div>
            ) : null}
            {theme.required && (
                <div style={{ fontSize: "10px", color: "#dc2626" }}>Required</div>
            )}
        </div>
    );
}