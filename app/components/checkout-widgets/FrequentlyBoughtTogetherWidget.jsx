// FrequentlyBoughtTogetherWidget.jsx
import { WidgetCustomizeForm } from "../shared/CustomizeFormWidgets/WidgetCustomizeForm";
import { useFetcher } from "react-router";
export function FrequentlyBoughtTogetherWidget({ shop, definition }) {
    const fetcher = useFetcher();
    // Save to the current Customize widget route's own action (no funnel needed)
    function handleSave(theme) {
    const formData = new FormData();
    formData.append("intent", "save-widget-theme");
    formData.append("widgetKey", definition.key);
    formData.append("theme", JSON.stringify(theme));
    fetcher.submit(formData, { method: "post" });
}

    const isSaving = fetcher.state === "submitting";
    const savedOk = fetcher.state === "idle" && fetcher.data?.ok === true;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {savedOk && (
                <div style={{
                    padding: "8px 12px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#16a34a",
                }}>
                    ✓ Theme saved successfully
                </div>
            )}
            <WidgetCustomizeForm
                key={definition.key}
                widgetType="fbt"
                initialTheme={definition.savedTheme || null}
                mode="checkout"
                onSave={handleSave}
                isSaving={isSaving}
            />
        </div>
    );
}
