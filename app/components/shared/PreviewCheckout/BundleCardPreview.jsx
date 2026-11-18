const PLACEHOLDER =
    "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";

const MOCK_BUNDLE = {
    title: "Starter Bundle",
    description: "Perfect combination for new users",
    image: PLACEHOLDER,
    discountType: "PERCENTAGE",
    discountValue: 15,
    components: [
        { title: "moisturizer", quantity: 1 },
        { title: "face wash", quantity: 1 },
        { title: "sunscreen", quantity: 2 },
    ],
};

function toTitleCase(str) {
    if (!str) return "";
    return str
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

export function BundleCardPreview({ theme }) {
    const {
        widgetBackground = "#f5f5f0",
        cardBackground = "#ffffff",
        borderColor = "#e0e0e0",
        borderWidth = 1,
        borderRadius = 12,
        buttonVariant = "outline",
        buttonColor = "#262626",
        buttonRadius = 8,
        imageRadius = 10,
        imageSize = 52,
        badgeColor = "#22c55e",
        titleColor = "#191919",
        titleSize = 13,
        priceColor = "#6b7280",
        showPrice = true,
        showBadge = true,
        showDivider = true,
        titleBundle = "Complete the bundle",
        // Position tab keys
        layoutDirection = "vertical",
        itemsPerRow = 2,
        gap = "normal",
        padding = 12,
        alignment = "left",
        widgetMaxWidth = "100%",
        textAlignment = "left",
    } = theme;

    const gapPx = gap === "tight" ? 6 : gap === "loose" ? 16 : 10;
    const alignSelf = alignment === "center" ? "center" : alignment === "right" ? "flex-end" : "flex-start";
    const maxWidth = widgetMaxWidth === "100%" ? "100%" : widgetMaxWidth;
    const cardStyle = {
        background: cardBackground,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: `${borderRadius}px`,
        padding: `${padding}px`,
    };

    const btnStyle = {
        fontSize: "11px",
        padding: "5px 10px",
        borderRadius: `${buttonRadius}px`,
        cursor: "pointer",
            
        fontWeight: 500,
        border:
            buttonVariant === "plain"
                ? "none"
                : `${borderWidth}px solid ${buttonColor}`,
        background: buttonVariant === "filled" ? buttonColor : "transparent",
        color: buttonVariant === "filled" ? "#fff" : buttonColor,
    };

    const discountLabel = `Save ${MOCK_BUNDLE.discountValue}%`;
    const componentList = MOCK_BUNDLE.components
        .map((c) => (c.quantity > 1 ? `${c.quantity}× ` : "") + toTitleCase(c.title))
        .join(" · ");
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: alignSelf }}>
            <div style={{ width: maxWidth, display: "flex", flexDirection: "column", gap: `${gapPx}px` }}>
                {/* widget title */}
                <p
                    style={{
                        fontSize: `${titleSize}px`,
                        color: titleColor,
                        fontWeight: 600,
                        textAlign: textAlignment,
                        margin: "0 0 4px",
                    }}
                >
                    {titleBundle}
                </p>
                {/* card */}
                <div style={cardStyle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {/* main row */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: `${imageSize}px 1fr auto`,
                                gap: "10px",
                                alignItems: "center",
                            }}
                        >
                            <img
                                src={MOCK_BUNDLE.image}
                                alt={MOCK_BUNDLE.title}
                                style={{
                                    width: `${imageSize}px`,
                                    height: `${imageSize}px`,
                                    borderRadius: `${imageRadius}px`,
                                    objectFit: "cover",
                                    background: "#eee",
                                }}
                            />
                            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                <span
                                    style={{
                                        fontSize: `${titleSize}px`,
                                        fontWeight: 600,
                                        color: titleColor,
                                    }}
                                >
                                    {MOCK_BUNDLE.title}
                                </span>
                                <span style={{ fontSize: "11px", color: priceColor }}>
                                    {MOCK_BUNDLE.description}
                                </span>
                                {showBadge && (
                                    <span
                                        style={{
                                            display: "inline-block",
                                            fontSize: "10px",
                                            padding: "1px 7px",
                                            borderRadius: "10px",
                                            background: `${badgeColor}22`,
                                            color: badgeColor,
                                            fontWeight: 500,
                                            width: "fit-content",
                                            marginTop: "2px",
                                        }}
                                    >
                                        {discountLabel}
                                    </span>
                                )}
                            </div>
                            <button style={btnStyle}>+ Add</button>
                        </div>

                        {/* components row */}
                        {showDivider && (
                            <>
                                <div
                                    style={{
                                        height: "0.5px",
                                        background: borderColor,
                                        margin: "2px 0",
                                    }}
                                />
                                <span style={{ fontSize: "11px", color: priceColor }}>
                                    🛍️ {componentList}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}