import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  Banner,
  Tabs,
  InlineStack,
  BlockStack,
  Text,
  Box,
  Badge,
  Divider,
  Spinner,
} from "@shopify/polaris";
import {
  getUnlockedRewardForCart,
  getRewardLabel,
  sortRules,
} from "./../../utils/progressBarUtils";
import { TabButton } from "../shared/CustomizeFormWidgets/subcomponents/TabButton";

/* ─────────── CONSTANTS ─────────── */
const RULE_OPTIONS = [
  { label: "Free shipping", value: "free_shipping" },
  { label: "Discount percentage", value: "discount_percent" },
  { label: "Fixed discount", value: "discount_fixed" },
  { label: "Free gift", value: "free_gift" },
];

const ANIMATION_OPTIONS = [
  { label: "Smooth", value: "smooth" },
  { label: "Stripe", value: "stripe" },
  { label: "Pulse", value: "pulse" },
];

/* ─────────── HELPERS ─────────── */
function createRule(overrides = {}) {
  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "free_shipping",
    threshold: "50",
    value: "",
    label: "Free shipping",
    icon: "🚚",
    enabled: true,
    shopifyDiscountGid: "",
    discountSyncStatus: "idle",
    freeGiftVariantId: "",
    freeGiftProductTitle: "",
    ...overrides,
  };
}

