import {
  Form,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
  useOutlet,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getUpsellFunnel,
  getUpsellWidget,
  createOrUpdateUpsellWidget,
} from "../models/upsell.server";
import { canShopAccessFeature } from "../featureAccess.server";

const SURFACE = "CHECKOUT";
const PAGE_TITLE = "Checkout widgets";
const CATALOG_VERSION = 3;

const WIDGET_DEFINITIONS = [
  {
    key: "one_click_upsell_at_checkout",
    legacyType: "BUNDLE",
    title: "One-click Upsell at Checkout",
    shortTitle: "One-click upsell",
    icon: "🛍️",
    description:
      "Offer a fast one-click upsell directly in the checkout extension area.",
    tone: "success",
    defaults: {
      displayMode: "INLINE",
      placement: "CHECKOUT_EXTENSION",
      headline: "Add this before you complete checkout",
      subheading: "Show a simple one-click upsell before order completion.",
      ctaLabel: "Add now",
      config: {
        productIds: "",
        maxProducts: "2",
      },
    },
  },
  {
    key: "automatic_discounts",
    legacyType: "OFFER",
    title: "Automatic Discounts",
    shortTitle: "Auto discount",
    icon: "🏷️",
    description:
      "Show and manage discount-driven checkout offers with automatic application messaging.",
    tone: "success",
    defaults: {
      displayMode: "BANNER",
      placement: "CHECKOUT_EXTENSION",
      headline: "Discount applied automatically",
      subheading: "Encourage conversion with a clear automatic discount message.",
      ctaLabel: "View savings",
      config: {
        discountCode: "",
        discountValueLabel: "10% off",
      },
    },
  },
  {
    key: "downsell_funnel",
    legacyType: "OFFER",
    title: "Downsell Funnel",
    shortTitle: "Downsell",
    icon: "↘️",
    description:
      "Offer a lower-priced fallback if the primary checkout upsell is declined.",
    tone: "warning",
    defaults: {
      displayMode: "INLINE",
      placement: "CHECKOUT_EXTENSION",
      headline: "Prefer a lighter option?",
      subheading: "Use a downsell path when shoppers skip the primary offer.",
      ctaLabel: "Choose this instead",
      config: {
        fallbackProductIds: "",
        triggerRule: "after_decline",
      },
    },
  },
  {
    key: "targeting_rules",
    legacyType: "RULE",
    title: "Targeting Rules (UTM, order value, country)",
    shortTitle: "Targeting",
    icon: "🎯",
    description:
      "Control widget visibility based on UTM, order subtotal, country, and similar rules.",
    tone: "info",
    defaults: {
      displayMode: "BANNER",
      placement: "CHECKOUT_EXTENSION",
      headline: "Smart targeting enabled",
      subheading: "Show checkout widgets only for the right shopper segments.",
      ctaLabel: "Review rules",
      config: {
        utmSource: "",
        minOrderValue: "",
        countriesCsv: "",
      },
    },
  },
  {
    key: "ab_testing",
    legacyType: "RULE",
    title: "A/B Testing",
    shortTitle: "A/B test",
    icon: "🧪",
    description:
      "Run split tests for different checkout upsell experiences and offers.",
    tone: "info",
    defaults: {
      displayMode: "BANNER",
      placement: "CHECKOUT_EXTENSION",
      headline: "Experiment is active",
      subheading: "Compare variants to improve checkout conversion.",
      ctaLabel: "View variants",
      config: {
        variantAName: "Variant A",
        variantBName: "Variant B",
        trafficSplit: "50/50",
      },
    },
  },
  {
    key: "shipping_method_rules",
    legacyType: "RULE",
    title: "Shipping Method Rules",
    shortTitle: "Shipping rules",
    icon: "🚚",
    description:
      "Show or hide widgets based on selected shipping methods or delivery options.",
    tone: "info",
    defaults: {
      displayMode: "BANNER",
      placement: "CHECKOUT_EXTENSION",
      headline: "Shipping-based logic active",
      subheading: "Customize checkout offers by delivery method.",
      ctaLabel: "Review logic",
      config: {
        methodsCsv: "",
      },
    },
  },
  {
    key: "payment_method_rules",
    legacyType: "RULE",
    title: "Payment Method Rules",
    shortTitle: "Payment rules",
    icon: "💳",
    description:
      "Trigger checkout widgets conditionally based on the selected payment method.",
    tone: "info",
    defaults: {
      displayMode: "BANNER",
      placement: "CHECKOUT_EXTENSION",
      headline: "Payment-based logic active",
      subheading: "Personalize checkout offers based on payment selection.",
      ctaLabel: "Review logic",
      config: {
        methodsCsv: "",
      },
    },
  },
  {
    key: "donations",
    legacyType: "ADDON",
    title: "Donations",
    shortTitle: "Donations",
    icon: "❤️",
    description:
      "Add a donation option in checkout so shoppers can support a cause.",
    tone: "success",
    defaults: {
      displayMode: "INLINE",
      placement: "CHECKOUT_EXTENSION",
      headline: "Add a small donation",
      subheading: "Let shoppers round up or add a contribution during checkout.",
      ctaLabel: "Donate",
      config: {
        donationAmountsCsv: "10,20,50",
        charityLabel: "",
      },
    },
  },
  {
    key: "testimonials_social_proof",
    legacyType: "BADGE",
    title: "Testimonials / Social Proof",
    shortTitle: "Social proof",
    icon: "⭐",
    description:
      "Reinforce confidence with testimonials, ratings, or trust-focused proof in checkout.",
    tone: "info",
    defaults: {
      displayMode: "BANNER",
      placement: "CHECKOUT_EXTENSION",
      headline: "Trusted by happy shoppers",
      subheading: "Show customer confidence signals before purchase completion.",
      ctaLabel: "Learn more",
      config: {
        quotesCsv: "Loved by thousands of customers,Rated 4.9/5,Fast and reliable delivery",
      },
    },
  },
  {
    key: "reward_bar_progress_bar",
    legacyType: "GOAL",
    title: "Reward Bar / Progress Bar",
    shortTitle: "Reward bar",
    icon: "📈",
    description:
      "Show progress toward a reward threshold such as free shipping, discount, or gift.",
    tone: "success",
    defaults: {
      displayMode: "BANNER",
      placement: "CHECKOUT_EXTENSION",
      headline: "You're close to unlocking a reward",
      subheading: "Encourage a larger checkout value with progress messaging.",
      ctaLabel: "Unlock reward",
      config: {
        goalAmount: "",
        rewardLabel: "Free shipping",
      },
    },
  },


  {
    key: "frequently_bought_together",
    legacyType: "BUNDLE",
    title: "Frequently Bought Together",
    shortTitle: "Freq. bought together",
    icon: "🔗",
    description: "Show products frequently purchased together to increase average order value.",
    tone: "success",
    defaults: {
      displayMode: "INLINE",
      placement: "CHECKOUT_EXTENSION",
      headline: "Customers also bought",
      subheading: "Add these popular combinations to your order.",
      ctaLabel: "Add to order",
      config: {
        productIds: "",
        maxProducts: "3",
        algorithmType: "manual",
      },
    },
  },
  {
    key: "customer_personalized_recommendation",
    legacyType: "OFFER",
    title: "Customer Personalized Recommendation",
    shortTitle: "Personalized rec.",
    icon: "🧠",
    description: "Show  product recommendations tailored to each customer's cart items  and purchase history.",
    tone: "info",
    defaults: {
      displayMode: "INLINE",
      placement: "CHECKOUT_EXTENSION",
      headline: "Picked just for you",
      subheading: "Based on your shopping history, you might love these.",
      ctaLabel: "Add to order",
      config: {
        maxProducts: "3",
        strategy: "purchase_history",
      },
    },
  },
];

