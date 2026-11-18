import { useNavigate } from "react-router";

export function HelpCenter({ hasAccess }) {
    const navigate = useNavigate();

    const supportOptions = [
        {
            title: "Shopify Sidekick",
            description:
                "Use Shopify Sidekick to search your Bundlo data and get AI-powered help with your store.",
        },
        {
            title: "Feature requests",
            description:
                "Have an idea that could make Bundlo better? Share your suggestions with us and help shape future features.",
        },
        {
            title: "Email support",
            description:
                "For any query or support, email us at support@properoapps.in.",
        },
    ];

    return (
        <s-section heading="Help center">
            <div
                style={{
                    position: "relative",
                    marginTop: "16px",
                    overflow: "visible",
                    borderRadius: "12px",
                }}
            >
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "16px",
                        filter: hasAccess ? "none" : "blur(1.2px)",
                        opacity: hasAccess ? 1 : 0.72,
                        pointerEvents: hasAccess ? "auto" : "none",
                    }}
                >
                    {supportOptions.map((option) => (
                        <div
                            key={option.title}
                            style={{
                                background: "#ffffff",
                                border: "1px solid #030303",
                                borderRadius: "12px",
                                padding: "24px 20px",
                                transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                                minHeight: "180px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                            }}
                            onMouseEnter={(event) => {
                                event.currentTarget.style.transform = "translateY(-2px)";
                                event.currentTarget.style.boxShadow = "0 10px 26px rgba(15, 23, 42, 0.11)";
                                event.currentTarget.style.borderColor = "#030303";
                            }}
                            onMouseLeave={(event) => {
                                event.currentTarget.style.transform = "translateY(0)";
                                event.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
                                event.currentTarget.style.borderColor = "#030303";
                            }}
                            >
                            <s-stack gap="small-100">
                                <s-heading size="small">
                                    {option.title}
                                </s-heading>

                                <s-text tone="subdued">
                                    {option.description}
                                </s-text>
                            </s-stack>

                            <div style={{ marginTop: "16px" }}>

                                {option.title === "Feature requests" && (
                                    <s-button
                                        variant="secondary"
                                        onClick={() => navigate("/app/feedback")}
                                    >
                                        Send request
                                    </s-button>
                                )}

                                {option.title === "Email support" && (
                                    <s-button
                                        variant="secondary"
                                        onClick={() => navigate("/app/email-support")}
                                    >
                                        Contact Support
                                    </s-button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {!hasAccess && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            padding: "20px 16px 4px",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "34px",
                                lineHeight: 1,
                                marginBottom: "14px",
                            }}
                        >
                            {"\uD83D\uDD12"}
                        </div>

                        <s-heading size="small">
                            This feature is locked
                        </s-heading>

                        <s-text
                            tone="subdued"
                            style={{
                                marginTop: "8px",
                                maxWidth: "420px",
                            }}
                        >
                            Help Center is available on the Starter plan and
                            above. Upgrade your plan to access support options.
                        </s-text>

                        <s-button
                            variant="primary"
                            style={{ marginTop: "16px" }}
                            onClick={() => {
                                navigate("/app/billing");
                            }}
                        >
                            Upgrade to Starter
                        </s-button>
                    </div>
                )}
            </div>
        </s-section>
    );
}

