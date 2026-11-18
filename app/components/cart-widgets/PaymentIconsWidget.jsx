import { WidgetCustomizeForm } from "../shared/CustomizeFormWidgets/WidgetCustomizeForm";
import { useFetcher } from "react-router";

export function PaymentIconsWidget({ definition }) {
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
      widgetType="payment_icons"
      initialTheme={definition.savedTheme || null}
      mode="storefront"
      onSave={handleSave}
      isSaving={fetcher.state === "submitting"}
    />
  );
}
