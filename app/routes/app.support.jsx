import { BackArrow } from "../components/NavArrows.jsx";
import { ToolsSection } from "../components/bundle-form/ToolsSection.jsx";
import { HelpCenter } from "../components/HelpCenter.jsx";
import { SupportFAQ } from "../components/SupportFAQ.jsx";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
    await authenticate.admin(request);
    return {};
};

export default function Support() {
    return (
        <s-page>
            <s-stack direction="inline" gap="loose" align="center" slot="nav">
                <BackArrow />
            </s-stack>

            <div style={{ marginBlockStart: "10px" }}></div>

            <HelpCenter hasAccess={true} />

            <div style={{ marginBlockStart: "24px" }} />

            <ToolsSection hasAccess={true} />

            <div style={{ marginBlockStart: "24px" }} />

            <s-section>
                <SupportFAQ />
            </s-section>
        </s-page>
    );
}
