import { useLoaderData } from "react-router";
import { BackArrow } from "../components/NavArrows.jsx";
import { ToolsSection } from "../components/bundle-form/ToolsSection.jsx";
import { HelpCenter } from "../components/HelpCenter.jsx";
import { SupportFAQ } from "../components/SupportFAQ.jsx";
import { authenticate } from "../shopify.server";
import { canShopAccessFeature } from "../featureAccess.server";

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);

    const hasBasicSupport = await canShopAccessFeature(
        session.shop,
        "BASIC_SUPPORT"
    );

    const hasPrioritySupport = await canShopAccessFeature(
        session.shop,
        "PRIORITY_SUPPORT"
    );

    return {
        hasBasicSupport,
        hasPrioritySupport,
    };
};

export default function Support() {
    const { hasBasicSupport, hasPrioritySupport } = useLoaderData();

    return (
        <s-page>
            <s-stack direction="inline" gap="loose" align="center" slot="nav">
                <BackArrow />
            </s-stack>

            <div style={{ marginBlockStart: "10px" }}></div>

            <HelpCenter hasAccess={hasBasicSupport} />

            <div style={{ marginBlockStart: "24px" }} />

            <ToolsSection hasAccess={hasPrioritySupport} />

            <div style={{ marginBlockStart: "24px" }} />

            <s-section>
                <SupportFAQ />
            </s-section>
        </s-page>
    );
}
