/*import { useState, useCallback, useMemo, useEffect } from "react";
import { useFetcher } from "react-router";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Banner,
  Text,
  Button,
  Spinner,
  RangeSlider,
  Box,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";

const DEFAULT_SETTINGS = {
  enabled: true,
  mainMessage: "Hurry up!! Limited in Stock!",
  itemCartMessage: "Item in your cart is reserved for:",
  countdownDuration: 15,
  extendedTimeHeading: "Time Extended 🔥",
  extendedTimeMessage: "Items in your cart are reserved for:",
  extendedTime: 180,
  expirationBehavior: "show_expired_text",
  messageTextColor: "#000000",
  backgroundColor: "#FFF7C4",
  timerColor: "#FF0000",
  fontSize: 16,
  fontBold: false,
  borderStyle: "solid",
  borderWidth: 2,
  borderRadius: 20,
  borderColor: "#F44336",
  padding: 15,
  margin: 10,
  cartPageTopPosition: 5,
  cartPageLeftPosition: 50,
  customCSS: "",
};

function normalizeHex(value, fallback) {
  const input = String(value || "").trim();
  if (!input) return fallback;

  const cleaned = input.startsWith("#") ? input : `#${input}`;

  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(cleaned)
    ? cleaned
    : fallback;
}

function normalizeSettings(settings) {
  const safeSettings =
    settings && typeof settings === "object" ? settings : {};

  return {
    enabled: Boolean(safeSettings.enabled ?? DEFAULT_SETTINGS.enabled),
    mainMessage:
      String(safeSettings.mainMessage ?? "").trim() || DEFAULT_SETTINGS.mainMessage,
    itemCartMessage:
      String(safeSettings.itemCartMessage ?? "").trim() ||
      DEFAULT_SETTINGS.itemCartMessage,
    countdownDuration: Math.max(
      1,
      Math.min(
        1440,
        Number(safeSettings.countdownDuration) || DEFAULT_SETTINGS.countdownDuration,
      ),
    ),
    extendedTimeHeading:
      String(safeSettings.extendedTimeHeading ?? "").trim() ||
      DEFAULT_SETTINGS.extendedTimeHeading,
    extendedTimeMessage:
      String(safeSettings.extendedTimeMessage ?? "").trim() ||
      DEFAULT_SETTINGS.extendedTimeMessage,
    extendedTime: Math.max(
      0,
      Math.min(3600, Number(safeSettings.extendedTime) || DEFAULT_SETTINGS.extendedTime),
    ),
    expirationBehavior: ["show_expired_text", "hide_countdown"].includes(
      safeSettings.expirationBehavior,
    )
      ? safeSettings.expirationBehavior
      : DEFAULT_SETTINGS.expirationBehavior,
    messageTextColor: normalizeHex(
      safeSettings.messageTextColor,
      DEFAULT_SETTINGS.messageTextColor,
    ),
    backgroundColor: normalizeHex(
      safeSettings.backgroundColor,
      DEFAULT_SETTINGS.backgroundColor,
    ),
    timerColor: normalizeHex(
      safeSettings.timerColor,
      DEFAULT_SETTINGS.timerColor,
    ),
    fontSize: Math.max(
      8,
      Math.min(72, Number(safeSettings.fontSize) || DEFAULT_SETTINGS.fontSize),
    ),
    fontBold: Boolean(safeSettings.fontBold ?? DEFAULT_SETTINGS.fontBold),
    borderStyle: ["solid", "dashed", "dotted", "none"].includes(
      safeSettings.borderStyle,
    )
      ? safeSettings.borderStyle
      : DEFAULT_SETTINGS.borderStyle,
    borderWidth: Math.max(
      0,
      Math.min(20, Number(safeSettings.borderWidth) || DEFAULT_SETTINGS.borderWidth),
    ),
    borderRadius: Math.max(
      0,
      Math.min(100, Number(safeSettings.borderRadius) || DEFAULT_SETTINGS.borderRadius),
    ),
    borderColor: normalizeHex(
      safeSettings.borderColor,
      DEFAULT_SETTINGS.borderColor,
    ),
    padding: Math.max(
      0,
      Math.min(100, Number(safeSettings.padding) || DEFAULT_SETTINGS.padding),
    ),
    margin: Math.max(
      0,
      Math.min(100, Number(safeSettings.margin) || DEFAULT_SETTINGS.margin),
    ),
    cartPageTopPosition: Math.max(
      0,
      Math.min(
        100,
        Number(safeSettings.cartPageTopPosition) ||
          DEFAULT_SETTINGS.cartPageTopPosition,
      ),
    ),
    cartPageLeftPosition: Math.max(
      0,
      Math.min(
        100,
        Number(safeSettings.cartPageLeftPosition) ||
          DEFAULT_SETTINGS.cartPageLeftPosition,
      ),
    ),
    customCSS: String(safeSettings.customCSS || "").trim(),
  };
}

function serializeSettings(settings) {
  return normalizeSettings(settings);
}

function emptyErrors() {
  return {
    mainMessage: "",
    itemCartMessage: "",
    countdownDuration: "",
    extendedTimeHeading: "",
    extendedTimeMessage: "",
    extendedTime: "",
    messageTextColor: "",
    backgroundColor: "",
    timerColor: "",
    borderColor: "",
    general: "",
  };
}

function validateSettings(settings) {
  const errors = emptyErrors();

  if (!String(settings.mainMessage ?? "").trim()) {
    errors.mainMessage = "Main message is required.";
  }

  if (!String(settings.itemCartMessage ?? "").trim()) {
    errors.itemCartMessage = "Item cart message is required.";
  }

  if (
    Number.isNaN(Number(settings.countdownDuration)) ||
    Number(settings.countdownDuration) < 1
  ) {
    errors.countdownDuration = "Duration must be at least 1 minute.";
  }

  if (!String(settings.extendedTimeHeading ?? "").trim()) {
    errors.extendedTimeHeading = "Extended time heading is required.";
  }

  if (!String(settings.extendedTimeMessage ?? "").trim()) {
    errors.extendedTimeMessage = "Extended time message is required.";
  }

  if (
    Number.isNaN(Number(settings.extendedTime)) ||
    Number(settings.extendedTime) < 0
  ) {
    errors.extendedTime = "Extended time must be 0 or more.";
  }

  const colorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

  if (!colorRegex.test(String(settings.messageTextColor || "").trim())) {
    errors.messageTextColor = "Enter a valid hex color.";
  }

  if (!colorRegex.test(String(settings.backgroundColor || "").trim())) {
    errors.backgroundColor = "Enter a valid hex color.";
  }

  if (!colorRegex.test(String(settings.timerColor || "").trim())) {
    errors.timerColor = "Enter a valid hex color.";
  }

  if (!colorRegex.test(String(settings.borderColor || "").trim())) {
    errors.borderColor = "Enter a valid hex color.";
  }

  return {
    isValid: !Object.values(errors).some(Boolean),
    errors,
  };
}

function ColorPickerField({
  label,
  value,
  error,
  name,
  onChange,
  alpha = false,
}) {
  const normalizedValue = normalizeHex(value, "#000000");

  const handleColorChange = useCallback(
    (event) => {
      const nextValue = event?.currentTarget?.value || event?.target?.value || "";
      onChange(normalizeHex(nextValue, normalizedValue));
    },
    [onChange, normalizedValue],
  );

  return (
    <BlockStack gap="200">
      <Text as="span" variant="bodyMd">
        {label}
      </Text>

      <InlineStack gap="300" blockAlign="center">
        <div
          style={{
            minWidth: 120,
            padding: 12,
            border: "1px solid #d9d9d9",
            borderRadius: 8,
            background: "#ffffff",
          }}
        >
          <s-color-picker
            name={name}
            value={normalizedValue}
            {...(alpha ? { alpha: true } : {})}
            onInput={handleColorChange}
            onChange={handleColorChange}
          />
        </div>

        <div
          style={{
            minWidth: 96,
            height: 40,
            borderRadius: 8,
            border: "1px solid #d9d9d9",
            background: normalizedValue,
          }}
        />

        <Text as="span" tone="subdued">
          {normalizedValue}
        </Text>
      </InlineStack>

      {error ? (
        <Text as="span" tone="critical" variant="bodySm">
          {error}
        </Text>
      ) : null}
    </BlockStack>
  );
}

export function CountdownTimerUrgencyWidget({
  initialSettings = DEFAULT_SETTINGS,
  apiEndpoint = "/api/widgets/countdown",
}) {
  const fetcher = useFetcher();

  const incomingConfig = useMemo(() => {
    return normalizeSettings(initialSettings);
  }, [initialSettings]);

  const [draft, setDraft] = useState(incomingConfig);
  const [savedConfig, setSavedConfig] = useState(incomingConfig);
  const [errors, setErrors] = useState(emptyErrors());
  const [banner, setBanner] = useState({ tone: "info", message: "" });

  useEffect(() => {
    if (fetcher.state === "idle" && !fetcher.data) {
      fetcher.load(apiEndpoint);
    }
  }, [apiEndpoint, fetcher]);

  useEffect(() => {
    if (!fetcher.data) return;

    if (fetcher.data.source === "action") {
      if (fetcher.data.ok) {
        const normalized = normalizeSettings(fetcher.data.settings);
        setSavedConfig(normalized);
        setDraft(normalized);
        setBanner({ tone: "success", message: "Settings saved successfully." });
      } else if (fetcher.data.errors?.length > 0) {
        setBanner({
          tone: "critical",
          message: fetcher.data.errors.map((e) => e.message).join(". "),
        });
      }
      return;
    }

    if (fetcher.data.source === "loader") {
      const normalized = normalizeSettings(fetcher.data.settings);
      setDraft(normalized);
      setSavedConfig(normalized);

      if (fetcher.data.error) {
        setBanner({ tone: "critical", message: fetcher.data.error });
      }
    }
  }, [fetcher.data]);

  const serializedDraft = useMemo(() => serializeSettings(draft), [draft]);
  const serializedSaved = useMemo(() => serializeSettings(savedConfig), [savedConfig]);

  const hasUnsavedChanges =
    JSON.stringify(serializedDraft) !== JSON.stringify(serializedSaved);

  const isLoading = fetcher.state === "loading" && !fetcher.formMethod;
  const saving = fetcher.state !== "idle" && fetcher.formMethod === "post";

  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleChange = useCallback((field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "", general: "" }));
    setBanner({ tone: "info", message: "" });
  }, []);

  const handleSave = useCallback(() => {
    const validation = validateSettings(draft);
    const payload = { settings: serializeSettings(draft) };

    if (!validation.isValid) {
      setErrors(validation.errors);
      setBanner({
        tone: "critical",
        message: "Please fix the errors before saving.",
      });
      return;
    }

    setErrors(emptyErrors());
    setBanner({ tone: "info", message: "" });

    fetcher.submit(JSON.stringify(payload), {
      method: "post",
      action: apiEndpoint,
      encType: "application/json",
    });
  }, [draft, fetcher, apiEndpoint]);

  const handleReset = useCallback(() => {
    setDraft(savedConfig);
    setErrors(emptyErrors());
    setBanner({ tone: "info", message: "" });
  }, [savedConfig]);

  const expirationOptions = [
    { label: "Show Expired Text", value: "show_expired_text" },
    { label: "Hide Countdown", value: "hide_countdown" },
  ];

  const borderStyleOptions = [
    { label: "Solid", value: "solid" },
    { label: "Dashed", value: "dashed" },
    { label: "Dotted", value: "dotted" },
    { label: "None", value: "none" },
  ];

  const previewStyles = useMemo(
    () => ({
      wrapper: {
        backgroundColor: draft.backgroundColor,
        color: draft.messageTextColor,
        padding: `${draft.padding}px`,
        margin: `${draft.margin}px`,
        borderRadius: `${draft.borderRadius}px`,
        borderStyle: draft.borderStyle,
        borderWidth: `${draft.borderWidth}px`,
        borderColor: draft.borderColor,
        fontSize: `${draft.fontSize}px`,
        fontWeight: draft.fontBold ? "700" : "400",
        textAlign: "center",
      },
      timer: {
        color: draft.timerColor,
        fontWeight: "700",
        fontSize: `${Math.round(draft.fontSize * 1.2)}px`,
        marginTop: "8px",
      },
    }),
    [draft],
  );

  if (isLoading) {
    return (
      <Page title="Countdown Timer Urgency Widget">
        <Box padding="400">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Spinner accessibilityLabel="Loading settings" size="large" />
          </div>
        </Box>
      </Page>
    );
  }

  return (
    <Page title="Countdown Timer Urgency Widget">
      <BlockStack gap="400">
        {banner.message ? (
          <Banner
            tone={banner.tone}
            onDismiss={() => setBanner({ tone: "info", message: "" })}
          >
            <p>{banner.message}</p>
          </Banner>
        ) : null}

        {hasUnsavedChanges ? (
          <Banner tone="info">
            <p>You have unsaved changes. Click Save to persist them.</p>
          </Banner>
        ) : null}

        <div style={{ display: "flex", gap: 12 }}>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={!hasUnsavedChanges}
          >
            Save
          </Button>
          <Button onClick={handleReset} disabled={!hasUnsavedChanges || saving}>
            Reset
          </Button>
        </div>

        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="400">
                <FormLayout>
                  <Checkbox
                    label="Enable Countdown"
                    checked={draft.enabled}
                    onChange={(checked) => handleChange("enabled", checked)}
                  />

                  <TextField
                    label="Main Message"
                    value={draft.mainMessage}
                    onChange={(value) => handleChange("mainMessage", value)}
                    autoComplete="off"
                    error={errors.mainMessage}
                  />

                  <TextField
                    label="Item Cart Message"
                    value={draft.itemCartMessage}
                    onChange={(value) => handleChange("itemCartMessage", value)}
                    autoComplete="off"
                    error={errors.itemCartMessage}
                  />

                  <TextField
                    label="Countdown Duration (minutes)"
                    type="number"
                    value={String(draft.countdownDuration)}
                    onChange={(value) =>
                      handleChange("countdownDuration", parseInt(value, 10) || 0)
                    }
                    autoComplete="off"
                    error={errors.countdownDuration}
                  />

                  <TextField
                    label="Extended Time Heading"
                    value={draft.extendedTimeHeading}
                    onChange={(value) => handleChange("extendedTimeHeading", value)}
                    autoComplete="off"
                    error={errors.extendedTimeHeading}
                  />

                  <TextField
                    label="Extended Time Message"
                    value={draft.extendedTimeMessage}
                    onChange={(value) => handleChange("extendedTimeMessage", value)}
                    autoComplete="off"
                    error={errors.extendedTimeMessage}
                  />

                  <TextField
                    label="Extended Time (seconds)"
                    type="number"
                    value={String(draft.extendedTime)}
                    onChange={(value) =>
                      handleChange("extendedTime", parseInt(value, 10) || 0)
                    }
                    autoComplete="off"
                    error={errors.extendedTime}
                  />

                  <Select
                    label="Expiration Behavior"
                    options={expirationOptions}
                    value={draft.expirationBehavior}
                    onChange={(value) => handleChange("expirationBehavior", value)}
                  />
                </FormLayout>
              </Box>
            </Card>

            <div style={{ height: 16 }} />

            <Card>
              <Box padding="400">
                <FormLayout>
                  <ColorPickerField
                    label="Message Text Color"
                    name="messageTextColor"
                    value={draft.messageTextColor}
                    error={errors.messageTextColor}
                    onChange={(value) => handleChange("messageTextColor", value)}
                  />

                  <ColorPickerField
                    label="Background Color"
                    name="backgroundColor"
                    value={draft.backgroundColor}
                    error={errors.backgroundColor}
                    onChange={(value) => handleChange("backgroundColor", value)}
                    alpha
                  />

                  <ColorPickerField
                    label="Timer Color"
                    name="timerColor"
                    value={draft.timerColor}
                    error={errors.timerColor}
                    onChange={(value) => handleChange("timerColor", value)}
                  />

                  <RangeSlider
                    label="Font Size"
                    min={8}
                    max={72}
                    output
                    value={draft.fontSize}
                    onChange={(value) => handleChange("fontSize", value)}
                  />

                  <Checkbox
                    label="Bold Font"
                    checked={draft.fontBold}
                    onChange={(checked) => handleChange("fontBold", checked)}
                  />

                  <Select
                    label="Border Style"
                    options={borderStyleOptions}
                    value={draft.borderStyle}
                    onChange={(value) => handleChange("borderStyle", value)}
                  />

                  <RangeSlider
                    label="Border Width"
                    min={0}
                    max={20}
                    output
                    value={draft.borderWidth}
                    onChange={(value) => handleChange("borderWidth", value)}
                  />

                  <RangeSlider
                    label="Border Radius"
                    min={0}
                    max={100}
                    output
                    value={draft.borderRadius}
                    onChange={(value) => handleChange("borderRadius", value)}
                  />

                  <ColorPickerField
                    label="Border Color"
                    name="borderColor"
                    value={draft.borderColor}
                    error={errors.borderColor}
                    onChange={(value) => handleChange("borderColor", value)}
                  />

                  <RangeSlider
                    label="Padding"
                    min={0}
                    max={100}
                    output
                    value={draft.padding}
                    onChange={(value) => handleChange("padding", value)}
                  />

                  <RangeSlider
                    label="Margin"
                    min={0}
                    max={100}
                    output
                    value={draft.margin}
                    onChange={(value) => handleChange("margin", value)}
                  />

                  <RangeSlider
                    label="Cart Page Top Position"
                    min={0}
                    max={100}
                    output
                    value={draft.cartPageTopPosition}
                    onChange={(value) =>
                      handleChange("cartPageTopPosition", value)
                    }
                  />

                  <RangeSlider
                    label="Cart Page Left Position"
                    min={0}
                    max={100}
                    output
                    value={draft.cartPageLeftPosition}
                    onChange={(value) =>
                      handleChange("cartPageLeftPosition", value)
                    }
                  />

                  <TextField
                    label="Custom CSS"
                    value={draft.customCSS}
                    onChange={(value) => handleChange("customCSS", value)}
                    multiline={4}
                    autoComplete="off"
                    helpText="Add custom CSS to further style the widget."
                  />
                </FormLayout>
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <Box padding="400">
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Live Preview
                  </Text>

                  <div style={previewStyles.wrapper}>
                    <div>{draft.mainMessage}</div>
                    <div style={{ marginTop: 6 }}>{draft.itemCartMessage}</div>
                    <div style={previewStyles.timer}>09:41</div>
                  </div>

                  <Text as="p" tone="subdued">
                    This preview reflects your current settings.
                  </Text>
                </BlockStack>
              </Box>
            </Card>

            <div style={{ height: 16 }} />

            <Card>
              <Box padding="400">
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Settings Status
                  </Text>
                  <Text as="p">
                    Countdown: {draft.enabled ? "Enabled" : "Disabled"}
                  </Text>
                  <Text as="p">
                    Changes: {hasUnsavedChanges ? "Unsaved" : "Saved"}
                  </Text>
                </BlockStack>
              </Box>
            </Card>

            <div style={{ height: 16 }} />

            <Card>
              <Box padding="400">
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    JSON Payload
                  </Text>

                  <pre
                    style={{
                      margin: 0,
                      padding: 12,
                      background: "#f6f6f7",
                      borderRadius: 8,
                      overflowX: "auto",
                      fontSize: 12,
                    }}
                  >
                    {JSON.stringify(serializedDraft, null, 2)}
                  </pre>

                  <Text as="p" tone="subdued">
                    This JSON is saved by your app endpoint.
                  </Text>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}*/
// CountdownTimerUrgencyWidget.jsx
import { WidgetCustomizeForm } from "../shared/CustomizeFormWidgets/WidgetCustomizeForm";
import { useFetcher } from "react-router";


export function CountdownTimerUrgencyWidget({ shop, definition }) {
  const fetcher = useFetcher();

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
        widgetType="countdown_timer_urgency"
        initialTheme={definition.savedTheme || null}
        mode="storefront"
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}