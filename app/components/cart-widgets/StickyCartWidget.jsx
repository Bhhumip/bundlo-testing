import { WidgetCustomizeForm } from "../shared/CustomizeFormWidgets/WidgetCustomizeForm";
import { useFetcher } from "react-router";

export function StickyCartWidget({ definition }) {
  const fetcher = useFetcher();

  function handleSave(theme) {
    const formData = new FormData();
    formData.append("intent", "save-widget-theme");
    formData.append("widgetKey", definition.key);
    formData.append("theme", JSON.stringify(theme));
    fetcher.submit(formData, { method: "post" });
  }

  const isSaving = fetcher.state === "submitting";

  return (
    <WidgetCustomizeForm
      key={definition.key}
      widgetType="sticky_cart"
      initialTheme={definition.savedTheme || null}
      mode="storefront"
      onSave={handleSave}
      isSaving={isSaving}
    />
  );
}
