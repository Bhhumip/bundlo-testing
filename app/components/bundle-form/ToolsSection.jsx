export function ToolsSection() {
    const tools = [
        {
            icon: "\uD83D\uDCC8",
            title: "Website Analyzer",
            description: "Analyze your website's performance and optimize for better results.",
            href: "https://speed.propero.in/analyzer",
        },
        {
            icon: "\uD83D\uDCF1",
            title: "Web to App",
            description: "Convert your website into professional iOS and Android apps.",
            href: "https://speed.propero.in/webapp",
        },
        {
            icon: "\uD83D\uDCCA",
            title: "Fractional Quantity",
            description: "Enable customers to purchase products in fractional quantities such as 1.25 meters or 0.5 kg.",
            href: "https://propero.in/pages/fractional-quantity",
        },
        {
            icon: "\uD83E\uDD16",
            title: "Agentic Commerce Readiness",
            description: "Check your Shopify store's readiness for agentic commerce.",
            href: "https://geo.properoapps.in",
        },
        {
            icon: "\uD83C\uDFA8",
            title: "PicAmaze",
            description: "Animate product images and create engaging visual effects for your store.",
            href: "https://apps.shopify.com/picamaze",
        },
        {
            icon: "\uD83D\uDD04",
            title: "Theme Converter to 2.0",
            description: "Convert your vintage Shopify theme to Online Store 2.0.",
            href: "https://speed.propero.in/theme-converter",
        },
        {
            icon: "\u2139\uFE0F",
            title: "Shopify Status",
            description: "Get real-time Shopify status updates and outage alerts.",
            href: "https://speed.propero.in/status",
        },
    ];

    return (
        <s-section heading="Explore Our Tools" style={{ marginTop: "24px", padding: "24px", fontSize: "24px" }}>
            <s-paragraph tone="subdued">
                Discover the tools that can transform your Shopify store.
            </s-paragraph>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "16px" }}>
                {tools.map((tool) => (
                    <div
                        key={tool.title}
                        role="link"
                        tabIndex={0}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                window.open(tool.href, "_blank");
                            }
                        }}
                        style={{
                            background: "#ffffff",
                            border: "1px solid #030303",
                            borderRadius: "12px",
                            padding: "24px 20px",
                            cursor: "pointer",
                            transition: "transform 0.18s ease, box-shadow 0.18s ease",
                            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            textAlign: "center",
                            minHeight: "250px",
                        }}
                        onMouseEnter={(event) => {
                            event.currentTarget.style.transform = "translateY(-2px)";
                            event.currentTarget.style.boxShadow = "0 10px 26px rgba(15,23, 42, 0.11)";
                        }}
                        onMouseLeave={(event) => {
                            event.currentTarget.style.transform = "translateY(0)";
                            event.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
                        }}
                        onClick={() => window.open(tool.href, "_blank")}
                    >
                        <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#FEF3E2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", marginBottom: "16px" }}>
                            {tool.icon}
                        </div>
                        <s-text fontWeight="bold" style={{ color: "#E67E22", display: "block", marginBottom: "8px", fontSize: "14px" }}>
                            {tool.title}
                        </s-text>
                        <s-paragraph tone="subdued">{tool.description}</s-paragraph>
                    </div>
                ))}
            </div>
        </s-section>
    );
}



