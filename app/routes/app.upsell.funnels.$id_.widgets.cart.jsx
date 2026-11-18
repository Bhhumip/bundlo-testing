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
import { canShopAccessFeature,requireFeatureAccess } from "../featureAccess.server";

const SURFACE = "CART";
const PAGE_TITLE = "Cart widgets";
const CATALOG_VERSION = 2;

const WIDGET_DEFINITIONS = [
  {
    key: "in_cart_upsell_cross_sell",
    legacyType: "BUNDLE",
    surfaceArea: "CART_DRAWER",
    title: "In-cart Upsell / Cross-sell",
    shortTitle: "Cross-sell",
    icon: "🧩",
    description:
      "Show complementary products directly inside the cart drawer before checkout.",
    tone: "info",
    defaults: {
      displayMode: "INLINE",
      placement: "CART_DRAWER",
      headline: "You may also like",
      subheading: "Recommend relevant add-ons before checkout.",
      ctaLabel: "Add",
      config: {
        productIds: "",
        maxProducts: "3",
      },
    },
  },
  {
    key: "free_shipping_progress_bar",
    legacyType: "ADDON",
    surfaceArea: "CART_DRAWER",
    title: "Free Shipping Progress Bar",
    shortTitle: "Shipping bar",
    icon: "🚚",
    description:
      "Show progress toward a free shipping threshold in the cart drawer.",
    tone: "success",
    defaults: {
      displayMode: "BAR",
      placement: "CART_DRAWER",
      headline: "You're close to free shipping",
      subheading: "Encourage a higher cart value with a clear progress bar.",
      ctaLabel: "Keep shopping",
      config: {
        goalAmount: "",
        rewardLabel: "Free shipping",
      },
    },
  },
  {
    key: "countdown_timer_urgency",
    legacyType: "ADDON",
    surfaceArea: "CART_DRAWER",
    title: "Countdown Timer / Urgency",
    shortTitle: "Timer",
    icon: "⏰",
    description:
      "Create urgency in the cart drawer with a timer or expiring offer message.",
    tone: "warning",
    defaults: {
      displayMode: "BAR",
      placement: "CART_DRAWER",
      headline: "Limited-time offer",
      subheading: "Add urgency right before shoppers complete checkout.",
      ctaLabel: "Check out now",
      config: {
        deadlineIso: "",
      },
    },
  },
  {
    key: "sticky_cart",
    legacyType: "ADDON",
    surfaceArea: "CART_DRAWER",
    title: "Sticky Cart",
    shortTitle: "Sticky cart",
    icon: "🧲",
    description:
      "Keep key cart actions and totals visible while shoppers interact with the drawer.",
    tone: "info",
    defaults: {
      displayMode: "BAR",
      placement: "CART_DRAWER",
      headline: "Your cart is ready",
      subheading: "Keep the checkout action visible at all times.",
      ctaLabel: "Checkout",
      config: {
        stickyPosition: "bottom",
      },
    },
  },
  {
    key: "discount_code_field",
    legacyType: "ADDON",
    surfaceArea: "CART_DRAWER",
    title: "Discount Code Field",
    shortTitle: "Discount code",
    icon: "🏷️",
    description:
      "Let shoppers apply or preview discount codes from the cart drawer.",
    tone: "info",
    defaults: {
      displayMode: "INLINE",
      placement: "CART_DRAWER",
      headline: "Have a discount code?",
      subheading: "Allow discount entry before checkout.",
      ctaLabel: "Apply code",
      config: {
        placeholder: "Enter code",
      },
    },
  },
  {
    key: "order_notes",
    legacyType: "ADDON",
    surfaceArea: "CART_DRAWER",
    title: "Order Notes",
    shortTitle: "Order notes",
    icon: "📝",
    description:
      "Collect special instructions directly in the cart drawer.",
    tone: "info",
    defaults: {
      displayMode: "INLINE",
      placement: "CART_DRAWER",
      headline: "Add a note to your order",
      subheading: "Collect delivery notes, gift notes, or special requests.",
      ctaLabel: "Save note",
      config: {
        maxLength: "250",
      },
    },
  },
  {
    key: "gift_wrap",
    legacyType: "ADDON",
    surfaceArea: "CART_DRAWER",
    title: "Gift Wrap",
    shortTitle: "Gift wrap",
    icon: "🎁",
    description:
      "Offer gift wrap or premium packaging directly in the cart drawer.",
    tone: "success",
    defaults: {
      displayMode: "INLINE",
      placement: "CART_DRAWER",
      headline: "Add gift wrap",
      subheading: "Offer premium gift packaging before checkout.",
      ctaLabel: "Add gift wrap",
      config: {
        productId: "",
      },
    },
  },
  {
    key: "shipping_protection",
    legacyType: "ADDON",
    surfaceArea: "CART_DRAWER",
    title: "Shipping Protection",
    shortTitle: "Protection",
    icon: "🛡️",
    description:
      "Offer optional shipping protection before the shopper reaches checkout.",
    tone: "warning",
    defaults: {
      displayMode: "INLINE",
      placement: "CART_DRAWER",
      headline: "Protect your order",
      subheading: "Offer shipment protection for lost, stolen, or damaged packages.",
      ctaLabel: "Add protection",
      config: {
        productId: "",
      },
    },
  },
  {
    key: "trust_badges",
    legacyType: "ADDON",
    surfaceArea: "CART_DRAWER",
    title: "Trust Badges",
    shortTitle: "Trust badges",
    icon: "✅",
    description:
      "Reinforce confidence with trust signals inside the cart drawer.",
    tone: "info",
    defaults: {
      displayMode: "BANNER",
      placement: "CART_DRAWER",
      headline: "Shop with confidence",
      subheading: "Show trust signals like secure checkout and easy returns.",
      ctaLabel: "Learn more",
      config: {
        badgesCsv: "Secure checkout,Easy returns,Trusted by shoppers",
      },
    },
  },
  {
    key: "payment_icons",
    legacyType: "ADDON",
    surfaceArea: "CART_DRAWER",
    title: "Payment Icons",
    shortTitle: "Payments",
    icon: "💳",
    description:
      "Display accepted payment methods directly in the cart experience.",
    tone: "info",
    defaults: {
      displayMode: "BANNER",
      placement: "CART_DRAWER",
      headline: "Accepted payment methods",
      subheading: "Show supported payment options before checkout.",
      ctaLabel: "Continue",
      config: {
        iconsCsv: "Visa,Mastercard,PayPal,UPI",
      },
    },
  },
  {
    key: "announcement_bar_in_cart",
    legacyType: "ADDON",
    surfaceArea: "CART_DRAWER",
    title: "Announcement Bar in Cart",
    shortTitle: "Announcement",
    icon: "📣",
    description:
      "Display important shipping, promo, or seasonal messages in cart.",
    tone: "info",
    defaults: {
      displayMode: "BAR",
      placement: "CART_DRAWER",
      headline: "Special announcement",
      subheading: "Use a slim cart message bar for timely updates.",
      ctaLabel: "Got it",
      config: {
        message: "",
      },
    },
  },
  {
    key: "popup_upsell_funnel",
    legacyType: "BUNDLE",
    surfaceArea: "CART_DRAWER",
    title: "Pop-up Upsell Funnel",
    shortTitle: "Popup upsell",
    icon: "💬",
    description:
      "Launch a focused upsell popup after shoppers interact with the cart drawer.",
    tone: "warning",
    defaults: {
      displayMode: "BANNER",
      placement: "CART_DRAWER",
      headline: "Wait — add this before checkout",
      subheading: "Use a lightweight popup upsell funnel for one more offer.",
      ctaLabel: "Add offer",
      config: {
        productIds: "",
        maxProducts: "2",
      },
    },
  },
  {
    key: "ai_recommendations_in_cart",
    legacyType: "BUNDLE",
    surfaceArea: "CART_DRAWER",
    title: "AI Recommendations in Cart",
    shortTitle: "AI recs",
    icon: "🤖",
    description:
      "Use AI or ranking logic to show context-aware recommendations in cart.",
    tone: "info",
    defaults: {
      displayMode: "INLINE",
      placement: "CART_DRAWER",
      headline: "Recommended for this cart",
      subheading: "Let AI choose the best upsell products right now.",
      ctaLabel: "Add recommendation",
      config: {
        strategy: "cart_context",
        fallbackProductIds: "",
        maxProducts: "3",
      },
    },
  },
];

