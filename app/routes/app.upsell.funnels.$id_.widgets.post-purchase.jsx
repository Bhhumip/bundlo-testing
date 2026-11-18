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

const SURFACE = "POST_PURCHASE";
const PAGE_TITLE = "Post-purchase widgets";
const CATALOG_VERSION = 2;

const WIDGET_DEFINITIONS = [
  {
    key: "post_purchase_one_click_upsell",
    legacyType: "ADDON",
    surfaceArea: "THANK_YOU_PAGE",
    title: "Post-purchase One-click Upsell",
    shortTitle: "One-click upsell",
    icon: "⬆️",
    description:
      "Offer a single high-value upsell immediately after checkout with one click.",
    tone: "success",
    defaults: {
      displayMode: "INLINE",
      placement: "THANK_YOU_PAGE",
      headline: "Upgrade your order in one click",
      subheading: "Add a high-value offer without re-entering payment details.",
      ctaLabel: "Add upsell",
      config: {
        productId: "",
        maxQuantity: "1",
      },
    },
  },
  {
    key: "downsell_offer",
    legacyType: "ADDON",
    surfaceArea: "THANK_YOU_PAGE",
    title: "Downsell Offer",
    shortTitle: "Downsell",
    icon: "↘️",
    description:
      "If the primary upsell is skipped, show a lighter fallback offer on the thank you page.",
    tone: "warning",
    defaults: {
      displayMode: "INLINE",
      placement: "THANK_YOU_PAGE",
      headline: "Prefer a lighter option?",
      subheading: "Offer a lower-priced fallback after the main upsell is declined.",
      ctaLabel: "Add downsell",
      config: {
        productId: "",
        triggerRule: "after_upsell_decline",
      },
    },
  },
  {
    key: "cross_sell_on_thank_you_page",
    legacyType: "BUNDLE",
    surfaceArea: "THANK_YOU_PAGE",
    title: "Cross-sell on Thank You Page",
    shortTitle: "Cross-sell",
    icon: "🧩",
    description:
      "Present complementary products that can be added after checkout.",
    tone: "info",
    defaults: {
      displayMode: "INLINE",
      placement: "THANK_YOU_PAGE",
      headline: "You may also like",
      subheading: "Suggest relevant products that complement the completed order.",
      ctaLabel: "Add to order",
      config: {
        productIds: "",
        maxProducts: "3",
      },
    },
  },
  {
    key: "order_status_page_upsell",
    legacyType: "BUNDLE",
    surfaceArea: "ORDER_STATUS_PAGE",
    title: "Order Status Page Upsell",
    shortTitle: "Order status upsell",
    icon: "📦",
    description:
      "Show targeted upsell offers on the customer order status page.",
    tone: "info",
    defaults: {
      displayMode: "INLINE",
      placement: "ORDER_STATUS_PAGE",
      headline: "Add something before fulfillment",
      subheading: "Keep selling from the order status page with contextual offers.",
      ctaLabel: "Add offer",
      config: {
        productIds: "",
        maxProducts: "2",
      },
    },
  },
  {
    key: "coupons_discount_on_thank_you",
    legacyType: "ADDON",
    surfaceArea: "THANK_YOU_PAGE",
    title: "Coupons / Discount on Thank You",
    shortTitle: "Coupon",
    icon: "🏷️",
    description:
      "Display a thank-you coupon or post-purchase discount for a future purchase.",
    tone: "success",
    defaults: {
      displayMode: "BANNER",
      placement: "THANK_YOU_PAGE",
      headline: "A special thank-you discount just for you",
      subheading: "Reward the customer with a coupon after purchase.",
      ctaLabel: "Copy code",
      config: {
        couponCode: "",
        discountLabel: "10% off your next order",
      },
    },
  },
  {
    key: "rokt_thanks_third_party_monetization",
    legacyType: "ADDON",
    surfaceArea: "THANK_YOU_PAGE",
    title: "Rokt Thanks (3rd-party monetization)",
    shortTitle: "Rokt Thanks",
    icon: "💼",
    description:
      "Integrate a third-party monetization placement on the thank you page.",
    tone: "info",
    defaults: {
      displayMode: "BANNER",
      placement: "THANK_YOU_PAGE",
      headline: "Sponsored offers enabled",
      subheading: "Use a third-party monetization slot after checkout.",
      ctaLabel: "View placement",
      config: {
        placementKey: "",
        providerLabel: "Rokt Thanks",
      },
    },
  },
  {
    key: "reviews_request_on_thank_you",
    legacyType: "ADDON",
    surfaceArea: "THANK_YOU_PAGE",
    title: "Reviews Request on Thank You",
    shortTitle: "Review request",
    icon: "⭐",
    description:
      "Prompt customers for a review or feedback after the purchase is completed.",
    tone: "success",
    defaults: {
      displayMode: "BANNER",
      placement: "THANK_YOU_PAGE",
      headline: "Tell us what you think",
      subheading: "Invite the customer to leave a review after checkout.",
      ctaLabel: "Leave a review",
      config: {
        providerName: "",
        delayMinutes: "0",
      },
    },
  },
  {
    key: "ai_powered_templates",
    legacyType: "ADDON",
    surfaceArea: "THANK_YOU_PAGE",
    title: "AI-powered Templates",
    shortTitle: "AI templates",
    icon: "🤖",
    description:
      "Use AI-assisted thank you page templates and messaging variations.",
    tone: "info",
    defaults: {
      displayMode: "BANNER",
      placement: "THANK_YOU_PAGE",
      headline: "AI-optimized thank you experience",
      subheading: "Use AI-generated layouts or messaging tailored to the order context.",
      ctaLabel: "Preview template",
      config: {
        templateType: "thank_you_offer",
        promptLabel: "optimize_by_order_context",
      },
    },
  },
];

