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
import { UPSELL_SURFACES } from "../models/upsell.constants";
import {
  getUpsellWidget,
  createOrUpdateUpsellWidget,
} from "../models/upsell.server";
import {
  WIDGET_DEFINITIONS,
  WIDGET_BLOCK_HANDLES,
} from "../models/customize-widget-definitions";


const PAGE_TITLE = "Customize";

// --- Surfaces (nav tabs) ---
// Each surface is one tab in the top navigation. "key" goes into the URL
// (?surface=PDP) and matches UPSELL_SURFACES so it stays in sync with the
// rest of the app. "label" is what the merchant sees.
const SURFACES = [
  {
    key: UPSELL_SURFACES.PDP,
    label: "PDP",
    blurb: "Add bundles, add-ons, and quantity offers to your product pages, where shoppers are deciding what to buy.",
  },
  {
    key: UPSELL_SURFACES.CART,
    label: "Cart & drawer",
    blurb: "Encourage bigger carts with free-shipping goals, cross-sells, and bundle nudges as shoppers review their cart.",
  },
  {
    key: UPSELL_SURFACES.CHECKOUT,
    label: "Checkout",
    blurb: "Add low-friction offers like donations, rules, and social proof right at the checkout step.",
  },
  {
    key: UPSELL_SURFACES.POST_PURCHASE,
    label: "Post-purchase",
    blurb: "Lift order value with one-click upsells and cross-sells shown right after payment.",
  },
  {
    key: UPSELL_SURFACES.ACCOUNT,
    label: "Account",
    blurb: "Drive repeat orders with reorder, subscription, and loyalty widgets in the customer account area.",
  },
];

const DEFAULT_SURFACE = UPSELL_SURFACES.CHECKOUT;

// Surfaces without real widget implementations yet — show "Coming soon"
// instead of an Enable/Manage list that would error out on click.
const SURFACES_COMING_SOON = new Set([
  UPSELL_SURFACES.POST_PURCHASE,
  UPSELL_SURFACES.ACCOUNT,
]);


// Resolve a surface key coming from the URL into a known surface.
// Falls back to checkout if it's missing or unknown.
function resolveSurface(value) {
  const found = SURFACES.find((surface) => surface.key === value);
  return found ? found.key : DEFAULT_SURFACE;
}

// --- Widget catalog (per surface) ---
// Each widget belongs to one surface. The nav tab filters this list so each
// surface shows only its own widgets.

const APP_CLIENT_ID = "cf398340704e9b311322ba80cd46705c";

const SHOP_AND_MAIN_THEME_QUERY = `#graphql
  query ShopAndMainTheme {
    shop {
      myshopifyDomain
    }
    themes(first: 10) {
      nodes {
        id
        role
      }
    }
  }
`;
const THEME_PRODUCT_TEMPLATE_QUERY = `#graphql
  query ThemeProductTemplate($themeId: ID!) {
    theme(id: $themeId) {
      files(first: 5, filenames: ["templates/product.json"]) {
        nodes {
          ... on OnlineStoreThemeFile {
            filename
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
            }
          }
        }
      }
    }
  }
`;

