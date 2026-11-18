// Fallback preview used for all remaining checkout widgets
// (OneClickUpsell, Donations, RewardBar, Testimonials, etc.)
// Shows a realistic checkout extension UI shell that reacts to theme changes.

const WIDGET_MOCK_DATA = {
    one_click_upsell_at_checkout: {
        icon: "🛍️",
        label: "One-click Upsell",
        headline: "Add this before you complete checkout",
        subtext: "Limited time offer — don't miss out",
        ctaLabel: "Add now",
        price: "Rs. 199",
    },
    automatic_discounts: {
        icon: "🏷️",
        label: "Auto Discount",
        headline: "10% off applied automatically",
        subtext: "Your discount has been added to this order",
        ctaLabel: "View savings",
        price: null,
    },
    downsell_funnel: {
        icon: "↘️",
        label: "Downsell",
        headline: "Prefer a lighter option?",
        subtext: "Here's a budget-friendly alternative",
        ctaLabel: "Choose this instead",
        price: "Rs. 99",
    },
    targeting_rules: {
        icon: "🎯",
        label: "Targeting Active",
        headline: "Smart targeting enabled",
        subtext: "Showing offer based on your location & cart",
        ctaLabel: "Review rules",
        price: null,
    },
    ab_testing: {
        icon: "🧪",
        label: "A/B Test",
        headline: "Experiment is active",
        subtext: "Variant A — comparing checkout experiences",
        ctaLabel: "View variants",
        price: null,
    },
    shipping_method_rules: {
        icon: "🚚",
        label: "Shipping Rules",
        headline: "Shipping-based logic active",
        subtext: "Offer shown for standard delivery orders",
        ctaLabel: "Review logic",
        price: null,
    },
    payment_method_rules: {
        icon: "💳",
        label: "Payment Rules",
        headline: "Payment-based logic active",
        subtext: "Showing offer for UPI & card payments",
        ctaLabel: "Review logic",
        price: null,
    },
    donations: {
        icon: "❤️",
        label: "Donation",
        headline: "Add a small donation",
        subtext: "Support a cause with your order",
        ctaLabel: "Donate ₹10",
        price: "Rs. 10",
    },
    testimonials_social_proof: {
        icon: "⭐",
        label: "Social Proof",
        headline: "Trusted by 10,000+ shoppers",
        subtext: "Rated 4.9/5 · Fast delivery · Easy returns",
        ctaLabel: "Learn more",
        price: null,
    },
    reward_bar_progress_bar: {
        icon: "📈",
        label: "Reward Bar",
        headline: "You're Rs. 50 away from free shipping!",
        subtext: "Add one more item to unlock your reward",
        ctaLabel: "Unlock reward",
        price: null,
    },
};

const DEFAULT_MOCK = {
    icon: "🧩",
    label: "Widget",
    headline: "Widget preview",
    subtext: "Configure this widget from the settings tab",
    ctaLabel: "Configure",
    price: null,
};

