import { DEFAULT_THEME } from "../config/theme.js";

export function LoadingSkeleton({ theme = DEFAULT_THEME }) {
    return (
        <s-stack gap="base">
            <s-grid gridTemplateColumns="1fr auto 1fr" gap="small" alignItems="center">
                <s-divider />
                <s-text>✨ Loading...</s-text>
                <s-divider />
            </s-grid>
            <s-box
                background={theme.widgetBackground}
                border={theme.widgetBorder}
                borderRadius={theme.borderRadius}
                padding="base"
            >
                <s-stack gap="small">
                    <s-box background={theme.cardBackground} border={theme.cardBorder} borderRadius={theme.borderRadius} padding="base">
                        <s-skeleton-paragraph />
                    </s-box>
                    <s-box background={theme.cardBackground} border={theme.cardBorder} borderRadius={theme.borderRadius} padding="base">
                        <s-skeleton-paragraph />
                    </s-box>
                </s-stack>
            </s-box>
        </s-stack>
    );
}