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

const SURFACE = "PDP";
const PAGE_TITLE = "Product page widgets";
const CATALOG_VERSION = 2;

const WIDGET_DEFINITIONS = [
  {
    key: "frequently_bought_together",
    legacyType: "BUNDLE",
    title: "Frequently Bought Together",
    shortTitle: "FBT",
    icon: "🛒",
    description:
      "Amazon-style widget that shows products commonly purchased together.",
    tone: "success",
    defaults: {
      displayMode: "INLINE",
      placement: "BELOW_BUY_BOX",
      headline: "Frequently Bought Together",
      subheading: "Show complementary items shoppers often buy with this product.",
      ctaLabel: "Add bundle",
      config: {
        productIds: "",
        maxProducts: "3",
        discountLabel: "Save 10% when bought together",
      },
    },
  },
  {
    key: "related_products",
    legacyType: "BUNDLE",
    title: 'Related Products / "You May Also Like"',
    shortTitle: "Related",
    icon: "🧩",
    description:
      "Show related or complementary products based on rules, tags, or collections.",
    tone: "info",
    defaults: {
      displayMode: "INLINE",
      placement: "BELOW_DETAILS",
      headline: "You may also like",
      subheading: "Suggest related products that fit this product context.",
      ctaLabel: "Add to cart",
      config: {
        rulesJson: "",
        fallbackProductIds: "",
        maxProducts: "4",
      },
    },
  },
  {
    key: "product_addons",
    legacyType: "ADDON",
    title: "Product Add-ons (one-click)",
    shortTitle: "Add-ons",
    icon: "➕",
    description:
      "Offer one-click add-ons like gift wrap, warranty, accessories, or setup options.",
    tone: "info",
    defaults: {
      displayMode: "INLINE",
      placement: "BELOW_BUY_BOX",
      headline: "Add more to your order",
      subheading: "Offer quick one-click add-ons that pair well with this product.",
      ctaLabel: "Add add-on",
      config: {
        productIds: "",
        maxProducts: "3",
      },
    },
  },
  {
    key: "bogo_buy_x_get_y",
    legacyType: "OFFER",
    title: "BOGO / Buy X Get Y",
    shortTitle: "BOGO",
    icon: "🎁",
    description:
      "Promote buy-one-get-one or buy-X-get-Y offers directly on the product page.",
    tone: "warning",
    defaults: {
      displayMode: "BANNER",
      placement: "BELOW_BUY_BOX",
      headline: "Special offer available",
      subheading: "Reward shoppers with a Buy X Get Y promotion on this item.",
      ctaLabel: "Claim offer",
      config: {
        buyQuantity: "1",
        getQuantity: "1",
        rewardProductIds: "",
        offerLabel: "Buy 1 Get 1 Free",
      },
    },
  },
  {
    key: "volume_discounts",
    legacyType: "OFFER",
    title: "Volume Discounts / Quantity Breaks",
    shortTitle: "Volume",
    icon: "📦",
    description:
      "Encourage larger purchases with quantity-based discounts and break pricing.",
    tone: "success",
    defaults: {
      displayMode: "INLINE",
      placement: "BELOW_BUY_BOX",
      headline: "Save more when you buy more",
      subheading: "Show tiered pricing and quantity break offers on the PDP.",
      ctaLabel: "View savings",
      config: {
        tiersJson:
          '[{"qty":"2","discount":"10%"},{"qty":"3","discount":"15%"},{"qty":"5","discount":"20%"}]',
        defaultQuantity: "1",
      },
    },
  },
  {
    key: "mix_match_bundle_builder",
    legacyType: "BUNDLE",
    title: "Mix & Match Bundle Builder",
    shortTitle: "Mix & Match",
    icon: "🧺",
    description:
      "Let shoppers build their own bundle from a selected product group.",
    tone: "info",
    defaults: {
      displayMode: "INLINE",
      placement: "BELOW_DETAILS",
      headline: "Build your bundle",
      subheading: "Allow customers to mix and match products into one bundle.",
      ctaLabel: "Build bundle",
      config: {
        collectionIds: "",
        minItems: "2",
        maxItems: "4",
        bundleDiscountLabel: "Bundle and save 15%",
      },
    },
  },
  {
    key: "free_gift_with_product",
    legacyType: "OFFER",
    title: "Free Gift with Product",
    shortTitle: "Free Gift",
    icon: "🎀",
    description:
      "Offer a free gift automatically or conditionally when this product is purchased.",
    tone: "success",
    defaults: {
      displayMode: "BANNER",
      placement: "BELOW_BUY_BOX",
      headline: "Free gift included",
      subheading: "Increase conversion with a free gift tied to this product.",
      ctaLabel: "See gift",
      config: {
        giftProductId: "",
        minQuantity: "1",
        giftLabel: "Free gift with purchase",
      },
    },
  },
  {
    key: "promotion_social_proof_badges",
    legacyType: "BADGE",
    title: "Promotion / Social Proof Badges",
    shortTitle: "Badges",
    icon: "🏷️",
    description:
      "Show urgency, trust, promo, bestseller, or popularity badges on the PDP.",
    tone: "info",
    defaults: {
      displayMode: "BANNER",
      placement: "BELOW_BUY_BOX",
      headline: "Why shoppers love this",
      subheading: "Highlight social proof, urgency, or promotional messages.",
      ctaLabel: "Learn more",
      config: {
        badgesCsv: "Best Seller,Limited Time Offer,Fast Shipping",
      },
    },
  },
  {
    key: "ai_powered_recommendations",
    legacyType: "BUNDLE",
    title: "AI-powered Recommendations",
    shortTitle: "AI Recs",
    icon: "🤖",
    description:
      "Use AI or ranking logic to show context-aware recommendations for this product.",
    tone: "info",
    defaults: {
      displayMode: "INLINE",
      placement: "BELOW_DETAILS",
      headline: "Recommended for you",
      subheading: "Let AI decide the best products to recommend on this PDP.",
      ctaLabel: "Add recommendation",
      config: {
        strategy: "product_context",
        fallbackProductIds: "",
        maxProducts: "4",
      },
    },
  },
  {
    key: "spending_goal_progress_bar",
    legacyType: "GOAL",
    title: "Spending Goal / Progress Bar on PDP",
    shortTitle: "Goal Bar",
    icon: "📈",
    description:
      "Show progress toward a cart threshold such as free shipping, free gift, or discount.",
    tone: "warning",
    defaults: {
      displayMode: "BANNER",
      placement: "BELOW_BUY_BOX",
      headline: "You're close to unlocking a reward",
      subheading: "Motivate shoppers with a spending goal progress bar on product pages.",
      ctaLabel: "Unlock reward",
      config: {
        goalType: "free_shipping",
        goalAmount: "999",
        rewardLabel: "Free shipping unlocked",
      },
    },
  },
];

