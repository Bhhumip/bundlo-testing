import { useFetcher } from "react-router";
import { useState } from "react";
import { WidgetCustomizeForm } from "../shared/CustomizeFormWidgets/WidgetCustomizeForm";

export function TestimonialsWidget({ shop, definition }) {
  const [testimonials, setTestimonials] = useState([
    "Loved by thousands of customers",
    "Rated 4.9/5",
    "Fast and reliable delivery"
  ]);

  const fetcher = useFetcher();

  // Save to the current Customize widget route (funnel-free)
  const catalogActionPath = `/app/Customize/${definition.key.replace(/_/g, "-")}?surface=CHECKOUT`;

  function handleSave(theme) {
    const formData = new FormData();
    formData.append("intent", "save-widget-theme");
    formData.append("widgetKey", definition.key); // "testimonials_social_proof"
    formData.append("theme", JSON.stringify(theme));
    fetcher.submit(formData, { method: "post", action: catalogActionPath });
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
        widgetType="testimonials_social_proof"
        initialTheme={definition.savedTheme || null}
        mode="checkout"
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}