function parseJsonWithComments(input, fallback = {}) {
  try {
    const cleaned = (input || "").replace(/\/\*[\s\S]*?\*\//g, "").trim();
    return JSON.parse(cleaned || "{}");
  } catch {
    return fallback;
  }
}
function isBlockActiveInTemplate(templateJson, handle) {
  const sections = templateJson?.sections || {};
  return Object.values(sections).some((section) =>
    Object.values(section?.blocks || {}).some((block) =>
      (block?.type || "").toLowerCase().includes(`/blocks/${handle.toLowerCase()}`)
    )
  );
}

const THEME_SETTINGS_DATA_QUERY = `#graphql
  query ThemeSettingsData($themeId: ID!) {
    theme(id: $themeId) {
      files(first: 5, filenames: ["config/settings_data.json"]) {
        nodes {
          ... on OnlineStoreThemeFile {
            filename
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
            }
          }
        }
      }
    }
  }
`;

// Checks settings_data.json to see if a given app embed handle is active
// (present in the theme's blocks and not explicitly disabled).
function isEmbedActiveInSettings(settingsJson, handle) {
  const currentBlocks = settingsJson?.current?.blocks || {};
  const topLevelBlocks = settingsJson?.blocks || {};
  const allBlocks = { ...currentBlocks, ...topLevelBlocks };

  return Object.values(allBlocks).some((block) => {
    const type = (block?.type || "").toLowerCase();
    return (
      type.includes(`/blocks/${handle.toLowerCase()}`) &&
      block?.disabled !== true
    );
  });
}

// Builds the "activate this app embed" deep link (Cart-surface widgets).
function buildEmbedActivationUrl({ shopDomain, themeId, handle }) {
  const numericThemeId = themeId?.split("/").pop();
  return (
    `https://${shopDomain}/admin/themes/${numericThemeId}/editor` +
    `?context=apps` +
    `&activateAppId=${APP_CLIENT_ID}/${handle}`
  );
}

// Builds the "add this PDP block, already active" deep link for a widget
// that has a real Theme App Block (see WIDGET_BLOCK_HANDLES).
function buildPdpBlockUrl({ shopDomain, themeId, handle }) {
  const numericThemeId = themeId?.split("/").pop();
  return (
    `https://${shopDomain}/admin/themes/${numericThemeId}/editor` +
    `?template=product` +
    `&addAppBlockId=${APP_CLIENT_ID}/${handle}` +
    `&target=mainSection`
  );
}

// Opens the theme editor's App embeds panel, where the merchant can switch an embed off.
function buildEmbedManageUrl({ shopDomain, themeId }) {
  const numericThemeId = themeId?.split("/").pop();
  return `https://${shopDomain}/admin/themes/${numericThemeId}/editor?context=apps`;
}

// Opens the product template, where the merchant can remove a PDP block.
function buildPdpEditorUrl({ shopDomain, themeId }) {
  const numericThemeId = themeId?.split("/").pop();
  return `https://${shopDomain}/admin/themes/${numericThemeId}/editor?template=product`;
}

// Builds the link to Shopify's checkout editor. Checkout widgets are
// checkout UI extensions, so merchants place them there, not in the theme editor.
function buildCheckoutEditorUrl(shop) {
  const storeHandle = String(shop || "").replace(".myshopify.com", "");
  return `https://admin.shopify.com/store/${storeHandle}/settings/checkout/editor?page=checkout&context=apps`;
}

// --- Route builder ---
const widgetKeyToSlug = (widgetKey) => widgetKey.replace(/_/g, "-");
const buildWidgetManageRoute = (widgetKey, surface) =>
  `/app/Customize/${widgetKeyToSlug(widgetKey)}?surface=${surface}`;

// --- Helpers ---
export function findWidgetDefinition(widgetKey, surface) {
  return (
    WIDGET_DEFINITIONS.find(
      (widget) => widget.key === widgetKey && widget.surface === surface,
    ) || null
  );
}

function safeJsonParse(value) {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Read a single widget's enabled flag from its own notes JSON.
function isWidgetEnabled(widgetRow) {
  const parsed = safeJsonParse(widgetRow?.notes);
  return Boolean(parsed?.enabled);
}

// --- Loader: read each widget's row (no funnel) + the active surface ---
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  // Read the active surface from the URL (?surface=PDP). Default: checkout.
  const url = new URL(request.url);
  const activeSurface = resolveSurface(url.searchParams.get("surface"));

  const checkoutEditorUrl = buildCheckoutEditorUrl(session.shop);

  if (SURFACES_COMING_SOON.has(activeSurface)) {
    return {
      catalog: {},
      activeSurface,
      widgetBlockUrls: {},
      widgetDisableUrls: {},
      checkoutEditorUrl,
    };
  }

  // Only read rows for the widgets on the active surface (keeps it light).
  const surfaceWidgets = WIDGET_DEFINITIONS.filter(
    (definition) => definition.surface === activeSurface,
  );

  const catalog = {};
  for (const definition of surfaceWidgets) {
    const scopedKey = `${activeSurface}:${definition.key}`;
    const widgetRow = await getUpsellWidget(session.shop, scopedKey);
    catalog[definition.key] = { enabled: isWidgetEnabled(widgetRow) };
  }

  // Build deep-link URLs + real status for widgets that have a real
  // Theme App Block/Embed implementation (see WIDGET_BLOCK_HANDLES).
  let widgetBlockUrls = {};
  let widgetDisableUrls = {};
  const surfaceKeysWithBlocks = surfaceWidgets
    .map((d) => d.key)
    .filter((key) => WIDGET_BLOCK_HANDLES[`${activeSurface}:${key}`]);

  if (surfaceKeysWithBlocks.length > 0) {
    const themeRes = await admin.graphql(SHOP_AND_MAIN_THEME_QUERY);
    const themeJson = await themeRes.json();
    const shopDomain = themeJson?.data?.shop?.myshopifyDomain;
    const themes = themeJson?.data?.themes?.nodes || [];
    const mainTheme = themes.find((t) => t.role === "MAIN") || themes[0];

    if (shopDomain && mainTheme) {
      const sectionKeys = surfaceKeysWithBlocks.filter(
        (key) => WIDGET_BLOCK_HANDLES[`${activeSurface}:${key}`].target === "section"
      );
      const embedKeys = surfaceKeysWithBlocks.filter(
        (key) => WIDGET_BLOCK_HANDLES[`${activeSurface}:${key}`].target === "body"
      );

      // --- Section blocks (e.g. PDP widgets) ---
      if (sectionKeys.length > 0) {
        const templateRes = await admin.graphql(THEME_PRODUCT_TEMPLATE_QUERY, {
          variables: { themeId: mainTheme.id },
        });
        const templateJsonRes = await templateRes.json();
        const fileNodes = templateJsonRes?.data?.theme?.files?.nodes || [];
        const rawContent = fileNodes.find(
          (n) => n.filename === "templates/product.json"
        )?.body?.content;
        const templateJson = parseJsonWithComments(rawContent, {});

        for (const key of sectionKeys) {
          const { handle } = WIDGET_BLOCK_HANDLES[`${activeSurface}:${key}`];
          widgetBlockUrls[key] = buildPdpBlockUrl({
            shopDomain,
            themeId: mainTheme.id,
            handle,
          });
          widgetDisableUrls[key] = buildPdpEditorUrl({
            shopDomain,
            themeId: mainTheme.id,
          });
          catalog[key] = {
            enabled: isBlockActiveInTemplate(templateJson, handle),
          };
        }
      }

      // --- App embeds (e.g. Cart widgets) ---
      if (embedKeys.length > 0) {
        const settingsRes = await admin.graphql(THEME_SETTINGS_DATA_QUERY, {
          variables: { themeId: mainTheme.id },
        });
        const settingsJsonRes = await settingsRes.json();
        const settingsFileNodes = settingsJsonRes?.data?.theme?.files?.nodes || [];
        const rawSettings = settingsFileNodes.find(
          (n) => n.filename === "config/settings_data.json"
        )?.body?.content;
        const settingsJson = parseJsonWithComments(rawSettings, {});

        for (const key of embedKeys) {
          const { handle } = WIDGET_BLOCK_HANDLES[`${activeSurface}:${key}`];
          widgetBlockUrls[key] = buildEmbedActivationUrl({
            shopDomain,
            themeId: mainTheme.id,
            handle,
          });
          widgetDisableUrls[key] = buildEmbedManageUrl({
            shopDomain,
            themeId: mainTheme.id,
          });
          catalog[key] = {
            enabled: isEmbedActiveInSettings(settingsJson, handle),
          };
        }
      }
    }
  }

  return {
    catalog,
    activeSurface,
    widgetBlockUrls,
    widgetDisableUrls,
    checkoutEditorUrl,
  };
};

// --- Action: enable/disable a single widget ---
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const activeSurface = resolveSurface(url.searchParams.get("surface"));

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const widgetKey = String(formData.get("widgetKey") || "").trim();
  const definition = findWidgetDefinition(widgetKey, activeSurface);

  if (!definition) {
    return { ok: false, message: "Unsupported widget." };
  }

  if (intent === "toggle-widget") {
    const scopedKey = `${activeSurface}:${widgetKey}`;

    // Keep the saved theme, only flip the enabled flag.
    const existing = await getUpsellWidget(session.shop, scopedKey);
    const parsed = safeJsonParse(existing?.notes) || {};
    const nextEnabled = !parsed.enabled;

    const nextNotes = JSON.stringify({ ...parsed, enabled: nextEnabled });

    await createOrUpdateUpsellWidget(session.shop, scopedKey, {
      widgetType: definition.key,
      placement: "checkout",
      displayMode: "inline",
      headline: definition.title,
      ctaLabel: "Save",
      internalName: definition.title,
      notes: nextNotes,
    });

    return {
      ok: true,
      message: `${definition.title} ${nextEnabled ? "enabled" : "disabled"}.`,
    };
  }

  return { ok: false, message: "Unsupported action." };
};

