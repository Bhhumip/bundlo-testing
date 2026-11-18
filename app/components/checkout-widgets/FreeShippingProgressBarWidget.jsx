import { useMemo, useState } from "react";
import { useFetcher } from "react-router";

const DEFAULT_THEME = {
  enabled: true,
  threshold: 100,
  title: "Free shipping progress",
  progressMessage: "Spend {amount} more to unlock free shipping",
  unlockedMessage: "Free shipping unlocked!",
  showAmount: true,
  showThreshold: true,
  appearance: {
    animation: "smooth",
    filledColor: "#111827",
    emptyColor: "#D1D5DB",
    showMilestones: true,
    compactMode: false,
  },
  labels: {
    beforeGoal: "Add {amount} to unlock free shipping",
    progress: "{current} of {goal} completed",
    afterGoal: "Free shipping unlocked!",
    footer: "Increase your order value to unlock free shipping.",
  },
  placement: {
    showInCheckout: true,
  },
};

function normalizeTheme(savedTheme = {}) {
  return {
    ...DEFAULT_THEME,
    ...savedTheme,
    threshold: Math.max(0, Number(savedTheme.threshold ?? DEFAULT_THEME.threshold)),
    appearance: {
      ...DEFAULT_THEME.appearance,
      ...(savedTheme.appearance || {}),
    },
    labels: {
      ...DEFAULT_THEME.labels,
      ...(savedTheme.labels || {}),
    },
    placement: {
      ...DEFAULT_THEME.placement,
      ...(savedTheme.placement || {}),
    },
  };
}

function hexToRgb(hex) {
  const value = String(hex || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return "17, 24, 39";
  }

  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ].join(", ");
}

