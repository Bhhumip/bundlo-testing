import { WidgetCustomizeForm } from "../shared/CustomizeFormWidgets/WidgetCustomizeForm";
import { useFetcher } from "react-router";
import { SaveStatusBanner } from "./SaveStatusBanner";

export function AnnouncementBarInCartWidget({ definition }) {
  const fetcher = useFetcher();

  function handleSave(theme) {
    const formData = new FormData();
    formData.append("intent", "save-widget-theme");
    formData.append("widgetKey", definition.key);
    formData.append("theme", JSON.stringify(theme));
    fetcher.submit(formData, { method: "post" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <SaveStatusBanner fetcher={fetcher} />
      <WidgetCustomizeForm
        key={definition.key}
        widgetType="announcement_bar_in_cart"
        initialTheme={definition.savedTheme || null}
        mode="storefront"
        onSave={handleSave}
        isSaving={fetcher.state === "submitting"}
      />
    </div>
  );
}