const buildEditFunnelRoute = (id) => `/app/upsell/funnels/${id}`;
const widgetKeyToSlug = (widgetKey) => widgetKey.replace(/_/g, "-");
const buildWidgetManageRoute = (id, widgetKey) =>
  `/app/upsell/funnels/${id}/widgets/post-purchase/${widgetKeyToSlug(widgetKey)}`;

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
    placement: firstEnabled?.placement || "THANK_YOU_PAGE",
    displayMode: firstEnabled?.displayMode || "INLINE",
    headline:
      firstEnabled?.headline ||
      `${funnel.title || "Untitled funnel"} post-purchase widgets`,
    subheading:
      firstEnabled?.subheading ||
      "Post-purchase widgets managed from the app admin.",
    ctaLabel: firstEnabled?.ctaLabel || "Add now",
    internalName: `${funnel.title || "Untitled funnel"} post-purchase widget catalog`,
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
    case "THANK_YOU_PAGE":
      return "Thank you page";
    case "ORDER_STATUS_PAGE":
      return "Order status page";
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

function formatSurfaceArea(surfaceArea) {
  switch (surfaceArea) {
    case "THANK_YOU_PAGE":
      return "Thank you page";
    case "ORDER_STATUS_PAGE":
      return "Order status page";
    default:
      return "Post-purchase";
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
                <s-badge>{formatSurfaceArea(definition.surfaceArea)}</s-badge>
                <s-badge>{formatPlacement(widget.placement)}</s-badge>
                <s-badge>{formatDisplayMode(widget.displayMode)}</s-badge>
              </s-stack>
            </s-stack>
          </s-stack>

          <StatusBadge enabled={widget.enabled} />
        </s-stack>

        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-text color="subdued">
            Settings can be managed from the dedicated widget page.
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

export default function UpsellFunnelsWidgetsPostPurchaseRoute() {
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

  const thankYouDefinitions = WIDGET_DEFINITIONS.filter(
    (widget) => widget.surfaceArea === "THANK_YOU_PAGE",
  );
  const orderStatusDefinitions = WIDGET_DEFINITIONS.filter(
    (widget) => widget.surfaceArea === "ORDER_STATUS_PAGE",
  );

  const enabledCount = WIDGET_DEFINITIONS.filter(
    (definition) => catalog[definition.key]?.enabled,
  ).length;

  const enabledThankYouCount = thankYouDefinitions.filter(
    (definition) => catalog[definition.key]?.enabled,
  ).length;

  const enabledOrderStatusCount = orderStatusDefinitions.filter(
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
                Manage thank you page and order status page experiences from one
                post-purchase widget hub, then open each widget on its own page for
                deeper configuration later.
              </s-paragraph>
            </s-stack>

            <s-stack direction="inline" gap="small">
              <s-badge tone="info">Surface: Post-purchase</s-badge>
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
              label="Thank you page widgets"
              value={`${enabledThankYouCount} / ${thankYouDefinitions.length}`}
              tone="info"
            />
            <SummaryTile
              label="Order status widgets"
              value={`${enabledOrderStatusCount} / ${orderStatusDefinitions.length}`}
              tone="warning"
            />
          </s-stack>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-stack gap="small">
            <s-heading>Thank You Page</s-heading>
            <s-paragraph color="subdued">
              Enable thank you page widgets here, then open Manage to configure
              each one on a dedicated route later.
            </s-paragraph>
          </s-stack>

          <s-stack gap="small">
            {thankYouDefinitions.map((definition) => (
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

      <s-section>
        <s-stack gap="base">
          <s-stack gap="small">
            <s-heading>Order Status Page</s-heading>
            <s-paragraph color="subdued">
              Keep order status page upsells separate so post-purchase surfaces stay
              easy to scan and manage.
            </s-paragraph>
          </s-stack>

          <s-stack gap="small">
            {orderStatusDefinitions.map((definition) => (
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