const buildEditFunnelRoute = (id) => `/app/upsell/funnels/${id}`;
const widgetKeyToSlug = (widgetKey) => widgetKey.replace(/_/g, "-");
const buildWidgetManageRoute = (id, widgetKey) =>
  `/app/upsell/funnels/${id}/widgets/cart/${widgetKeyToSlug(widgetKey)}`;

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
    placement: firstEnabled?.placement || "CART_DRAWER",
    displayMode: firstEnabled?.displayMode || "INLINE",
    headline:
      firstEnabled?.headline || `${funnel.title || "Untitled funnel"} cart widgets`,
    subheading:
      firstEnabled?.subheading || "Cart widgets managed from the app admin.",
    ctaLabel: firstEnabled?.ctaLabel || "Add now",
    internalName: `${funnel.title || "Untitled funnel"} cart widget catalog`,
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
    case "CART_DRAWER":
      return "Cart drawer";
    case "CART_PAGE":
      return "Cart page";
    case "ANY_CART":
      return "Any cart";
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
    case "CART_DRAWER":
      return "Cart drawer";
    case "CART_PAGE":
      return "Cart page";
    default:
      return "Cart";
  }
}

function toneForWidget(definition) {
  if (definition.tone === "success") return "success";
  if (definition.tone === "warning") return "warning";
  if (definition.tone === "critical") return "critical";
  return "info";
}