const FEATURE_BY_WIDGET = {
  donations: "DONATIONS",
  testimonials_social_proof: "TESTIMONIALS",
  reward_bar_progress_bar: "FREE_GIFT",
  frequently_bought_together: "FBT_CHECKOUT",
};

const buildEditFunnelRoute = (id) => `/app/upsell/funnels/${id}`;
const widgetKeyToSlug = (widgetKey) => widgetKey.replace(/_/g, "-");
const buildWidgetManageRoute = (id, widgetKey) =>
  `/app/upsell/widgets/checkout/${widgetKeyToSlug(widgetKey)}`;

function findWidgetDefinition(widgetKey) {
  return WIDGET_DEFINITIONS.find((widget) => widget.key === widgetKey) || null;
}

function makeDefaultWidget(definition, funnel) {
  return {
    key: definition.key,
    widgetType: definition.legacyType,
    enabled: false,
    internalName: `${funnel.title || "Untitled funnel"} • ${definition.title}`,
    placement: definition.defaults.placement,
    displayMode: definition.defaults.displayMode,
    headline: definition.defaults.headline,
    subheading: definition.defaults.subheading,
    ctaLabel: definition.defaults.ctaLabel,
    config: { ...definition.defaults.config },
  };
}

function getDefaultCatalog(funnel) {
  return WIDGET_DEFINITIONS.reduce((acc, definition) => {
    acc[definition.key] = makeDefaultWidget(definition, funnel);
    return acc;
  }, {});
}

