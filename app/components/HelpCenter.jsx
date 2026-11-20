import { useNavigate } from "react-router";

export function HelpCenter() {
    const navigate = useNavigate();

    const supportOptions = [
        {
            title: "Shopify Sidekick",
            description: "Use Shopify Sidekick to search your Bundlo data and get AI-powered help with your store.",
        },
        {
            title: "Feature requests",
            description: "Have an idea that could make Bundlo better? Share your suggestions with us and help shape future features.",
        },
        {
            title: "Email support",
            description: "For any query or support, email us at support@properoapps.in.",
        },
    ];

    return (
        <s-section heading="Help center">
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
                marginTop: "16px",
            }}>
                {supportOptions.map((option) => (
                    <div
                        key={option.title}
                        style={{
                            background: "#ffffff",
                            border: "1px solid #030303",
                            borderRadius: "12px",
                            padding: "24px 20px",
                            transition: "transform 0.18s ease, box-shadow 0.18s ease",
                            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                            minHeight: "180px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                        }}
                        onMouseEnter={(event) => {
                            event.currentTarget.style.transform = "translateY(-2px)";
                            event.currentTarget.style.boxShadow = "0 10px 26px rgba(15, 23, 42, 0.11)";
                        }}
                        onMouseLeave={(event) => {
                            event.currentTarget.style.transform = "translateY(0)";
                            event.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
                        }}
                    >
                        <s-stack gap="small-100">
                            <s-heading size="small">{option.title}</s-heading>
                            <s-text tone="subdued">{option.description}</s-text>
                        </s-stack>

                        <div style={{ marginTop: "16px" }}>
                            {option.title === "Feature requests" && (
                                <s-button variant="secondary" onClick={() => navigate("/app/feedback")}>
                                    Send request
                                </s-button>
                            )}
                            {option.title === "Email support" && (
                                <s-button variant="secondary" onClick={() => navigate("/app/email-support")}>
                                    Contact Support
                                </s-button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </s-section>
    );
}
