import { WidgetCustomizeForm } from "../shared/CustomizeFormWidgets/WidgetCustomizeForm";
import { useFetcher } from "react-router";

export function AiRecommendationsInCartWidget({ definition }) {
  const fetcher = useFetcher();

  function handleSave(theme) {
    const formData = new FormData();
    formData.append("intent", "save-widget-theme");
    formData.append("widgetKey", definition.key);
    formData.append("theme", JSON.stringify(theme));
    fetcher.submit(formData, { method: "post" });
  }

  return (
    <WidgetCustomizeForm
      key={definition.key}
      widgetType="ai_recommendations_in_cart"
      initialTheme={definition.savedTheme || null}
      mode="storefront"
      onSave={handleSave}
      isSaving={fetcher.state === "submitting"}
    />
  );
}