function toStringValue(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function emptyErrors() {
  return {
    title: "",
    goalLabel: "",
    labels: {
      beforeGoal: "",
      progress: "",
      afterGoal: "",
      footer: "",
    },
    rules: {},
    general: "",
  };
}


function normalizeMilestoneIcon(icon, label) {
  const value = String(icon || "").trim();
  const name = String(label || "").toLowerCase();

  // Replace known corrupted emoji encodings in saved configurations.
  if (/ðŸ|âœ|ï¸/.test(value)) {
    if (name.includes("shipping")) return "🚚";
    if (name.includes("discount") || name.includes("off")) return "🏷️";
    if (name.includes("gift")) return "🎁";
    return "";
  }

  return value;
}


function normalizeConfig(input = {}) {
  const defaultRules = [
    createRule({
      type: "free_shipping",
      threshold: "40",
      value: "",
      label: "Free shipping",
      icon: "🚚",
      enabled: true,
    }),
    createRule({
      type: "discount_percent",
      threshold: "80",
      value: "10",
      label: "10% OFF",
      icon: "🏷️",
      enabled: true,
    }),
    createRule({
      type: "free_gift",
      threshold: "120",
      value: "",
      label: "Free gift",
      icon: "🎁",
      enabled: true,
      freeGiftVariantId: "",
      freeGiftProductTitle: "",
    }),
  ];

  return {
    enabled: input.enabled ?? true,
    title: input.title ?? "Progress Bar",
    goalLabel:
      input.goalLabel ?? "Drive higher cart value with milestone rewards",
    appearance: {
      animation: input.appearance?.animation ?? "smooth",
      filledColor: input.appearance?.filledColor ?? "#111827",
      emptyColor: input.appearance?.emptyColor ?? "#D1D5DB",
      showMilestones: input.appearance?.showMilestones ?? true,
      compactMode: input.appearance?.compactMode ?? false,
    },
    placement: {
      showOnCartPage: input.placement?.showOnCartPage ?? true,
      showInCartDrawer: input.placement?.showInCartDrawer ?? true,
      hideWhenEmpty: input.placement?.hideWhenEmpty ?? false,
      insertSelector: input.placement?.insertSelector ?? "",
      insertPosition: input.placement?.insertPosition ?? "afterbegin",
    },
    labels: {
      beforeGoal:
        input.labels?.beforeGoal ??
        "Add {{remaining}} to unlock {{reward}}",
      progress: input.labels?.progress ?? "{{current}} of {{goal}} completed",
      afterGoal: input.labels?.afterGoal ?? "Unlocked: {{reward}}",
      footer:
        input.labels?.footer ??
        "Increase cart value to reach the next reward.",
    },
    rules:
      Array.isArray(input.rules) && input.rules.length > 0
        ? input.rules.map((rule) =>
          createRule({
            ...rule,
            threshold: toStringValue(rule.threshold, "0"),
            value: toStringValue(rule.value, ""),
            freeGiftVariantId: toStringValue(rule.freeGiftVariantId, ""),
            freeGiftProductTitle: toStringValue(
              rule.freeGiftProductTitle,
              ""
            ),
            shopifyDiscountGid: toStringValue(
              rule.shopifyDiscountGid || rule.shopifyDiscountId,
              ""
            ),
            discountSyncStatus: toStringValue(
              rule.discountSyncStatus,
              "idle"
            ),
          })
        )
        : defaultRules,
  };
}

function formatTemplate(template, values) {
  return Object.entries(values).reduce((text, [key, value]) => {
    return text.replaceAll(`{{${key}}}`, value);
  }, template || "");
}

function serializeConfig(config) {
  return {
    enabled: Boolean(config.enabled),
    title: config.title?.trim() || "Progress Bar",
    goalLabel: config.goalLabel?.trim() || "",
    appearance: {
      animation: config.appearance.animation,
      filledColor: config.appearance.filledColor?.trim() || "#111827",
      emptyColor: config.appearance.emptyColor?.trim() || "#D1D5DB",
      showMilestones: Boolean(config.appearance.showMilestones),
      compactMode: Boolean(config.appearance.compactMode),
    },
    placement: {
      showOnCartPage: Boolean(config.placement?.showOnCartPage),
      showInCartDrawer: Boolean(config.placement?.showInCartDrawer),
      hideWhenEmpty: Boolean(config.placement?.hideWhenEmpty),
      insertSelector: config.placement?.insertSelector?.trim() || "",
      insertPosition: config.placement?.insertPosition || "afterbegin",
    },
    labels: {
      beforeGoal: config.labels.beforeGoal?.trim() || "",
      progress: config.labels.progress?.trim() || "",
      afterGoal: config.labels.afterGoal?.trim() || "",
      footer: config.labels.footer?.trim() || "",
    },
    rules: sortRules(config.rules).map((rule) => ({
      id: rule.id,
      type: rule.type,
      threshold: Number(rule.threshold || 0),
      value: rule.value === "" ? null : Number(rule.value),
      label: rule.label?.trim() || "",
      icon: (() => {
  const icon = String(rule.icon || "").trim();

  if (/ðŸ|âœ|ï¸|Ã/.test(icon)) {
    const label = String(rule.label || "").toLowerCase();

    if (label.includes("shipping")) return "🚚";
    if (label.includes("off") || label.includes("discount")) return "🏷️";
    if (label.includes("gift")) return "🎁";

    return "";
  }

  return icon;
})(),
      enabled: Boolean(rule.enabled),
      shopifyDiscountGid: rule.shopifyDiscountGid || "",
      discountSyncStatus: rule.discountSyncStatus || "idle",
      freeGiftVariantId: rule.freeGiftVariantId?.trim() || "",
      freeGiftProductTitle: rule.freeGiftProductTitle?.trim() || "",
    })),
  };
}

function validateConfig(config) {
  const errors = emptyErrors();

  if (!config.title?.trim()) {
    errors.title = "Admin title is required.";
  }

  if (!config.labels.beforeGoal?.trim()) {
    errors.labels.beforeGoal = "Before-goal message is required.";
  }
  if (!config.labels.progress?.trim()) {
    errors.labels.progress = "Progress message is required.";
  }
  if (!config.labels.afterGoal?.trim()) {
    errors.labels.afterGoal = "After-goal message is required.";
  }
  if (!config.labels.footer?.trim()) {
    errors.labels.footer = "Footer note is required.";
  }

  const enabledRules = config.rules.filter((rule) => rule.enabled);
  if (enabledRules.length === 0) {
    errors.general = "Enable at least one milestone rule.";
  }

  const seenThresholds = new Set();
  config.rules.forEach((rule) => {
    const ruleErrors = {};
    const threshold = Number(rule.threshold);
    const numericValue =
      rule.value === "" || rule.value === null || rule.value === undefined
        ? null
        : Number(rule.value);

    if (!rule.label?.trim()) {
      ruleErrors.label = "Tier label is required.";
    }
    if (Number.isNaN(threshold) || threshold < 0) {
      ruleErrors.threshold = "Threshold must be 0 or greater.";
    }
    if (!Number.isNaN(threshold)) {
      const key = `${threshold}`;
      if (seenThresholds.has(key)) {
        ruleErrors.threshold = "Each tier threshold must be unique.";
      }
      seenThresholds.add(key);
    }

    if (
      (rule.type === "discount_percent" || rule.type === "discount_fixed") &&
      (numericValue === null || Number.isNaN(numericValue) || numericValue <= 0)
    ) {
      ruleErrors.value = "Enter a valid reward value.";
    }
    if (
      rule.type === "discount_percent" &&
      numericValue !== null &&
      numericValue > 100
    ) {
      ruleErrors.value = "Percentage discount must be 100 or less.";
    }
    if (rule.type === "free_gift" && !rule.freeGiftVariantId?.trim()) {
      ruleErrors.freeGiftVariantId = "Please select a gift variant.";
    }

    errors.rules[rule.id] = ruleErrors;
  });

  const hasRuleErrors = Object.values(errors.rules).some(
    (re) => Object.keys(re).length > 0
  );
  const hasLabelErrors = Object.values(errors.labels).some(Boolean);

  return {
    isValid:
      !errors.title &&
      !errors.goalLabel &&
      !errors.general &&
      !hasLabelErrors &&
      !hasRuleErrors,
    errors,
  };
}

/* ─────────── BADGES ─────────── */
function getBackendBadge(type) {
  if (["discount_percent", "discount_fixed", "free_shipping"].includes(type)) {
    return <Badge tone="info">Function</Badge>;
  }
  if (type === "free_gift") {
    return <Badge tone="attention">Auto</Badge>;
  }
  return null;
}

function getSyncStatusDisplay(status) {
  if (!status || status === "idle")
    return { text: "Not synced", tone: "warning" };
  if (status === "synced") return { text: "Synced", tone: "success" };
  if (status.startsWith("error:")) return { text: status, tone: "critical" };
  return { text: status, tone: "default" };
}

/* ─────────── MAIN COMPONENT ─────────── */
export function FreeShippingProgressBarWidget({
  funnel,
  definition,
  value,
  onChange,
  onSave,
}) {
  const shopify = useAppBridge();

  const incomingConfig = useMemo(
    () => normalizeConfig(value || funnel?.progressBarConfig || {}),
    [value, funnel?.progressBarConfig]
  );

  const [savedConfig, setSavedConfig] = useState(incomingConfig);
  const [draft, setDraft] = useState(incomingConfig);
  const [previewCart, setPreviewCart] = useState("35");
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingDiscounts, setIsGeneratingDiscounts] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bannerState, setBannerState] = useState({
    tone: "info",
    heading: "",
    message: "",
  });
  const [errors, setErrors] = useState(emptyErrors());
  const [embedStatus, setEmbedStatus] = useState({
    loading: false,
    loaded: false,
    enabled: false,
    themeName: "",
    error: "",
  });

  /* ── Load persisted config on mount ── */
  useEffect(() => {
    let mounted = true;

    async function loadPersisted() {
      try {
        const res = await fetch("/api/progress-bar-config");
        const data = await res.json();

        if (!mounted) return;

        if (data.ok && data.config) {
          const normalized = normalizeConfig(data.config);
          setDraft(normalized);
          setSavedConfig(normalized);
        } else {
          setDraft(incomingConfig);
          setSavedConfig(incomingConfig);
        }
      } catch (e) {
        if (!mounted) return;
        setDraft(incomingConfig);
        setSavedConfig(incomingConfig);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadPersisted();
    return () => {
      mounted = false;
    };
  }, []); // intentionally empty â€” run once on mount

  /* ── Warn on close if unsaved ── */
  const serializedDraft = useMemo(() => serializeConfig(draft), [draft]);
  const serializedSaved = useMemo(
    () => serializeConfig(savedConfig),
    [savedConfig]
  );
  const hasUnsavedChanges =
    JSON.stringify(serializedDraft) !== JSON.stringify(serializedSaved);

  useEffect(() => {
    function handleBeforeUnload(e) {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  /* ── Embed status polling ── */
  const loadEmbedStatus = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setEmbedStatus((prev) => ({ ...prev, loading: true, error: "" }));
      }
      const response = await fetch("/api/embed-status");
      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Unable to fetch app embed status.");
      }

      setEmbedStatus((prev) => ({
        ...prev,
        loading: false,
        loaded: true,
        enabled: Boolean(data.enabled),
        themeName: data.themeName || "",
        error: "",
      }));
    } catch (error) {
      setEmbedStatus((prev) => ({
        ...prev,
        loading: false,
        loaded: true,
        enabled: false,
        themeName: "",
        error: error?.message || "Unable to fetch app embed status.",
      }));
    }
  }, []);

  useEffect(() => {
    loadEmbedStatus(false);
    const timer = setInterval(() => loadEmbedStatus(false), 5000);
    return () => clearInterval(timer);
  }, [loadEmbedStatus]);

  /* ── Derived state ── */
  const currencyCode =
    funnel?.currencyCode || funnel?.currency || value?.currencyCode || "USD";

  const formatMoney = useMemo(() => {
    try {
      return (amount) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currencyCode,
          maximumFractionDigits: 2,
        }).format(Number(amount || 0));
    } catch (error) {
      return (amount) => `$${Number(amount || 0).toFixed(2)}`;
    }
  }, [currencyCode]);

  const sortedRules = useMemo(() => sortRules(draft.rules), [draft.rules]);
  const enabledSortedRules = useMemo(
    () => sortedRules.filter((rule) => rule.enabled),
    [sortedRules]
  );

  const maxGoal = useMemo(() => {
    if (!enabledSortedRules.length) return 100;
    return Math.max(
      ...enabledSortedRules.map((rule) => Number(rule.threshold || 0)),
      25
    );
  }, [enabledSortedRules]);

  const cartValue = Number(previewCart || 0);
  const progressPercentage =
    maxGoal > 0 ? Math.min((cartValue / maxGoal) * 100, 100) : 0;

  const { nextRule, unlockedRule } = getUnlockedRewardForCart(
    enabledSortedRules,
    cartValue
  );

  const previewHeadline = nextRule
    ? formatTemplate(draft.labels.beforeGoal, {
      remaining: formatMoney(Number(nextRule.threshold || 0) - cartValue),
      reward: getRewardLabel(nextRule, formatMoney),
      current: formatMoney(cartValue),
      goal: formatMoney(nextRule.threshold),
    })
    : formatTemplate(draft.labels.afterGoal, {
      reward: getRewardLabel(
        unlockedRule || enabledSortedRules[enabledSortedRules.length - 1],
        formatMoney
      ),
      current: formatMoney(cartValue),
      goal: formatMoney(maxGoal),
      remaining: formatMoney(0),
    });

  const previewSubtext = nextRule
    ? formatTemplate(draft.labels.progress, {
      current: formatMoney(cartValue),
      goal: formatMoney(nextRule.threshold),
      remaining: formatMoney(Number(nextRule.threshold || 0) - cartValue),
      reward: getRewardLabel(nextRule, formatMoney),
    })
    : draft.labels.footer;

  /* ── Draft helpers ── */
  function patchDraft(nextDraft) {
    setDraft(nextDraft);
    onChange?.(serializeConfig(nextDraft));
  }

  function clearGeneralBanner() {
    setBannerState({ tone: "info", heading: "", message: "" });
  }

  function updateRoot(key, nextValue) {
    clearGeneralBanner();
    patchDraft({ ...draft, [key]: nextValue });
  }

  function updateAppearance(key, nextValue) {
    clearGeneralBanner();
    patchDraft({
      ...draft,
      appearance: { ...draft.appearance, [key]: nextValue },
    });
  }

  function updatePlacement(key, nextValue) {
    clearGeneralBanner();
    patchDraft({ ...draft, placement: { ...draft.placement, [key]: nextValue } });
  }

  function updateLabel(key, nextValue) {
    clearGeneralBanner();
    patchDraft({ ...draft, labels: { ...draft.labels, [key]: nextValue } });
  }

  function updateRule(ruleId, key, nextValue) {
    clearGeneralBanner();
    patchDraft({
      ...draft,
      rules: draft.rules.map((rule) =>
        rule.id === ruleId ? { ...rule, [key]: nextValue } : rule
      ),
    });
  }

  function addRule() {
    const lastThreshold =
      sortedRules.length > 0
        ? Number(sortedRules[sortedRules.length - 1].threshold || 0)
        : 25;
    clearGeneralBanner();
    patchDraft({
      ...draft,
      rules: [
        ...draft.rules,
        createRule({
          threshold: String(lastThreshold + 25),
          label: `Tier ${draft.rules.length + 1}`,
          icon: "🎁",
          enabled: true,
        }),
      ],
    });
  }

  function duplicateRule(event, rule) {
    event?.preventDefault?.();
    clearGeneralBanner();
    patchDraft({
      ...draft,
      rules: [
        ...draft.rules,
        createRule({
          ...rule,
          id: undefined,
          threshold: String(Number(rule.threshold || 0) + 10),
          label: `${rule.label} copy`,
          shopifyDiscountGid: "",
          discountSyncStatus: "idle",
          freeGiftVariantId: rule.freeGiftVariantId || "",
          freeGiftProductTitle: rule.freeGiftProductTitle || "",
        }),
      ],
    });
  }

  function removeRule(event, ruleId) {
    event?.preventDefault?.();
    if (draft.rules.length === 1) {
      setBannerState({
        tone: "critical",
        heading: "Cannot remove rule",
        message: "At least one milestone rule is required.",
      });
      return;
    }
    clearGeneralBanner();
    patchDraft({
      ...draft,
      rules: draft.rules.filter((rule) => rule.id !== ruleId),
    });
  }

  function resetToDefaults(event) {
    event?.preventDefault?.();
    const defaults = normalizeConfig({});
    setSavedConfig(defaults);
    setDraft(defaults);
    setPreviewCart("35");
    setSelectedTabIndex(0);
    setErrors(emptyErrors());
    setBannerState({
      tone: "info",
      heading: "Defaults restored",
      message: "The widget has been reset to default milestone settings.",
    });
    onChange?.(serializeConfig(defaults));
  }

  /* ── Save to SQLite ── */
  async function saveForm(event) {
    event?.preventDefault?.();

    const validation = validateConfig(draft);
    setErrors(validation.errors);

    if (!validation.isValid) {
      setBannerState({
        tone: "critical",
        heading: "Fix highlighted fields",
        message:
          validation.errors.general ||
          "Please review the invalid rule and label fields before saving.",
      });
      return;
    }

    const payload = serializeConfig(draft);

    try {
      setIsSaving(true);

      // Persist to Prisma / SQLite
      const res = await fetch("/api/progress-bar-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: payload }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Save failed");

      const syncResponse = await fetch("/api/progress-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: payload.rules, enabled: payload.enabled }),//updated
      });

      const syncData = await syncResponse.json();
      if (!syncResponse.ok || !syncData?.ok) {
        throw new Error(syncData?.error || "Failed to sync Shopify discounts.");
      }

      const syncedPayload = {
        ...payload,
        rules: payload.rules.map((rule) => {
          const generated = (syncData.rules || []).find(
            (item) => item.id === rule.id
          );

          if (!generated) return rule;

          return {
            ...rule,
            shopifyDiscountGid:
              generated.shopifyDiscountGid ||
              generated.shopifyDiscountId ||
              rule.shopifyDiscountGid ||
              "",
            discountSyncStatus: generated.discountSyncStatus || "synced",
          };
        }),
      };

      // Update local saved state so "unsaved" badge disappears
      const refreshed = normalizeConfig(syncedPayload);
      setSavedConfig(refreshed);
      setDraft(refreshed);
      setErrors(emptyErrors());

      shopify?.toast?.show("Progress bar settings synced successfully", {
        duration: 5000,
      });

      onChange?.(syncedPayload);
      if (onSave) await onSave(syncedPayload);
      await loadEmbedStatus();
    } catch (error) {
      setBannerState({
        tone: "critical",
        heading: "Save failed",
        message:
          error?.message ||
          "Something went wrong while saving the progress bar settings.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  /* ── Sync discounts ── */
  async function generateShopifyDiscounts(event) {
    event?.preventDefault?.();

    const validation = validateConfig(draft);
    setErrors(validation.errors);

    if (!validation.isValid) {
      setBannerState({
        tone: "critical",
        heading: "Fix highlighted fields",
        message:
          validation.errors.general ||
          "Please fix the rules before generating discounts.",
      });
      return;
    }

    try {
      setIsGeneratingDiscounts(true);

      const response = await fetch("/api/progress-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: serializeConfig(draft).rules, enabled: serializeConfig(draft).enabled }),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to generate discounts.");
      }

      const nextRules = draft.rules.map((rule) => {
        const generated = (data.rules || []).find((item) => item.id === rule.id);
        if (!generated) return rule;
        return {
          ...rule,
          shopifyDiscountGid:
            generated.shopifyDiscountGid ||
            generated.shopifyDiscountId ||
            rule.shopifyDiscountGid,
          discountSyncStatus: generated.discountSyncStatus || "synced",
        };
      });

      const nextDraft = { ...draft, rules: nextRules };
      patchDraft(nextDraft);

      const hasErrors = nextRules.some((r) =>
        r.discountSyncStatus?.startsWith("error:")
      );
      if (hasErrors) {
        setBannerState({
          tone: "critical",
          heading: "Partial sync issues",
          message:
            "Some discounts failed to sync. Check each rule's status for details.",
        });
      } else {
        shopify?.toast?.show(
          "Discounts synced successfully and are live at checkout.",
          { duration: 5000 }
        );
      }
    } catch (error) {
      setBannerState({
        tone: "critical",
        heading: "Discount generation failed",
        message:
          error?.message ||
          "Something went wrong while creating Shopify discounts.",
      });
    } finally {
      setIsGeneratingDiscounts(false);
    }
  }

  /* ── App Bridge Gift Picker ── */
  function selectGiftVariant(ruleId, variantId, productTitle, variantTitle) {
    if (!variantId) return;
    clearGeneralBanner();

    setDraft((prevDraft) => {
      const nextDraft = {
        ...prevDraft,
        rules: prevDraft.rules.map((rule) =>
          rule.id === ruleId
            ? {
              ...rule,
              freeGiftVariantId: variantId,
              freeGiftProductTitle: `${productTitle} â€” ${variantTitle}`,
            }
            : rule
        ),
      };
      onChange?.(serializeConfig(nextDraft));
      return nextDraft;
    });
  }

  async function openGiftPicker(ruleId) {
    if (!shopify || !shopify.resourcePicker) {
      console.error("shopify.resourcePicker is not available.");
      return;
    }
    try {
      const selected = await shopify.resourcePicker({
        type: "product",
        options: { showVariants: true, multiple: false },
      });
      if (!selected || selected.length === 0) return;

      const product = selected[0];
      let variantId = "";
      let variantTitle = "";

      if (product.variants && product.variants.length > 0) {
        const target =
          product.variants.find((v) => v.selected) || product.variants[0];
        variantId = target.id || target.admin_graphql_api_id || "";
        variantTitle = target.title || "Default Title";
        if (!variantId && target.legacyResourceId) {
          variantId = `gid://shopify/ProductVariant/${target.legacyResourceId}`;
        }
      } else if (product.id && product.id.includes("ProductVariant")) {
        variantId = product.id;
        variantTitle = product.title;
      }

      if (!variantId) return;
      selectGiftVariant(ruleId, variantId, product.title, variantTitle);
    } catch (error) {
      console.error("resourcePicker error:", error);
    }
  }

  /* ── Gift Picker UI ── */
  function GiftVariantPicker({ rule, ruleErrors }) {
    if (rule.type !== "free_gift") return null;

    return (
      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="h4">
          Gift variant
        </Text>

        {rule.freeGiftVariantId ? (
          <Box
            background="bg-surface-secondary"
            padding="300"
            borderRadius="200"
            borderWidth="025"
            borderColor={ruleErrors.freeGiftVariantId ? "border-critical" : "border"}
          >
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <Text
                  variant="bodyMd"
                  fontWeight="medium"
                  truncate
                  title={rule.freeGiftProductTitle || rule.freeGiftVariantId}
                >
                  {rule.freeGiftProductTitle ||
                    rule.freeGiftVariantId.split("/").pop()}
                </Text>
                <Text variant="bodySm" tone="subdued" fontFamily="monospace">
                  {rule.freeGiftVariantId.split("/").pop()}
                </Text>
              </BlockStack>
              <InlineStack gap="200">
                <Button onClick={() => openGiftPicker(rule.id)} size="slim">
                  Change
                </Button>
                <Button
                  onClick={() => {
                    updateRule(rule.id, "freeGiftVariantId", "");
                    updateRule(rule.id, "freeGiftProductTitle", "");
                  }}
                  size="slim"
                  tone="critical"
                >
                  Remove
                </Button>
              </InlineStack>
            </InlineStack>
          </Box>
        ) : (
          <Button
            onClick={() => openGiftPicker(rule.id)}
            fullWidth
            textAlign="left"
          >
            + Select gift variant
          </Button>
        )}

        {ruleErrors.freeGiftVariantId && (
          <Text variant="bodySm" tone="critical">
            {ruleErrors.freeGiftVariantId}
          </Text>
        )}

        <Text variant="bodySm" tone="subdued">
          This variant will be added to cart automatically when the cart reaches
          the threshold.
        </Text>
      </BlockStack>
    );
  }

  /* ── Tabs ── */
  const tabs = [
    { id: "style", content: "Style", accessibilityLabel: "Style" },
    { id: "layout", content: "Layout", accessibilityLabel: "Layout" },
    { id: "text", content: "Text", accessibilityLabel: "Text" },
    { id: "position", content: "Position", accessibilityLabel: "Position" },
  ];

  /* â”€â”€ Loading state â”€â”€ */
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <Spinner size="large" />
      </div>
    );
  }

  /* ─────────── RENDER ─────────── */
  return (
    <Page
      title={definition?.title || "Manage Free Shipping Progress Bar"}
      subtitle={
        definition?.description ||
        "Configure milestone rewards for shipping, discounts, gifts, and cart-value nudges."
      }
      primaryAction={{
        content: isSaving ? "Savingâ€¦" : "Save progress bar",
        onAction: saveForm,
        loading: isSaving,
        disabled: isGeneratingDiscounts,
      }}
      secondaryActions={[
        {
          content: isGeneratingDiscounts
            ? "Syncingâ€¦"
            : "Sync automatic discounts",
          onAction: generateShopifyDiscounts,
          loading: isGeneratingDiscounts,
          disabled: isSaving,
        },
        {
          content: "Reset defaults",
          onAction: resetToDefaults,
          destructive: true,
          disabled: isSaving || isGeneratingDiscounts,
        },
      ]}
    >
      <BlockStack gap="500">
        {bannerState.heading && bannerState.message && (
          <Banner
            title={bannerState.heading}
            status={
              bannerState.tone === "critical"
                ? "critical"
                : bannerState.tone === "success"
                  ? "success"
                  : "info"
            }
            onDismiss={() =>
              setBannerState({ tone: "info", heading: "", message: "" })
            }
          >
            <p>{bannerState.message}</p>
          </Banner>
        )}

        
              <div
              
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(300px, 360px) minmax(0, 1fr)",
                minHeight: "580px",
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                overflow: "hidden",
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: "13px",
                background: "#ffffff",
                alignItems: "stretch",
              }}

              >

          {/* ── LEFT COLUMN ── */}
          <div style={{ minWidth: 0 }}>
            <BlockStack gap="500">
              {/* Tabs Card */}
              <Card>
                <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  borderBottom: "1px solid #e5e7eb",
                  background: "#fafafa",
                }}
              >
                
              {tabs.map((tab, index) => (
                <TabButton
                  key={tab.id}
                  label={tab.content}
                  active={selectedTabIndex === index}
                  onClick={() => setSelectedTabIndex(index)}
                />
              ))}
              </div>
                <Box paddingBlockStart="400">
                  {/* ── RULES TAB ── */}
                  {selectedTabIndex === 1 && (
                    <BlockStack gap="500">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h2">
                          Milestone rules
                        </Text>
                        <Button onClick={addRule} disabled={isSaving}>
                          Add rule
                        </Button>
                      </InlineStack>

                      {draft.rules.map((rule, index) => {
                        const ruleErrors = errors.rules[rule.id] || {};
                        const syncDisplay = getSyncStatusDisplay(
                          rule.discountSyncStatus
                        );

                        return (
                          <Card key={rule.id}>
                            <BlockStack gap="400">
                              <InlineStack align="space-between">
                                <InlineStack gap="200" blockAlign="center">
                                  <Text variant="headingSm" as="h3">
                                    Tier {index + 1}
                                  </Text>
                                  {getBackendBadge(rule.type)}
                                </InlineStack>
                                <InlineStack gap="200">
                                  <Checkbox
                                    label="Active"
                                    checked={rule.enabled}
                                    onChange={(checked) =>
                                      updateRule(rule.id, "enabled", checked)
                                    }
                                  />
                                  <Button
                                    onClick={(e) => duplicateRule(e, rule)}
                                    size="slim"
                                  >
                                    Duplicate
                                  </Button>
                                  <Button
                                    onClick={(e) => removeRule(e, rule.id)}
                                    size="slim"
                                    tone="critical"
                                  >
                                    Remove
                                  </Button>
                                </InlineStack>
                              </InlineStack>

                              <FormLayout>
                                <FormLayout.Group>
                                  <Select
                                    label="Reward type"
                                    options={RULE_OPTIONS}
                                    value={rule.type}
                                    onChange={(v) =>
                                      updateRule(rule.id, "type", v)
                                    }
                                  />
                                  <TextField
                                    label="Threshold"
                                    value={rule.threshold}
                                    onChange={(v) =>
                                      updateRule(rule.id, "threshold", v)
                                    }
                                    error={ruleErrors.threshold}
                                    type="number"
                                    autoComplete="off"
                                  />
                                </FormLayout.Group>

                                <FormLayout.Group>
                                  <TextField
                                    label="Reward value"
                                    value={rule.value}
                                    onChange={(v) =>
                                      updateRule(rule.id, "value", v)
                                    }
                                    error={ruleErrors.value}
                                    placeholder={
                                      rule.type === "discount_percent"
                                        ? "10"
                                        : rule.type === "discount_fixed"
                                          ? "15"
                                          : "Optional"
                                    }
                                    type="number"
                                    autoComplete="off"
                                  />
                                  <TextField
                                    label="Label"
                                    value={rule.label}
                                    onChange={(v) =>
                                      updateRule(rule.id, "label", v)
                                    }
                                    error={ruleErrors.label}
                                    autoComplete="off"
                                  />
                                </FormLayout.Group>

                                <TextField
                                  label="Icon"
                                  value={rule.icon}
                                  onChange={(v) =>
                                    updateRule(rule.id, "icon", v)
                                  }
                                  autoComplete="off"
                                />
                              </FormLayout>

                              <GiftVariantPicker
                                rule={rule}
                                ruleErrors={ruleErrors}
                              />

                              <InlineStack gap="200" blockAlign="center">
                                <Text variant="bodySm" tone="subdued">
                                  Preview label:
                                </Text>
                                <Text variant="bodySm">
                                  {getRewardLabel(rule, formatMoney)}
                                </Text>
                              </InlineStack>

                              <Banner
                                status={
                                  syncDisplay.tone === "success"
                                    ? "success"
                                    : syncDisplay.tone === "critical"
                                      ? "critical"
                                      : "warning"
                                }
                                hideIcon
                              >
                                <InlineStack
                                  gap="200"
                                  blockAlign="center"
                                  wrap={false}
                                >
                                  <Text variant="bodySm">
                                    {syncDisplay.text}
                                  </Text>
                                  {rule.shopifyDiscountGid && (
                                    <Text
                                      variant="bodySm"
                                      tone="subdued"
                                      fontWeight="medium"
                                    >
                                      ID:{" "}
                                      {rule.shopifyDiscountGid
                                        .split("/")
                                        .pop()}
                                    </Text>
                                  )}
                                </InlineStack>
                              </Banner>
                            </BlockStack>
                          </Card>
                        );
                      })}
                    </BlockStack>
                  )}

                  {/* ── APPEARANCE TAB ── */}
                  {selectedTabIndex === 0 && (
                    <FormLayout>
                      <Select
                        label="Animation"
                        options={ANIMATION_OPTIONS}
                        value={draft.appearance.animation}
                        onChange={(v) => updateAppearance("animation", v)}
                      />
                      <FormLayout.Group>
                        <TextField
                          label="Filled color"
                          value={draft.appearance.filledColor}
                          onChange={(v) => updateAppearance("filledColor", v)}
                          type="color"
                        />
                        <TextField
                          label="Empty color"
                          value={draft.appearance.emptyColor}
                          onChange={(v) => updateAppearance("emptyColor", v)}
                          type="color"
                        />
                      </FormLayout.Group>
                      <Checkbox
                        label="Show milestones"
                        checked={draft.appearance.showMilestones}
                        onChange={(checked) =>
                          updateAppearance("showMilestones", checked)
                        }
                      />
                      <Checkbox
                        label="Compact layout"
                        checked={draft.appearance.compactMode}
                        onChange={(checked) =>
                          updateAppearance("compactMode", checked)
                        }
                      />
                    </FormLayout>
                  )}

                {/* ── LABELS TAB ── */}
                  {selectedTabIndex === 2 && (
  <>
    <BlockStack gap="400">
      <InlineStack align="space-between">
        <Text variant="headingMd" as="h2">Status</Text>
        <InlineStack gap="200">
          <Badge tone={draft.enabled ? "success" : "default"}>
            {draft.enabled ? "Enabled" : "Disabled"}
          </Badge>
          <Badge tone={hasUnsavedChanges ? "warning" : "info"}>
            {hasUnsavedChanges ? "Unsaved changes" : "Saved"}
          </Badge>
        </InlineStack>
      </InlineStack>

      <FormLayout>
        <TextField
          label="Admin title"
          value={draft.title}
          onChange={(v) => updateRoot("title", v)}
          error={errors.title}
          autoComplete="off"
        />
        <TextField
          label="Goal label"
          value={draft.goalLabel}
          onChange={(v) => updateRoot("goalLabel", v)}
          error={errors.goalLabel}
          autoComplete="off"
        />
        <Checkbox
          label="Enable widget"
          checked={draft.enabled}
          onChange={(checked) => updateRoot("enabled", checked)}
        />
      </FormLayout>
    </BlockStack>

    <Divider />
                    <FormLayout>
                      <TextField
                        label="Before goal"
                        value={draft.labels.beforeGoal}
                        onChange={(v) => updateLabel("beforeGoal", v)}
                        error={errors.labels.beforeGoal}
                        autoComplete="off"
                        helpText="Variables: {{remaining}}, {{reward}}, {{current}}, {{goal}}"
                      />
                      <TextField
                        label="Progress line"
                        value={draft.labels.progress}
                        onChange={(v) => updateLabel("progress", v)}
                        error={errors.labels.progress}
                        autoComplete="off"
                        helpText="Variables: {{current}}, {{goal}}, {{remaining}}, {{reward}}"
                      />
                      <TextField
                        label="After goal"
                        value={draft.labels.afterGoal}
                        onChange={(v) => updateLabel("afterGoal", v)}
                        error={errors.labels.afterGoal}
                        autoComplete="off"
                        helpText="Variables: {{reward}}, {{current}}, {{goal}}, {{remaining}}"
                      />
                      <TextField
                        label="Footer"
                        value={draft.labels.footer}
                        onChange={(v) => updateLabel("footer", v)}
                        error={errors.labels.footer}
                        autoComplete="off"
                      />
                    </FormLayout>
                  </>
                  )}
              {selectedTabIndex === 3 && (
                <FormLayout>
                  <Checkbox
                    label="Show on cart page"
                    checked={draft.placement.showOnCartPage}
                    onChange={(v) => updatePlacement("showOnCartPage", v)}
                  />
                  <Checkbox
                    label="Show in cart drawer"
                    checked={draft.placement.showInCartDrawer}
                    onChange={(v) => updatePlacement("showInCartDrawer", v)}
                  />
                  <Checkbox
                    label="Hide when cart is empty"
                    checked={draft.placement.hideWhenEmpty}
                    onChange={(v) => updatePlacement("hideWhenEmpty", v)}
                  />
                  <TextField
                    label="Insert selector"
                    value={draft.placement.insertSelector}
                    onChange={(v) => updatePlacement("insertSelector", v)}
                    autoComplete="off"
                    helpText="Optional CSS selector for the widget insertion point."
                  />
                  <Select
                    label="Insert position"
                    options={[
                      { label: "Beginning", value: "afterbegin" },
                      { label: "End", value: "beforeend" },
                      { label: "Before element", value: "beforebegin" },
                      { label: "After element", value: "afterend" },
                    ]}
                    value={draft.placement.insertPosition}
                    onChange={(v) => updatePlacement("insertPosition", v)}
                  />
                </FormLayout>
              )}
              </Box>
              </Card>
            </BlockStack>
          </div>

           {/* ── RIGHT COLUMN (PREVIEW) ── */}
          <div style={{ minWidth: 0, alignSelf: "stretch" }}><div style={{ position: "sticky", top: "20px", minWidth: 0 }}>
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Live preview
                  </Text>

                  <TextField
                    label="Preview cart amount"
                    value={previewCart}
                    onChange={setPreviewCart}
                    type="number"
                    prefix={currencyCode === "USD" ? "$" : ""}
                    autoComplete="off"
                  />

                  <Box
                    background="bg-surface"
                    padding="400"
                    borderRadius="200"
                    borderWidth="025"
                    borderColor="border"
                  >
                    <BlockStack gap="300">
                      <Text variant="headingSm" as="h3">
                        {previewHeadline}
                      </Text>
                      <Text variant="bodySm" tone="subdued">
                        {previewSubtext}
                      </Text>

                      {/* Custom progress bar (Polaris ProgressBar doesn't support arbitrary colors) */}
                      <div
                        style={{
                          height: 10,
                          background: draft.appearance.emptyColor,
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.round(progressPercentage)}%`,
                            height: "100%",
                            background: draft.appearance.filledColor,
                            borderRadius: 999,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>

                      <Text variant="bodySm" tone="subdued">
                        Progress toward highest reward:{" "}
                        {Math.round(progressPercentage)}%
                      </Text>

                      {draft.appearance.showMilestones && (
                        <BlockStack gap={draft.appearance.compactMode ? "100" : "200"}>
                          {enabledSortedRules.length === 0 ? (
                            <Text variant="bodySm" tone="subdued">
                              No active rules configured.
                            </Text>
                          ) : (
                            enabledSortedRules.map((rule) => {
                              const unlocked = Number(rule.threshold || 0) <= cartValue;

                              return (
                                <Box
                                  key={rule.id}
                                  background={
                                    unlocked ? "bg-surface-success" : "bg-surface-secondary"
                                  }
                                  padding={draft.appearance.compactMode ? "100" : "300"}
                                  borderRadius="200"
                                  borderWidth="025"
                                  borderColor="border"
                                >
                                  <InlineStack align="space-between" blockAlign="center">
                                    <Text variant="bodyMd">
                                      {(() => {
                                      const label = String(rule.label || "").toLowerCase();

                                      if (label.includes("shipping")) return "🚚";
                                      if (label.includes("off") || label.includes("discount")) return "🏷️";
                                      if (label.includes("gift")) return "🎁";

                                      return "🎁";
                                    })()} {rule.label}
                                    </Text>
                                    <Text variant="bodySm" tone="subdued">
                                      {unlocked
                                        ? "✓ Unlocked"
                                        : `Unlock at ${formatMoney(rule.threshold)}`}
                                    </Text>
                                  </InlineStack>
                                </Box>
                              );
                            })
                          )}
                        </BlockStack>
                      )}

                      <Text
                        variant="bodyXs"
                        tone="subdued"
                        alignment="center"
                      >
                        At checkout, only the highest unlocked tier is applied
                        automatically.
                      </Text>
                    </BlockStack>
                  </Box>

                  <Divider />

                  <Text variant="headingSm" as="h3">
                    Config summary
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    {enabledSortedRules.length} active tiers{" "}
                    {"\u2022"} {draft.appearance.animation} animation{" "}
                    {"\u2022"} highest target {formatMoney(maxGoal)}
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h2">
                      Theme embed status
                    </Text>
                    <Button
                      onClick={() => loadEmbedStatus(true)}
                      size="slim"
                      loading={embedStatus.loading}
                    >
                      Refresh
                    </Button>
                  </InlineStack>

                  <Text variant="bodySm" tone="subdued">
                    Read-only storefront status for the published theme.
                  </Text>

                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="bodyMd" fontWeight="semibold">
                      Status:
                    </Text>
                    <Badge
                      tone={embedStatus.enabled ? "success" : "default"}
                    >
                      {embedStatus.loaded
                        ? embedStatus.enabled
                          ? "Enabled"
                          : "Disabled"
                        : "Checkingâ€¦"}
                    </Badge>
                  </InlineStack>

                  {embedStatus.themeName && (
                    <Text variant="bodySm" tone="subdued">
                      Theme: {embedStatus.themeName}
                    </Text>
                  )}

                  {embedStatus.error && (
                    <Banner status="critical" hideIcon>
                      <Text variant="bodySm">{embedStatus.error}</Text>
                    </Banner>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
            </div>
          </div>
        </div>
      </BlockStack>
    </Page>
  );
}