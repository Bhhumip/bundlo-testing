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

const SURFACE = "ACCOUNT";
const PAGE_TITLE = "Customer account widgets";
const CATALOG_VERSION = 2;

const WIDGET_DEFINITIONS = [
  {
    key: "buy_again",
    legacyType: "BUNDLE",
    surfaceArea: "ACCOUNT_HOME",
    title: "Buy again / past purchases",
    shortTitle: "Buy again",
    icon: "🛒",
    description:
      "Surface items the customer bought in the past so they can buy again.",
    tone: "info",
    defaults: {
      displayMode: "INLINE",
      placement: "ACCOUNT_HOME",
      headline: "Buy again",
      subheading: "Easily repurchase items you've ordered before.",
      ctaLabel: "Add to cart",
      config: {
        maxProducts: "8",
        lookbackDays: "365",
      },
    },
  },
  {
    key: "personalized_recommendations",
    legacyType: "BUNDLE",
    surfaceArea: "ACCOUNT_HOME",
    title: "Personalized recommendations",
    shortTitle: "Personalized",
    icon: "🎯",
    description:
      "Recommend items based on account history and preferences.",
    tone: "info",
    defaults: {
      displayMode: "INLINE",
      placement: "ACCOUNT_HOME",
      headline: "Recommended for you",
      subheading: "Personalized picks based on your shopping history.",
      ctaLabel: "Add recommendation",
      config: {
        strategy: "account_history",
        fallbackProductIds: "",
        maxProducts: "6",
      },
    },
  },
  {
    key: "replenishment_reminder",
    legacyType: "ADDON",
    surfaceArea: "ACCOUNT_HOME",
    title: "Replenishment reminder",
    shortTitle: "Replenish",
    icon: "⏰",
    description:
      "Help customers reorder consumables on the right cadence from accounts.",
    tone: "warning",
    defaults: {
      displayMode: "INLINE",
      placement: "ACCOUNT_HOME",
      headline: "Time to restock?",
      subheading: "Remind customers when they're likely running low.",
      ctaLabel: "Reorder now",
      config: {
        defaultDaysSincePurchase: "30",
      },
    },
  },
  {
    key: "subscription_upgrade",
    legacyType: "ADDON",
    surfaceArea: "ACCOUNT_HOME",
    title: "Subscription upgrade",
    shortTitle: "Sub upgrade",
    icon: "🔁",
    description:
      "Upgrade existing orders or one-time purchases into subscriptions.",
    tone: "success",
    defaults: {
      displayMode: "INLINE",
      placement: "ACCOUNT_HOME",
      headline: "Upgrade to a subscription",
      subheading:
        "Turn repeat orders into a subscription with savings and convenience.",
      ctaLabel: "View subscription options",
      config: {
        productIds: "",
        savingsLabel: "Save 10%",
      },
    },
  },
  {
    key: "loyalty_rewards_reminder",
    legacyType: "ADDON",
    surfaceArea: "ACCOUNT_HOME",
    title: "Loyalty / rewards reminder",
    shortTitle: "Loyalty",
    icon: "🏅",
    description:
      "Remind customers of their points, perks, or rewards on the account page.",
    tone: "info",
    defaults: {
      displayMode: "BANNER",
      placement: "ACCOUNT_HOME",
      headline: "Your loyalty rewards",
      subheading: "Remind customers about points and available rewards.",
      ctaLabel: "View rewards",
      config: {
        programName: "",
        showPointsBalance: "true",
      },
    },
  },
  {
    key: "wishlist_to_cart",
    legacyType: "BUNDLE",
    surfaceArea: "ACCOUNT_HOME",
    title: "Wishlist / saved items to cart",
    shortTitle: "Wishlist",
    icon: "💖",
    description:
      "Surface wishlist or saved items with a quick add-to-cart action.",
    tone: "info",
    defaults: {
      displayMode: "INLINE",
      placement: "ACCOUNT_HOME",
      headline: "From your wishlist",
      subheading: "Make it easy to add saved items to the cart.",
      ctaLabel: "Add to cart",
      config: {
        maxProducts: "6",
      },
    },
  },
  {
    key: "reorder_with_discount",
    legacyType: "ADDON",
    surfaceArea: "ORDERS_LIST",
    title: "Reorder with discount",
    shortTitle: "Reorder + disc.",
    icon: "💸",
    description:
      "Offer a small discount when reordering past purchases from accounts.",
    tone: "success",
    defaults: {
      displayMode: "BANNER",
      placement: "ORDERS_LIST",
      headline: "Reorder with a limited-time discount",
      subheading: "Encourage repeat purchases with a small incentive.",
      ctaLabel: "Reorder with discount",
      config: {
        discountCode: "",
        minimumOrders: "1",
      },
    },
  },
];