const buildEditFunnelRoute = (id) => `/app/upsell/funnels/${id}`;
const widgetKeyToSlug = (widgetKey) => widgetKey.replace(/_/g, "-");
const buildWidgetManageRoute = (id, widgetKey) =>
  `/app/upsell/funnels/${id}/widgets/pdp/${widgetKeyToSlug(widgetKey)}`;

export function findWidgetDefinition(widgetKey) {
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
    placement: firstEnabled?.placement || "BELOW_BUY_BOX",
    displayMode: firstEnabled?.displayMode || "INLINE",
    headline:
      firstEnabled?.headline ||
      `${funnel.title || "Untitled funnel"} product page widgets`,
    subheading:
      firstEnabled?.subheading ||
      "Product page widgets managed from the app admin.",
    ctaLabel: firstEnabled?.ctaLabel || "Add now",
    internalName: `${funnel.title || "Untitled funnel"} PDP widget catalog`,
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
    case "BELOW_BUY_BOX":
      return "Below buy box";
    case "BELOW_DETAILS":
      return "Below details";
    case "SIDEBAR":
      return "Sidebar";
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
    default:
      return displayMode || "Mode not set";
  }
}

function toneForWidget(definition) {
  if (definition.tone === "success") return "success";
  if (definition.tone === "warning") return "warning";
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

  return {
    funnel,
    catalog,
  };
};

export const action = async ({ request, params }) => {
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

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const widgetKey = String(formData.get("widgetKey") || "").trim();
  const definition = findWidgetDefinition(widgetKey);

  if (!definition || !catalog[definition.key]) {
    return {
      ok: false,
      saved: false,
      catalog,
      errors: {},
      message: "Unsupported widget.",
    };
  }

  if (intent === "toggle-widget") {
    catalog[definition.key] = {
      ...catalog[definition.key],
      enabled: !catalog[definition.key].enabled,
    };

    await createOrUpdateUpsellWidget(
      session.shop,
      params.id,
      buildPersistencePayload(funnel, catalog),
    );

    return {
      ok: true,
      saved: true,
      catalog,
      errors: {},
      message: `${definition.title} ${
        catalog[definition.key].enabled ? "enabled" : "disabled"
      }.`,
    };
  }

  return {
    ok: false,
    saved: false,
    catalog,
    errors: {},
    message: "Unsupported action.",
  };
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

function WidgetCard({ funnelId, definition, widget, navigate, busyWidgetKey }) {
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

        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-text color="subdued">
            Settings will open on a dedicated widget page.
          </s-text>

          <s-stack direction="inline" gap="small">
            <s-button
              variant="secondary"
              onClick={() => navigate(buildWidgetManageRoute(funnelId, definition.key))}
            >
              Manage
            </s-button>

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
          </s-stack>
        </s-stack>
      </s-stack>
    </s-box>
  );
}

export default function UpsellFunnelsWidgetsPdpRoute() {
  const outlet = useOutlet();
  const { funnel, catalog: loaderCatalog } = useLoaderData();
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
                Keep this page focused on activation and navigation. Open each
                widget on its own page to manage settings later.
              </s-paragraph>
            </s-stack>

            <s-stack direction="inline" gap="small">
              <s-badge tone="info">Surface: Product page</s-badge>
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
              label="Available widgets"
              value={`${WIDGET_DEFINITIONS.length}`}
              tone="info"
            />
            <SummaryTile
              label="Setup model"
              value="Separate pages"
              tone="warning"
            />
          </s-stack>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-stack gap="small">
            <s-heading>PDP widgets</s-heading>
            <s-paragraph color="subdued">
              Use this page as the widget hub. Turn widgets on or off here, then
              open Manage to edit each widget in its own route.
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
