export function StickyCartPreview({ theme, isMobileView }) {
    const bg = theme.bgColor || "#ffffff";
    const buttonBg = theme.buttonBg || "#000000";
    const buttonText = theme.buttonText || "#ffffff";

    return (
        <div
            style={{
                width: "100%",
                maxWidth: isMobileView ? "320px" : "100%",
                background: bg,
                border: "1px solid #e5e5e5",
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                padding: isMobileView ? "14px" : "14px 24px",
                display: "flex",
                flexDirection: isMobileView ? "column" : "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: isMobileView ? "12px" : "24px",
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    minWidth: 0,
                    width: isMobileView ? "100%" : "auto",
                }}
            >
                <div
                    style={{
                        width: isMobileView ? "50px" : "64px",
                        height: isMobileView ? "50px" : "64px",
                        background: "#e5e7eb",
                        borderRadius: "4px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        color: "#9ca3af",
                    }}
                >
                    Image
                </div>

                <div>
                    <div
                        style={{
                            fontSize: isMobileView ? "18px" : "18px",
                            fontWeight: 600,
                            color: "#000",
                        }}
                    >
                        Vitamin C Serum
                    </div>
                    <div
                        style={{
                            marginTop: "4px",
                            fontSize: isMobileView ? "18px" : "17px",
                            fontWeight: 600,
                            color: "#000",
                        }}
                    >
                        Rs. 499
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                    width: isMobileView ? "100%" : "auto",
                }}
            >
                <button
                    type="button"
                    style={{
                        padding: "10px 18px",
                        border: "1px solid #000",
                        background: "#fff",
                        color: "#000",
                        borderRadius: "6px",
                        fontSize: "14px",
                    }}
                >
                    Size ?
                </button>

                <button
                    type="button"
                    style={{
                        border: "none",
                        background: buttonBg,
                        color: buttonText,
                        padding: isMobileView ? "12px 20px" : "12px 28px",
                        borderRadius: "10px",
                        fontSize: "15px",
                        fontWeight: 600,
                    }}
                >
                    Add to Cart
                </button>
            </div>
        </div>
    );
}





