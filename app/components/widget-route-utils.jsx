import { useNavigate } from "react-router";
import { GenericWidgetManagePage } from "./checkout-widgets/GenericWidgetManagePage";

// ─── Widgets list for the "jump to another widget" dropdown  ──────────
const WIDGET_NAV_OPTIONS = [
  { key: "one_click_upsell_at_checkout", label: "One-click Upsell at Checkout" },
  { key: "automatic_discounts", label: "Automatic Discounts" },
  { key: "downsell_funnel", label: "Downsell Funnel" },
  { key: "targeting_rules", label: "Targeting Rules" },
  { key: "ab_testing", label: "A/B Testing" },
  { key: "shipping_method_rules", label: "Shipping Method Rules" },
  { key: "payment_method_rules", label: "Payment Method Rules" },
  { key: "donations", label: "Donations" },
  { key: "testimonials_social_proof", label: "Testimonials / Social Proof" },
  { key: "reward_bar_progress_bar", label: "Reward Bar / Progress Bar" },
  { key: "free_shipping_progress_bar", label: "Free Shipping Progress Bar" },
  { key: "frequently_bought_together", label: "Frequently Bought Together" },
  { key: "customer_personalized_recommendation", label: "Customer Personalized Recommendation" },
  { key: "order_notes", label: "Order Notes" },
];

const widgetKeyToSlug = (key) => key.replace(/_/g, "-");

// Small dropdown that lets the merchant jump to another widget's Manage page.
function WidgetNavDropdown({ currentWidgetKey, navigate }) {
  function handleWidgetNav(nextKey) {
    if (!nextKey || nextKey === currentWidgetKey) return;
    navigate(`/app/Customize/${widgetKeyToSlug(nextKey)}`);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 0",
      }}
    >
      <span style={{ fontSize: "12px", color: "#6b7280", whiteSpace: "nowrap" }}>
        Go to widget
      </span>
      <select
        value={currentWidgetKey || ""}
        onChange={(e) => handleWidgetNav(e.target.value)}
        style={{
          fontSize: "12px",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #d1d5db",
          background: "#fff",
          color: "#111827",
          cursor: "pointer",
          maxWidth: "260px",
        }}
      >
        {!currentWidgetKey && <option value="">Select a widget…</option>}
        {WIDGET_NAV_OPTIONS.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function WidgetManagePage({
  shop,
  definition,
  WidgetComponent,
  backPath,
  surfaceName,
  backLabel,
}) {
  const navigate = useNavigate();

  if (WidgetComponent) {
    return (
      <s-page heading={`Manage ${definition.title}`}>
        <s-button
          slot="secondary-actions"
          variant="secondary"
          onClick={() => navigate(backPath)}
        >
          {backLabel || `Back to ${surfaceName.toLowerCase()} widgets`}
        </s-button>

        {/* Jump-to-another-widget dropdown — only on Checkout */}
        {surfaceName === "Checkout" && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <WidgetNavDropdown
              currentWidgetKey={definition.key}
              navigate={navigate}
            />
          </div>
        )}
        <WidgetComponent shop={shop} definition={definition} />
      </s-page>
    );
  }
  return (
    <GenericWidgetManagePage
      shop={shop}
      definition={definition}
      backPath={backPath}
      surfaceName={surfaceName}
    />
  );
}