// --- Small UI pieces ---
function StatusBadge({ enabled }) {
  return (
    <s-badge tone={enabled ? "success" : "info"}>
      {enabled ? "Enabled" : "Disabled"}
    </s-badge>
  );
}

// --- Surface nav bar (top tabs) ---
function SurfaceNav({ activeSurface, navigate }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "28px",
        borderBottom: "1px solid #e1e3e5",
        padding: "0 4px",
      }}
    >
      {SURFACES.map((surface) => {
        const isActive = surface.key === activeSurface;
        return (
          <div
            key={surface.key}
            onClick={() => navigate(`/app/Customize?surface=${surface.key}`)}
            style={{
              padding: "12px 2px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: isActive ? 600 : 450,
              color: isActive ? "#1a1a1a" : "#6d7175",
              borderBottom: isActive
                ? "2px solid #1a1a1a"
                : "2px solid transparent",
              marginBottom: "-1px",
              userSelect: "none",
            }}
          >
            {surface.label}
          </div>
        );
      })}
    </div>
  );
}

function WidgetCard({
  definition,
  enabled,
  navigate,
  busyWidgetKey,
  blockUrl,
  disableUrl,
  checkoutEditorUrl,
}) {
  const isBusy = busyWidgetKey === definition.key;
  // If we have a real deep-link URL for this widget (see WIDGET_BLOCK_HANDLES),
  // Enable opens the theme editor with the block already active. Disable
  // opens the theme editor so the merchant can switch it off and save
  // (Shopify has no API to turn an app embed off).
  const hasDeepLink = Boolean(blockUrl);
  // Checkout widgets are checkout UI extensions: they're placed in the
  // checkout editor, so we link there instead of using the DB-only toggle.
  const isCheckout = definition.surface === UPSELL_SURFACES.CHECKOUT;

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
            </s-stack>
          </s-stack>

          <StatusBadge enabled={enabled} />
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
            <s-button
              variant="secondary"
              onClick={() =>
                navigate(buildWidgetManageRoute(definition.key, definition.surface))
              }
            >
              Manage
            </s-button>

            {hasDeepLink ? (
              enabled ? (
                <s-button
                  variant="secondary"
                  tone="critical"
                  href={disableUrl || blockUrl}
                  target="_blank"
                >
                  Disable
                </s-button>
              ) : (
                <s-button
                  variant="primary"
                  href={blockUrl}
                  target="_blank"
                >
                  Enable
                </s-button>
              )
            ) : isCheckout ? (
              <s-button
                variant="primary"
                href={checkoutEditorUrl}
                target="_blank"
              >
                Open checkout editor
              </s-button>
            ) : (
              <Form method="post">
                <input type="hidden" name="intent" value="toggle-widget" />
                <input type="hidden" name="widgetKey" value={definition.key} />
                <s-button
                  type="submit"
                  variant={enabled ? "secondary" : "primary"}
                  tone={enabled ? "critical" : "auto"}
                  disabled={isBusy}
                >
                  {isBusy ? "Saving..." : enabled ? "Disable" : "Enable"}
                </s-button>
              </Form>
            )}
          </s-stack>
        </s-stack>
      </s-stack>
    </s-box>
  );
}