export const loader = async ({ request, params }) => {
  const url = new URL(request.url);
  console.log(
    `[cart widgets loader] START | url=${url.pathname} | funnelId=${params.id} | method=${request.method}`,
  );
  console.log(
    `[cart widgets loader] Headers: session-token=${
      request.headers.get("authorization") ? "present" : "MISSING"
    } | cookie=${request.headers.get("cookie") ? "present" : "MISSING"}`,
  );

  let session, redirect;
  try {
    ({ session, redirect } = await authenticate.admin(request));
    console.log(
      `[cart widgets loader] authenticate.admin OK | shop=${session?.shop ?? "NULL"}`,
    );
  } catch (err) {
    console.error(`[cart widgets loader] authenticate.admin THREW:`, err);
    throw err;
  }

  const funnel = await getUpsellFunnel(session.shop, params.id);
  console.log(
    `[cart widgets loader] getUpsellFunnel | found=${!!funnel} | surface=${
      funnel?.surface ?? "N/A"
    }`,
  );

  if (!funnel) {
    console.warn(`[cart widgets loader] Funnel not found, throwing 404`);
    throw new Response("Not Found", { status: 404 });
  }

  if (funnel.surface !== SURFACE) {
    console.warn(
      `[cart widgets loader] Surface mismatch: expected=${SURFACE} actual=${funnel.surface}; redirecting to widgets base`,
    );
    return redirect(`/app/upsell/funnels/${params.id}/widgets`);
  }

  const existingWidget = await getUpsellWidget(session.shop, params.id);
  console.log(
    `[cart widgets loader] getUpsellWidget | found=${!!existingWidget}`,
  );
  const catalog = hydrateCatalog(funnel, existingWidget);

const featureAccess = {
  order_notes: await canShopAccessFeature(
    session.shop,
    "ORDER_NOTES_CART"
  ),
  countdown_timer_urgency: await canShopAccessFeature(
    session.shop,
    "CART_COUNTDOWN"
  ),
};

console.log(`[cart widgets loader] DONE`);

return {
  funnel,
  catalog,
  featureAccess,
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

  const FEATURE_BY_WIDGET = {
  order_notes: "ORDER_NOTES_CART",
  countdown_timer_urgency: "CART_COUNTDOWN",
};

const featureKey = FEATURE_BY_WIDGET[definition.key];

if (featureKey) {
  await requireFeatureAccess(session.shop, featureKey);
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

function WidgetCard({ funnelId, definition, widget, navigate, busyWidgetKey,hasAccess, }) {
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
            Settings will open on a dedicated widget page.
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
            <s-button variant="secondary" disabled>
              Locked
            </s-button>
          )}

            {/* <Form method="post">
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
            </Form> */}
          </s-stack>
        </s-stack>
      </s-stack>
    </s-box>
  );
}

export default function UpsellFunnelsWidgetsCartRoute() {
  const outlet = useOutlet();
  const {
  funnel,
  catalog: loaderCatalog,
  featureAccess,
} = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const navigate = useNavigate();

  if (outlet) {
    return outlet;
  }

  const catalog = actionData?.catalog || loaderCatalog;
  const message = actionData?.message || "";

  const drawerDefinitions = WIDGET_DEFINITIONS.filter(
    (widget) => widget.surfaceArea === "CART_DRAWER",
  );
  const pageDefinitions = WIDGET_DEFINITIONS.filter(
    (widget) => widget.surfaceArea === "CART_PAGE",
  );

  const enabledCount = WIDGET_DEFINITIONS.filter(
    (definition) => catalog[definition.key]?.enabled,
  ).length;

  const enabledDrawerCount = drawerDefinitions.filter(
    (definition) => catalog[definition.key]?.enabled,
  ).length;

  const enabledPageCount = pageDefinitions.filter(
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
                cart widget on its own page to manage settings later.
              </s-paragraph>
            </s-stack>

            <s-stack direction="inline" gap="small">
              <s-badge tone="info">Surface: Cart</s-badge>
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
              label="Cart drawer widgets"
              value={`${enabledDrawerCount} / ${drawerDefinitions.length}`}
              tone="info"
            />
          </s-stack>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-stack gap="small">
            <s-heading>Cart Drawer</s-heading>
            <s-paragraph color="subdued">
              Enable cart drawer experiences here, then open Manage to configure
              each widget on its own page later.
            </s-paragraph>
          </s-stack>

          <s-stack gap="small">
            {drawerDefinitions.map((definition) => (
              <WidgetCard
                key={definition.key}
                funnelId={funnel.id}
                definition={definition}
                widget={catalog[definition.key]}
                navigate={navigate}
                busyWidgetKey={busyWidgetKey}
                hasAccess={featureAccess[definition.key] ?? true}
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