export function DefaultCheckoutPreview({ theme, widgetType }) {
    const mock = WIDGET_MOCK_DATA[widgetType] || DEFAULT_MOCK;

    const {
        widgetBackground = "#f5f5f0",
        cardBackground = "#ffffff",
        borderColor = "#e0e0e0",
        borderWidth = 1,
        borderRadius = 12,
        buttonVariant = "outline",
        buttonColor = "#262626",
        buttonRadius = 8,
        badgeColor = "#22c55e",
        titleColor = "#191919",
        titleSize = 13,
        priceColor = "#6b7280",
        showPrice = true,
        showBadge = true,
        title = mock.label,
    } = theme;

    const outerStyle = {
        background: widgetBackground,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: `${borderRadius}px`,
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    };

    const btnStyle = {
        fontSize: "11px",
        padding: "6px 14px",
        borderRadius: `${buttonRadius}px`,
        cursor: "pointer",
        fontWeight: 500,
        whiteSpace: "nowrap",
        border:
            buttonVariant === "plain"
                ? "none"
                : `${borderWidth}px solid ${buttonColor}`,
        background: buttonVariant === "filled" ? buttonColor : "transparent",
        color: buttonVariant === "filled" ? "#fff" : buttonColor,
    };

    // Special layout for reward bar
    const isRewardBar = widgetType === "reward_bar_progress_bar";
    const progressPct = 65;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {/* widget title */}
            <p
                style={{
                    fontSize: `${titleSize}px`,
                    color: titleColor,
                    fontWeight: 600,
                    textAlign: "center",
                    margin: "0 0 4px",
                }}
            >
                {title}
            </p>

            <div style={outerStyle}>
                {/* icon + headline row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <div
                        style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "8px",
                            background: cardBackground,
                            border: `${borderWidth}px solid ${borderColor}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "16px",
                            flexShrink: 0,
                        }}
                    >
                        {mock.icon}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
                        <span
                            style={{
                                fontSize: `${titleSize}px`,
                                fontWeight: 600,
                                color: titleColor,
                                lineHeight: 1.3,
                            }}
                        >
                            {mock.headline}
                        </span>
                        <span style={{ fontSize: "11px", color: priceColor, lineHeight: 1.4 }}>
                            {mock.subtext}
                        </span>
                    </div>
                </div>

                {/* reward bar special element */}
                {isRewardBar && (
                    <div
                        style={{
                            background: cardBackground,
                            border: `${borderWidth}px solid ${borderColor}`,
                            borderRadius: `${borderRadius}px`,
                            padding: "8px 10px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "11px",
                                color: priceColor,
                            }}
                        >
                            <span>Progress</span>
                            <span>{progressPct}%</span>
                        </div>
                        <div
                            style={{
                                height: "6px",
                                background: borderColor,
                                borderRadius: "99px",
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    width: `${progressPct}%`,
                                    height: "100%",
                                    background: buttonColor,
                                    borderRadius: "99px",
                                    transition: "width .3s ease",
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* testimonials special element */}
                {widgetType === "testimonials_social_proof" && (
                    <div
                        style={{
                            background: cardBackground,
                            border: `${borderWidth}px solid ${borderColor}`,
                            borderRadius: `${borderRadius}px`,
                            padding: "8px 10px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                        }}
                    >
                        <div style={{ display: "flex", gap: "2px" }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <span key={s} style={{ fontSize: "12px", color: badgeColor }}>
                                    ★
                                </span>
                            ))}
                        </div>
                        <span
                            style={{
                                fontSize: "11px",
                                color: titleColor,
                                fontStyle: "italic",
                                lineHeight: 1.4,
                            }}
                        >
                            "Absolutely love the quality. Fast shipping too!"
                        </span>
                        <span style={{ fontSize: "10px", color: priceColor }}>
                            — Priya S., verified buyer
                        </span>
                    </div>
                )}

                {/* donation amounts */}
                {widgetType === "donations" && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {["₹10", "₹20", "₹50"].map((amt, i) => (
                            <div
                                key={i}
                                style={{
                                    padding: "4px 12px",
                                    borderRadius: `${buttonRadius}px`,
                                    border: `${borderWidth}px solid ${i === 0 ? buttonColor : borderColor}`,
                                    background: i === 0 ? `${buttonColor}15` : cardBackground,
                                    fontSize: "12px",
                                    fontWeight: i === 0 ? 600 : 400,
                                    color: i === 0 ? buttonColor : priceColor,
                                    cursor: "pointer",
                                }}
                            >
                                {amt}
                            </div>
                        ))}
                    </div>
                )}

                {/* footer row */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        paddingTop: "2px",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {showPrice && mock.price && (
                            <span
                                style={{ fontSize: `${titleSize}px`, fontWeight: 600, color: titleColor }}
                            >
                                {mock.price}
                            </span>
                        )}
                        {showBadge && (
                            <span
                                style={{
                                    fontSize: "10px",
                                    padding: "1px 7px",
                                    borderRadius: "10px",
                                    background: `${badgeColor}22`,
                                    color: badgeColor,
                                    fontWeight: 500,
                                }}
                            >
                                Checkout offer
                            </span>
                        )}
                    </div>
                    <button style={btnStyle}>{mock.ctaLabel}</button>
                </div>
            </div>
        </div>
    );
}