function safeJsonParse(value) {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeWidget(definition, funnel, widget) {
  const fallback = makeDefaultWidget(definition, funnel);

  return {
    ...fallback,
    ...(widget || {}),
    key: definition.key,
    widgetType: definition.legacyType,
    enabled: Boolean(widget?.enabled),
    config: {
      ...fallback.config,
      ...(widget?.config || {}),
    },
  };
}

function hydrateCatalog(funnel, existingWidget) {
  const defaults = getDefaultCatalog(funnel);

  if (!existingWidget) {
    return defaults;
  }

  const parsedNotes = safeJsonParse(existingWidget.notes);

  if (
    parsedNotes &&
    parsedNotes.widgets &&
    typeof parsedNotes.widgets === "object"
  ) {
    return WIDGET_DEFINITIONS.reduce((acc, definition) => {
      const savedWidget = parsedNotes.widgets[definition.key];
      acc[definition.key] = normalizeWidget(definition, funnel, savedWidget);
      return acc;
    }, {});
  }

  return defaults;
}

function buildPersistencePayload(funnel, catalog) {
  const firstEnabled =
    WIDGET_DEFINITIONS.map((definition) => catalog[definition.key]).find(
      (widget) => widget?.enabled,
    ) || catalog[WIDGET_DEFINITIONS[0].key];

  return {
    widgetType: firstEnabled?.widgetType || "ADDON",
    placement: firstEnabled?.placement || "CHECKOUT_EXTENSION",
    displayMode: firstEnabled?.displayMode || "INLINE",
    headline:
      firstEnabled?.headline ||
      `${funnel.title || "Untitled funnel"} checkout widgets`,
    subheading:
      firstEnabled?.subheading ||
      "Checkout widgets managed from the app admin.",
    ctaLabel: firstEnabled?.ctaLabel || "Add now",
    internalName: `${funnel.title || "Untitled funnel"} checkout widget catalog`,
    notes: JSON.stringify(
      {
        version: CATALOG_VERSION,
        widgets: catalog,
      },
      null,
      2,
    ),
  };
}

function formatPlacement(placement) {
  switch (placement) {
    case "CHECKOUT_EXTENSION":
      return "Checkout extension";
    default:
      return placement || "Placement not set";
  }
}

function formatDisplayMode(displayMode) {
  switch (displayMode) {
    case "INLINE":
      return "Inline";
    case "BANNER":
      return "Banner";
    case "BAR":
      return "Bar";
    default:
      return displayMode || "Mode not set";
  }
}

function toneForWidget(definition) {
  if (definition.tone === "success") return "success";
  if (definition.tone === "warning") return "warning";
  if (definition.tone === "critical") return "critical";
  return "info";
}

export const loader = async ({ request, params }) => {
  const { session, redirect } = await authenticate.admin(request);
  const funnel = await getUpsellFunnel(session.shop, params.id);

  if (!funnel) {
    throw new Response("Not Found", { status: 404 });
  }

  if (funnel.surface !== SURFACE) {
    return redirect(`/app/upsell/funnels/${params.id}/widgets`);
  }

  const existingWidget = await getUpsellWidget(session.shop, params.id);
  const catalog = hydrateCatalog(funnel, existingWidget);

  const featureAccess = {};

  for (const definition of WIDGET_DEFINITIONS) {
    const featureKey = FEATURE_BY_WIDGET[definition.key];

    if (featureKey) {
      featureAccess[definition.key] = await canShopAccessFeature(
        session.shop,
        featureKey
      );
    } else {
      featureAccess[definition.key] = true;
    }
  }

  return {
    funnel,
    catalog,
    featureAccess,
  };
};

export const action = async ({ request, params }) => {
  const { session, redirect } = await authenticate.admin(request);
  const funnel = await getUpsellFunnel(session.shop, params.id);

  if (!funnel) throw new Response("Not Found", { status: 404 });
  if (funnel.surface !== SURFACE) return redirect(`/app/upsell/funnels/${params.id}/widgets`);

  const existingWidget = await getUpsellWidget(session.shop, params.id);
  const catalog = hydrateCatalog(funnel, existingWidget);

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const widgetKey = String(formData.get("widgetKey") || "").trim();
  const definition = findWidgetDefinition(widgetKey);

  if (!definition || !catalog[definition.key]) {
    return { ok: false, saved: false, catalog, errors: {}, message: "Unsupported widget." };
  }

  if (intent === "toggle-widget") {
    catalog[definition.key] = {
      ...catalog[definition.key],
      enabled: !catalog[definition.key].enabled,
    };
    await createOrUpdateUpsellWidget(session.shop, params.id, buildPersistencePayload(funnel, catalog));
    return {
      ok: true, saved: true, catalog, errors: {},
      message: `${definition.title} ${catalog[definition.key].enabled ? "enabled" : "disabled"}.`,
    };
  }


  if (intent === "save-widget-theme") {
    const themeRaw = String(formData.get("theme") || "{}");
    const theme = safeJsonParse(themeRaw) || {};
    console.log("💾 Saving theme for widget:", widgetKey);
    console.log("💾 Theme payload:", JSON.stringify(theme, null, 2));

    catalog[definition.key] = {
      ...catalog[definition.key],
      theme,
    };
    const payload = buildPersistencePayload(funnel, catalog);

    console.log("💾 Full notes being saved:", payload.notes);
    await createOrUpdateUpsellWidget(
      session.shop,
      params.id,
      buildPersistencePayload(funnel, catalog),
    );
    return { ok: true, saved: true, catalog, errors: {}, message: "Theme saved." };
  }


  if (intent === "save-widget-config") {
    const configRaw = String(formData.get("config") || "{}");
    const config = safeJsonParse(configRaw) || {};
    catalog[definition.key] = {
      ...catalog[definition.key],
      config: {
        ...catalog[definition.key].config,
        ...config,
      },
    };
    await createOrUpdateUpsellWidget(
      session.shop,
      params.id,
      buildPersistencePayload(funnel, catalog),
    );
    return { ok: true, saved: true, catalog, errors: {}, message: "Config saved." };
  }

  return { ok: false, saved: false, catalog, errors: {}, message: "Unsupported action." };
};

function StatusBadge({ enabled }) {
  return (
    <s-badge tone={enabled ? "success" : "info"}>
      {enabled ? "Enabled" : "Disabled"}
    </s-badge>
  );
}

function SummaryTile({ label, value, tone = "info" }) {
  return (
    <s-box padding="base" border="base" borderRadius="base" background="base">
      <s-stack gap="small">
        <s-text color="subdued">{label}</s-text>
        <s-heading>{value}</s-heading>
        <s-badge tone={tone}>{label}</s-badge>
      </s-stack>
    </s-box>
  );
}

function WidgetCard({ funnelId, definition, widget, navigate, busyWidgetKey, hasAccess,}) {
  const isBusy = busyWidgetKey === definition.key;

  return (
    <s-box padding="base" border="base" borderRadius="base" background="base">
      <s-stack gap="base">
        <s-stack
          direction="inline"
          justifyContent="space-between"
          alignItems="start"
        >
          <s-stack direction="inline" gap="small" alignItems="start">
            <s-box
              padding="small"
              border="base"
              borderRadius="base"
              background="subdued"
            >
              <s-text>{definition.icon}</s-text>
            </s-box>

            <s-stack gap="small">
              <s-heading>{definition.title}</s-heading>
              <s-paragraph color="subdued">{definition.description}</s-paragraph>

              <s-stack direction="inline" gap="small">
                <s-badge tone={toneForWidget(definition)}>
                  {definition.legacyType}
                </s-badge>
                <s-badge>{formatPlacement(widget.placement)}</s-badge>
                <s-badge>{formatDisplayMode(widget.displayMode)}</s-badge>
              </s-stack>
            </s-stack>
          </s-stack>

          <StatusBadge enabled={widget.enabled} />
        </s-stack>

        <s-stack
          direction="inline"
          justifyContent="space-between"
          alignItems="center"
        >
          <s-text color="subdued">
            Open the dedicated widget page to edit full settings later.
          </s-text>

          <s-stack direction="inline" gap="small">
            {hasAccess ? (
              <s-button
                variant="secondary"
                onClick={() =>
                  navigate(buildWidgetManageRoute(funnelId, definition.key))
                }
              >
                Manage
              </s-button>
            ) : (
              <s-button
                variant="secondary"
                onClick={() => navigate("/app/billing")}
              >
                Upgrade plan
              </s-button>
            )}

            {hasAccess && (
              <Form method="post">
                <input type="hidden" name="intent" value="toggle-widget" />
                <input type="hidden" name="widgetKey" value={definition.key} />

                <s-button
                  type="submit"
                  variant={widget.enabled ? "secondary" : "primary"}
                  tone={widget.enabled ? "critical" : "auto"}
                  disabled={isBusy}
                >
                  {isBusy
                    ? "Saving..."
                    : widget.enabled
                      ? "Disable"
                      : "Enable"}
                </s-button>
              </Form>
            )}
          </s-stack>
        </s-stack>
      </s-stack>
    </s-box>
  );
}

export default function UpsellFunnelsWidgetsCheckoutRoute() {
  const outlet = useOutlet();
  const { funnel, catalog: loaderCatalog, featureAccess,} = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const navigate = useNavigate();

  if (outlet) {
    return outlet;
  }

  const catalog = actionData?.catalog || loaderCatalog;
  const message = actionData?.message || "";

  const enabledCount = WIDGET_DEFINITIONS.filter(
    (definition) => catalog[definition.key]?.enabled,
  ).length;

  const offerWidgets = WIDGET_DEFINITIONS.filter((definition) =>
    ["BUNDLE", "OFFER", "ADDON", "GOAL"].includes(definition.legacyType),
  );

  const ruleWidgets = WIDGET_DEFINITIONS.filter((definition) =>
    ["RULE", "BADGE"].includes(definition.legacyType),
  );

  const busyWidgetKey =
    navigation.state === "submitting"
      ? navigation.formData?.get("widgetKey") || ""
      : "";

  return (
    <s-page heading={PAGE_TITLE}>
      <s-button
        slot="secondary-actions"
        variant="secondary"
        onClick={() => navigate(buildEditFunnelRoute(funnel.id))}
      >
        Back to funnel
      </s-button>

      <s-section>
        <s-box padding="base" border="base" borderRadius="base" background="base">
          <s-stack gap="base">
            <s-stack gap="small">
              <s-heading>{funnel.title || "Untitled funnel"}</s-heading>
              <s-paragraph color="subdued">
                Manage checkout extension widgets from a single hub, then open each
                widget on its own page when you want to configure detailed settings.
              </s-paragraph>
            </s-stack>

            <s-stack direction="inline" gap="small">
              <s-badge tone="info">Surface: Checkout</s-badge>
              <s-badge tone="success">{enabledCount} enabled</s-badge>
              <s-badge tone="info">{WIDGET_DEFINITIONS.length} available</s-badge>
            </s-stack>

            {message ? (
              <s-banner tone={actionData?.ok ? "success" : "critical"}>
                {message}
              </s-banner>
            ) : null}
          </s-stack>
        </s-box>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-heading>Overview</s-heading>

          <s-stack direction="inline" gap="base">
            <SummaryTile
              label="Enabled widgets"
              value={`${enabledCount}`}
              tone="success"
            />
            <SummaryTile
              label="Offer widgets"
              value={`${offerWidgets.length}`}
              tone="info"
            />
            <SummaryTile
              label="Rule and proof widgets"
              value={`${ruleWidgets.length}`}
              tone="warning"
            />
          </s-stack>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-stack gap="small">
            <s-heading>Checkout Upsell Extensions</s-heading>
            <s-paragraph color="subdued">
              Enable or disable checkout widgets here. Use Manage to open the
              dedicated page for each widget later.
            </s-paragraph>
          </s-stack>

          <s-stack gap="small">
            {WIDGET_DEFINITIONS.map((definition) => (
              <WidgetCard
                key={definition.key}
                funnelId={funnel.id}
                definition={definition}
                widget={catalog[definition.key]}
                navigate={navigate}
                busyWidgetKey={busyWidgetKey}
                hasAccess={featureAccess[definition.key]}
              />
            ))}
          </s-stack>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);