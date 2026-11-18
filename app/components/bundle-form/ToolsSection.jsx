import { useNavigate } from "react-router";

export function ToolsSection({ hasAccess }) {
    const navigate = useNavigate();

    const tools = [
        {
            icon: "\uD83D\uDCCA",
            title: "Website Analyzer",
            description:
                "Analyze your website's performance and optimize for better results.",
            href: "https://speed.propero.in/analyzer",
        },
        {
            icon: "\uD83E\uDD16",
            title: "AI Chatbot for Shopify",
            description:
                "Enhance customer interaction with an AI-powered chatbot.",
            href: "https://shopibot.azurewebsites.net/",
        },
        {
            icon: "\uD83D\uDCF1",
            title: "Web To App Converter",
            description:
                "Get your Shopify app ready for Play Store and App Store in seconds.",
            href: "https://speed.propero.in/webapp",
        },
        {
            icon: "\u2699\uFE0F",
            title: "Shopify Utils",
            description:
                "Access a range of utilities to enhance your Shopify store.",
            href: "https://speed.propero.in/utils",
        },
        {
            icon: "\u2139\uFE0F",
            title: "Shopify Status",
            description:
                "Monitor the real-time status of your Shopify store.",
            href: "https://speed.propero.in/status",
        },
        {
            icon: "\uD83C\uDFA8",
            title: "Shopify Theme Converter",
            description:
                "Easily convert your Shopify themes for a new look.",
            href: "https://speed.propero.in/theme-converter",
        },
        {
            icon: "\uD83D\uDCC8",
            title: "CRO Tool",
            description:
                "Perform Conversion Rate Optimization (CRO) for your website in less than a minute.",
            href: "https://speed.propero.in/cro",
        },
    ];

    return (
        <s-section
            heading="Explore Our Tools"
            style={{
                marginTop: "24px",
                padding: "24px",
                fontSize: "24px",
            }}
        >
            <s-paragraph tone="subdued">
                Discover the tools that can transform your Shopify store.
            </s-paragraph>

            <div
                style={{
                    position: "relative",
                    marginTop: "16px",
                    overflow: "visible",
                    borderRadius: "12px",
                }}
            >
                {/* Tools content */}
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
                    {tools.map((tool) => (
                        <div
                            key={tool.title}
                            style={{
                                background: "#ffffff",
                                border: "1px solid #030303",
                                borderRadius: "12px",
                                padding: "24px 20px",
                                cursor: hasAccess ? "pointer" : "default",
                                transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                textAlign: "center",
                                minHeight: "250px",
                            }}
                            onMouseEnter={(event) => {
                                if (hasAccess) {
                                    event.currentTarget.style.transform = "translateY(-2px)";
                                    event.currentTarget.style.boxShadow =
                                        "0 10px 26px rgba(15, 23, 42, 0.11)";
                                    event.currentTarget.style.borderColor = "#030303";
                                }
                            }}
                            onMouseLeave={(event) => {
                                event.currentTarget.style.transform = "translateY(0)";
                                event.currentTarget.style.boxShadow =
                                    "0 1px 2px rgba(15, 23, 42, 0.04)";
                                event.currentTarget.style.borderColor = "#030303";
                            }}
                            onClick={() => {
                                if (hasAccess) {
                                    window.open(tool.href, "_blank");
                                }
                            }}
                        >
                            <div
                                style={{
                                    width: "56px",
                                    height: "56px",
                                    borderRadius: "50%",
                                    background: "#FEF3E2",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "26px",
                                    marginBottom: "16px",
                                }}
                            >
                                {tool.icon}
                            </div>

                            <s-text
                                fontWeight="bold"
                                style={{
                                    color: "#E67E22",
                                    display: "block",
                                    marginBottom: "8px",
                                    fontSize: "14px",
                                }}
                            >
                                {tool.title}
                            </s-text>

                            <s-paragraph tone="subdued">
                                {tool.description}
                            </s-paragraph>


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
                            Explore Our Tools is available on the Growth plan
                            and above. Upgrade your plan to access these tools.
                        </s-text>

                        <s-button
                            variant="primary"
                            style={{ marginTop: "16px" }}
                            onClick={() => {
                                navigate("/app/billing");
                            }}
                        >
                            Upgrade to Growth
                        </s-button>
                    </div>
                )}
            </div>
        </s-section>
    );
}

