const buildEditFunnelRoute = (id) => `/app/upsell/funnels/${id}`;
const widgetKeyToSlug = (widgetKey) => widgetKey.replace(/_/g, "-");
const buildWidgetManageRoute = (id, widgetKey) =>
  `/app/upsell/funnels/${id}/widgets/account/${widgetKeyToSlug(widgetKey)}`;

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
    placement: firstEnabled?.placement || "ACCOUNT_HOME",
    displayMode: firstEnabled?.displayMode || "INLINE",
    headline:
      firstEnabled?.headline || `${funnel.title || "Untitled funnel"} account widgets`,
    subheading:
      firstEnabled?.subheading ||
      "Customer account widgets managed from the app admin.",
    ctaLabel: firstEnabled?.ctaLabel || "Add now",
    internalName: `${funnel.title || "Untitled funnel"} account widget catalog`,
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
    case "ACCOUNT_HOME":
      return "Account home";
    case "ORDERS_LIST":
      return "Orders list";
    case "ORDER_DETAIL":
      return "Order detail";
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
    case "ACCOUNT_HOME":
      return "Account home";
    case "ORDERS_LIST":
      return "Orders list";
    case "ORDER_DETAIL":
      return "Order detail";
    default:
      return "Account";
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
            Open the dedicated widget page to edit full settings later.
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

export default function UpsellFunnelsWidgetsAccountsRoute() {
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

  const accountHomeDefinitions = WIDGET_DEFINITIONS.filter(
    (widget) => widget.surfaceArea === "ACCOUNT_HOME",
  );
  const ordersListDefinitions = WIDGET_DEFINITIONS.filter(
    (widget) => widget.surfaceArea === "ORDERS_LIST",
  );

  const enabledCount = WIDGET_DEFINITIONS.filter(
    (definition) => catalog[definition.key]?.enabled,
  ).length;

  const enabledAccountHomeCount = accountHomeDefinitions.filter(
    (definition) => catalog[definition.key]?.enabled,
  ).length;

  const enabledOrdersListCount = ordersListDefinitions.filter(
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
                Manage account home and orders list experiences from one customer
                account widget hub, then open each widget on its own page for deeper
                configuration later.
              </s-paragraph>
            </s-stack>

            <s-stack direction="inline" gap="small">
              <s-badge tone="info">Surface: Customer account</s-badge>
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
              label="Account home widgets"
              value={`${enabledAccountHomeCount} / ${accountHomeDefinitions.length}`}
              tone="info"
            />
            <SummaryTile
              label="Orders list widgets"
              value={`${enabledOrdersListCount} / ${ordersListDefinitions.length}`}
              tone="warning"
            />
          </s-stack>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-stack gap="small">
            <s-heading>Account Home</s-heading>
            <s-paragraph color="subdued">
              Enable account home widgets here, then open Manage to configure each
              widget on a dedicated route later.
            </s-paragraph>
          </s-stack>

          <s-stack gap="small">
            {accountHomeDefinitions.map((definition) => (
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
            <s-heading>Orders List</s-heading>
            <s-paragraph color="subdued">
              Keep orders list widgets separate so the account hub stays easier to
              scan and manage.
            </s-paragraph>
          </s-stack>

          <s-stack gap="small">
            {ordersListDefinitions.map((definition) => (
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