export function FreeShippingProgressBarWidget({ shop, definition }) {
  const fetcher = useFetcher();

  const [theme, setTheme] = useState(() =>
    normalizeTheme(definition.savedTheme || {}),
  );
  const [activeTab, setActiveTab] = useState("style");
  const [previewAmount, setPreviewAmount] = useState(75);
  const [mobilePreview, setMobilePreview] = useState(false);

  const update = (key, value) => {
    setTheme((previous) => ({ ...previous, [key]: value }));
  };

  const updateAppearance = (key, value) => {
    setTheme((previous) => ({
      ...previous,
      appearance: { ...previous.appearance, [key]: value },
    }));
  };

  const updateLabel = (key, value) => {
    setTheme((previous) => ({
      ...previous,
      labels: { ...previous.labels, [key]: value },
    }));
  };

  const updatePlacement = (key, value) => {
    setTheme((previous) => ({
      ...previous,
      placement: { ...previous.placement, [key]: value },
    }));
  };

  const threshold = Number(theme.threshold) || 0;
  const progress = threshold > 0
    ? Math.min((previewAmount / threshold) * 100, 100)
    : 100;
  const remaining = Math.max(threshold - previewAmount, 0);
  const unlocked = remaining === 0;

  const previewMessage = useMemo(() => {
    const template = unlocked
      ? theme.unlockedMessage
      : theme.progressMessage;

    return String(template || "")
      .replaceAll("{amount}", "$" + remaining.toFixed(2))
      .replaceAll("{current}", "$" + previewAmount.toFixed(2))
      .replaceAll("{goal}", "$" + threshold.toFixed(2));
  }, [
    theme.progressMessage,
    theme.unlockedMessage,
    previewAmount,
    threshold,
    remaining,
    unlocked,
  ]);

  const handleSave = () => {
    fetcher.submit(
      {
        intent: "save-widget-theme",
        theme: JSON.stringify(theme),
      },
      { method: "post" },
    );
  };

  const saving = fetcher.state !== "idle";
  const saved = fetcher.data?.ok === true;

  const tabs = [
    { id: "style", label: "Style" },
    { id: "layout", label: "Layout" },
    { id: "text", label: "Text" },
    { id: "position", label: "Position" },
  ];

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #c9cccf",
    borderRadius: "8px",
    fontSize: "14px",
    background: "#fff",
    color: "#202223",
  };

  const fieldStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginBottom: "18px",
  };

  const labelStyle = {
    fontSize: "13px",
    fontWeight: 600,
    color: "#303030",
  };

  const panelStyle = {
    border: "1px solid #e1e3e5",
    borderRadius: "12px",
    background: "#fff",
    padding: "16px",
  };

  const checkboxField = (label, checked, onChange, description) => (
    <label
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "flex-start",
        cursor: "pointer",
        marginBottom: "16px",
      }}
    >
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        style={{ marginTop: "3px" }}
      />
      <span>
        <span style={{ display: "block", fontSize: "14px", fontWeight: 500 }}>
          {label}
        </span>
        {description && (
          <span style={{ display: "block", color: "#6d7175", fontSize: "12px", marginTop: "3px" }}>
            {description}
          </span>
        )}
      </span>
    </label>
  );

  const field = (label, value, onChange, options = {}) => (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      {options.multiline ? (
        <textarea
          value={value ?? ""}
          rows={options.rows || 3}
          placeholder={options.placeholder || ""}
          onChange={(event) => onChange(event.target.value)}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      ) : options.select ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={inputStyle}
        >
          {options.select.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={options.type || "text"}
          min={options.min}
          step={options.step}
          value={value ?? ""}
          placeholder={options.placeholder || ""}
          onChange={(event) =>
            onChange(
              options.type === "number"
                ? Math.max(0, Number(event.target.value) || 0)
                : event.target.value,
            )
          }
          style={inputStyle}
        />
      )}
      {options.help && (
        <span style={{ fontSize: "12px", color: "#6d7175" }}>
          {options.help}
        </span>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", color: "#202223" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "25px", margin: "0 0 8px", fontWeight: 650 }}>
            {definition.title || "Free Shipping Progress Bar"}
          </h1>
        </div>
      </div>

      {saved && (
        <div
          role="status"
          style={{
            padding: "12px 16px",
            marginBottom: "20px",
            background: "#eaf7ed",
            border: "1px solid #a8d8b2",
            borderRadius: "8px",
            color: "#176c32",
          }}
        >
          Checkout progress bar settings saved.
        </div>
      )}

      {fetcher.data?.ok === false && (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            marginBottom: "20px",
            background: "#fff0f0",
            border: "1px solid #e8b5b5",
            borderRadius: "8px",
            color: "#a61b1b",
          }}
        >
          {fetcher.data.error || "Unable to save settings. Please try again."}
        </div>
      )}

     
        <div
          className="checkout-progress-editor-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 36%) minmax(0, 64%)",
            gap: 0,
            alignItems: "stretch",
            border: "1px solid #e1e3e5",
            borderRadius: "14px",
            overflow: "hidden",
            background: "#fff",
            minHeight: "auto",
          }}
        >
        <section
          style={{
            minWidth: 0,
            padding: "20px 16px",
            background: "#fff",
            borderRight: "1px solid #e1e3e5",
          }}
        >
          <div
            role="tablist"
            aria-label="Checkout progress bar settings"
            style={{
              display: "flex",
              gap: "6px",
              borderBottom: "1px solid #e1e3e5",
              marginBottom: "24px",
              overflowX: "auto",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "12px 15px",
                  whiteSpace: "nowrap",
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === tab.id
                    ? "3px solid #303030"
                    : "3px solid transparent",
                  color: activeTab === tab.id ? "#202223" : "#6d7175",
                  fontWeight: activeTab === tab.id ? 650 : 500,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "style" && (
            <div>
              {checkboxField(
                "Enable progress bar",
                theme.enabled,
                (value) => update("enabled", value),
                "Turn the checkout progress bar on or off.",
              )}

              {field(
                "Progress bar animation",
                theme.appearance.animation,
                (value) => updateAppearance("animation", value),
                {
                  select: [
                    { label: "Smooth", value: "smooth" },
                    { label: "Stripe", value: "stripe" },
                    { label: "Pulse", value: "pulse" },
                  ],
                },
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "16px",
                }}
              >
                {field(
                  "Progress color",
                  theme.appearance.filledColor,
                  (value) => updateAppearance("filledColor", value),
                  { type: "color" },
                )}
                {field(
                  "Track color",
                  theme.appearance.emptyColor,
                  (value) => updateAppearance("emptyColor", value),
                  { type: "color" },
                )}
              </div>

              {checkboxField(
                "Show milestone indicators",
                theme.appearance.showMilestones,
                (value) => updateAppearance("showMilestones", value),
              )}
              {checkboxField(
                "Compact mode",
                theme.appearance.compactMode,
                (value) => updateAppearance("compactMode", value),
                "Use less vertical space for the progress bar.",
              )}
            </div>
          )}

          {activeTab === "layout" && (
            <div>
              {field("Free shipping threshold", theme.threshold, (value) => update("threshold", value), {
                type: "number",
                min: 0,
                step: 0.01,
                help: "Preview threshold only. The actual checkout progress still depends on the checkout tier data.",
              })}

              {checkboxField(
                "Show remaining amount",
                theme.showAmount,
                (value) => update("showAmount", value),
              )}

              {checkboxField(
                "Show threshold labels",
                theme.showThreshold,
                (value) => update("showThreshold", value),
              )}

              {field(
                "Preview order subtotal",
                previewAmount,
                setPreviewAmount,
                { type: "number", min: 0, step: 1 },
              )}
            </div>
          )}

          {activeTab === "text" && (
            <div>
              {field("Progress bar title", theme.title, (value) => update("title", value))}

              {field(
                "Progress message",
                theme.progressMessage,
                (value) => update("progressMessage", value),
                {
                  multiline: true,
                  help: "Use {amount} to display the amount remaining.",
                },
              )}

              {field(
                "Unlocked message",
                theme.unlockedMessage,
                (value) => update("unlockedMessage", value),
              )}

              <hr style={{ border: 0, borderTop: "1px solid #e1e3e5", margin: "24px 0" }} />

              {field(
                "Before-goal message",
                theme.labels.beforeGoal,
                (value) => updateLabel("beforeGoal", value),
              )}

              {field(
                "Progress label",
                theme.labels.progress,
                (value) => updateLabel("progress", value),
              )}

              {field(
                "After-goal message",
                theme.labels.afterGoal,
                (value) => updateLabel("afterGoal", value),
              )}

              {field(
                "Footer message",
                theme.labels.footer,
                (value) => updateLabel("footer", value),
                { multiline: true },
              )}
            </div>
          )}

          {activeTab === "position" && (
            <div>
              {checkboxField(
                "Show on checkout",
                theme.placement.showInCheckout,
                (value) => updatePlacement("showInCheckout", value),
                "Controls the saved preference.",
              )}
            </div>
          )}
        </section>

      
      <aside
        style={{
          minWidth: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f3f4f6",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            background: "#fafafa",
            borderBottom: "1px solid #e1e3e5",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "#8c9196",
            }}
          >
            LIVE PREVIEW (CHECKOUT)
          </span>

          <div style={{ display: "flex", gap: "6px" }}>
            {["Desktop", "Mobile"].map((view) => {
              const isMobile = view === "Mobile";

              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => setMobilePreview(isMobile)}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "7px",
                    background:
                      mobilePreview === isMobile ? "#e5e7eb" : "transparent",
                    color: mobilePreview === isMobile ? "#111827" : "#6b7280",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {view}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: mobilePreview ? "375px" : "100%",
              minWidth: 0,
              background: "#fff",
              border: "1px solid #e1e3e5",
              borderRadius: "14px",
              padding: theme.appearance.compactMode ? "12px" : "16px",
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ fontSize: "16px", margin: "0 0 12px" }}>
              {theme.title}
            </h3>

            <p style={{ fontSize: "13px", color: "#6d7175", margin: "0 0 20px" }}>
              {previewMessage}
            </p>

            {theme.enabled ? (
              <>
                {theme.showThreshold && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      marginBottom: "8px",
                      fontSize: "12px",
                    }}
                  >
                    <span>${previewAmount.toFixed(2)}</span>
                    <span>${threshold.toFixed(2)}</span>
                  </div>
                )}

                <div
                  style={{
                    height: "10px",
                    overflow: "hidden",
                    borderRadius: "999px",
                    background: theme.appearance.emptyColor,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      borderRadius: "999px",
                      background: theme.appearance.filledColor,
                      transition:
                        theme.appearance.animation === "smooth"
                          ? "width 300ms ease"
                          : "none",
                      animation:
                        theme.appearance.animation === "pulse"
                          ? "checkoutProgressPulse 1.5s infinite"
                          : "none",
                      backgroundImage:
                        theme.appearance.animation === "stripe"
                          ? "repeating-linear-gradient(45deg, rgba(255,255,255,.25) 0 8px, transparent 8px 16px)"
                          : "none",
                    }}
                  />
                </div>

                {theme.showAmount && !unlocked && (
                  <p style={{ fontSize: "12px", color: "#6d7175", margin: "12px 0 0" }}>
                    {String(theme.progressMessage || "")
                      .replaceAll("{amount}", `$${remaining.toFixed(2)}`)
                      .replaceAll("{current}", `$${previewAmount.toFixed(2)}`)
                      .replaceAll("{goal}", `$${threshold.toFixed(2)}`)}
                  </p>
                )}

                {unlocked && (
                  <p style={{ fontSize: "13px", margin: "12px 0 0", color: "#16794b" }}>
                    {theme.unlockedMessage}
                  </p>
                )}

                {theme.appearance.showMilestones && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "18px",
                      fontSize: "11px",
                      color: "#6d7175",
                    }}
                  >
                    <span>Start</span>
                    <span>{threshold > 0 ? "Free shipping" : "Unlocked"}</span>
                  </div>
                )}

                {theme.labels.footer && (
                  <p style={{ fontSize: "12px", color: "#6d7175", margin: "18px 0 0" }}>
                    {theme.labels.footer}
                  </p>
                )}
              </>
            ) : (
              <p style={{ color: "#6d7175", fontSize: "13px" }}>
                The progress bar is disabled.
              </p>
            )}
          </div>

          <div
            style={{
              width: "100%",
              maxWidth: mobilePreview ? "375px" : "100%",
              marginTop: "24px",
            }}
          >
            <label style={labelStyle}>
              Preview subtotal: ${Number(previewAmount).toFixed(2)}
            </label>

            <input
              type="range"
              min="0"
              max={Math.max(threshold * 1.5, 100)}
              step="1"
              value={Math.min(previewAmount, Math.max(threshold * 1.5, 100))}
              onChange={(event) => setPreviewAmount(Number(event.target.value))}
              style={{ width: "100%", marginTop: "10px" }}
            />
          </div>
        </div>
      </aside>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "10px",
          padding: "12px 16px",
          background: "#fafafa",
          borderTop: "1px solid #e1e3e5",
        }}
      >
        {saved && (
          <span style={{ color: "#16794b", fontSize: "13px", marginRight: "auto" }}>
            ✓ Saved
          </span>
        )}

        <button
          type="button"
          onClick={() => setTheme(normalizeTheme(definition.savedTheme || {}))}
          disabled={saving}
          style={{
            padding: "9px 15px",
            border: "1px solid #d1d5db",
            borderRadius: "7px",
            background: "#fff",
            color: "#6b7280",
            fontSize: "14px",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          Reset
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "9px 18px",
            border: "none",
            borderRadius: "7px",
            background: "#111827",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

    <style>{`
  @keyframes checkoutProgressPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .65; }
  }

  @media (max-width: 850px) {
    .checkout-progress-editor-grid {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    .checkout-progress-editor-grid > section {
      border-right: none !important;
      border-bottom: 1px solid #e1e3e5;
    }
  }
`}</style>
    </div>
  );
}

