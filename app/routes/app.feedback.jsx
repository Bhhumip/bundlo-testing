
import { BackArrow } from "../components/NavArrows.jsx";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { canShopAccessFeature } from "../featureAccess.server";

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);

    const hasBasicSupport = await canShopAccessFeature(
        session.shop,
        "BASIC_SUPPORT"
    );

    if (!hasBasicSupport) {
        return redirect("/app/support");
    }

    return null;
};
export default function FeedbackPage() {
    return (
        <s-page heading="Feature Requests">
            <div
                slot="nav"
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    width: "100%",
                }}
            >
                <BackArrow />
            </div>

            <s-section>
                <div
                    style={{
                        maxWidth: "1200px",
                        margin: "0 auto",
                        padding: "8px 0",
                    }}
                >
                    {/* Single boundary */}
                    <div
                        style={{
                            background: "#ffffff",
                            border: "1px solid #e1e3e5",
                            borderRadius: "12px",
                            padding: "44px 24px",
                            textAlign: "center",
                        }}
                    >
                        <div style={{ marginBottom: "16px" }}>
                            <span
                                style={{
                                    display: "inline-block",
                                    background: "#ffdbac",
                                    color: "#633c00",
                                    padding: "4px 10px",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                }}
                            >
                                Coming soon
                            </span>
                        </div>

                        <s-text tone="subdued">
                            Have an idea to improve Bundlo? Soon, you'll be able to share
                            your suggestions and ideas with the Bundlo Team.
                        </s-text>
                    </div>
                </div>
            </s-section>
        </s-page>
    );
}