// --- Empty state shown when a surface has no widgets yet ---
function EmptySurface({ surfaceLabel }) {
  return (
    <s-box padding="base" border="base" borderRadius="base" background="base">
      <s-stack gap="small">
        <s-heading>No widgets for {surfaceLabel} yet</s-heading>
        <s-paragraph color="subdued">
          Widgets for this surface will appear here once they are added.
        </s-paragraph>
      </s-stack>
    </s-box>
  );
}


// --- Coming-soon state for surfaces without real implementations yet ---
function ComingSoonSurface({ surfaceLabel }) {
  return (
    <s-box padding="base" border="base" borderRadius="base" background="base">
      <s-stack gap="base" alignItems="center">
        <s-badge tone="warning">Coming soon</s-badge>
        <s-heading>{surfaceLabel} widgets are on the way</s-heading>
        <s-paragraph color="subdued">
          We're still building out {surfaceLabel.toLowerCase()} widgets. Check
          back soon — your other surfaces are ready to use in the meantime.
        </s-paragraph>
      </s-stack>
    </s-box>
  );
}

// --- Main page ---
export default function CustomizeRoute() {
  const {
    catalog: loaderCatalog,
    activeSurface,
    widgetBlockUrls,
    widgetDisableUrls,
    checkoutEditorUrl,
  } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const outlet = useOutlet();
  if (outlet) {
    return outlet;
  }

  const catalog = loaderCatalog || {};
  const message = actionData?.message || "";

  // Only the widgets belonging to the active surface.
  const surfaceWidgets = WIDGET_DEFINITIONS.filter(
    (definition) => definition.surface === activeSurface,
  );

  // Friendly label for the active surface (for headings / empty state).
  const activeSurfaceMeta = SURFACES.find((surface) => surface.key === activeSurface);
  const activeSurfaceLabel = activeSurfaceMeta?.label || activeSurface;
  const activeSurfaceBlurb = activeSurfaceMeta?.blurb || "";

  const enabledCount = surfaceWidgets.filter(
    (definition) => catalog[definition.key]?.enabled,
  ).length;

  const busyWidgetKey =
    navigation.state === "submitting"
      ? navigation.formData?.get("widgetKey") || ""
      : "";

  return (
    <s-page heading={PAGE_TITLE}>
      {/* Top navigation: switch between surfaces */}
      <div style={{ padding: "8px 0 0", marginBottom: "4px" }}>
        <SurfaceNav activeSurface={activeSurface} navigate={navigate} />
      </div>

      <s-section>
        <s-box padding="base" border="base" borderRadius="base" background="base">
          <s-stack gap="base">
            <s-stack gap="small">
              <s-heading>{activeSurfaceLabel} widgets</s-heading>
              <s-paragraph color="subdued">{activeSurfaceBlurb}</s-paragraph>
            </s-stack>

            <s-stack direction="inline" gap="small">
              <s-badge tone="info">Surface: {activeSurfaceLabel}</s-badge>
              {SURFACES_COMING_SOON.has(activeSurface) ? (
                <s-badge tone="warning">Coming soon</s-badge>
              ) : (
                <>
                  <s-badge tone="success">{enabledCount} enabled</s-badge>
                  <s-badge tone="info">{surfaceWidgets.length} available</s-badge>
                </>
              )}
            </s-stack>

            {message ? (
              <s-banner tone={actionData?.ok ? "success" : "critical"}>
                {message}
              </s-banner>
            ) : null}
          </s-stack>
        </s-box>
      </s-section>

      {SURFACES_COMING_SOON.has(activeSurface) ? (
        <s-section>
          <ComingSoonSurface surfaceLabel={activeSurfaceLabel} />
        </s-section>
      ) : surfaceWidgets.length === 0 ? (
        <s-section>
          <EmptySurface surfaceLabel={activeSurfaceLabel} />
        </s-section>
      ) : (
        <s-section>
          <s-stack gap="base">
            <s-stack gap="small">
              <s-heading>{activeSurfaceLabel} Widgets</s-heading>
              <s-paragraph color="subdued">
                Enable or disable widgets here. Use Manage to open the
                dedicated page for each widget later.
              </s-paragraph>
            </s-stack>

            <s-stack gap="small">
              {surfaceWidgets.map((definition) => (
                <WidgetCard
                  key={definition.key}
                  definition={definition}
                  enabled={Boolean(catalog[definition.key]?.enabled)}
                  navigate={navigate}
                  busyWidgetKey={busyWidgetKey}
                  buildManageRoute={buildWidgetManageRoute}
                  blockUrl={widgetBlockUrls?.[definition.key]}
                  disableUrl={widgetDisableUrls?.[definition.key]}
                  checkoutEditorUrl={checkoutEditorUrl}
                />
              ))}
            </s-stack>
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);