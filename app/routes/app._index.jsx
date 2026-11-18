import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouteError } from "react-router";
import {
  useLoaderData,
  useNavigate,
  useSearchParams,
  useRevalidator,
} from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { canShopAccessFeature } from "../featureAccess.server";


const SHOP_AND_THEMES_QUERY = `#graphql
  query ShopAndThemes {
    shop {
      name
      myshopifyDomain
    }
    themes(first: 50) {
      nodes {
        id
        name
        role
      }
    }
  }
`;

const THEME_FILES_QUERY = `#graphql
  query ThemeFiles($themeId: ID!, $filenames: [String!]!) {
    theme(id: $themeId) {
      id
      name
      role
      files(first: 20, filenames: $filenames) {
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
const APP_BLOCKS = [
  {
    handle: "bundle-pdp-components",
    title: "Fixed Bundle block",
    shortTitle: "Fixed Bundle",
    description:
      "Displays a pre-configured set of products as a bundle on the product page. Best for gift sets and curated product combinations.",
  },
  {
    handle: "volume_bundle",
    title: "Volume Bundle block",
    shortTitle: "Volume Bundle",
    description:
      "Shows tiered quantity discounts on the product page. Encourages customers to buy more by offering a better price at higher quantities.",
  },
  {
    handle: "mix_and_match_bundle",
    title: "Mix & Match Bundle block",
    shortTitle: "Mix & Match",
    description:
      "Lets customers build their own bundle by selecting from a curated group of products. Ideal for stores with complementary product ranges.",
  },
];
const app_client_id = "cf398340704e9b311322ba80cd46705c";

const APP_EMBED = {
  handle: "bundle_app_embed",
  title: "Enable app embed",
  description:
    "Activate the Bundlo app embed from your theme settings. This is required before any bundle blocks will appear on your storefront.",
};


function parseJsonWithComments(input, fallback = {}) {
  try {
    const cleaned = (input || "").replace(/\/\*[\s\S]*?\*\//g, "").trim();
    return JSON.parse(cleaned || "{}");
  } catch {
    return fallback;
  }
}

function getMainTheme(themes = []) {
  return themes.find((theme) => theme.role === "MAIN") || themes[0] || null;
}

function getNumericThemeId(themeGid) {
  return themeGid?.split("/").pop();
}
function getSelectableThemes(themes) {
  return (themes || []).filter((theme) =>
    theme.role === "MAIN" || theme.role === "DEVELOPMENT"
  );
}

function findBlockMatchByHandle(blocks = {}, handle) {
  return Object.values(blocks).some((block) => {
    const type = (block?.type || "").toLowerCase();
    return type.includes(`/blocks/${handle.toLowerCase()}`);
  });
}

function isSpecificAppBlockActive(templateJson, appBlockHandle) {
  const sections = templateJson?.sections || {};
  return Object.values(sections).some((section) =>
    findBlockMatchByHandle(section?.blocks || {}, appBlockHandle)
  );
}

function isAppEmbedActive(settingsJson, appEmbedHandle) {
  const currentBlocks = settingsJson?.current?.blocks || {};
  const topLevelBlocks = settingsJson?.blocks || {};
  const allBlocks = { ...currentBlocks, ...topLevelBlocks };

  return Object.values(allBlocks).some((block) => {
    const type = (block?.type || "").toLowerCase();
    return (
      type.includes(`/blocks/${appEmbedHandle.toLowerCase()}`) &&
      block?.disabled !== true
    );
  });
}

function buildEditorUrls({
  shop,         // e.g. "mystore.myshopify.com"
  themeId,      // still available if you want it elsewhere
  app_client_id,    // your app client_id from app.toml
  template,     // e.g. "product"
  appEmbedHandle,
  appBlocks,
}) {
  const numericThemeId = getNumericThemeId(themeId);
  const base = `https://${shop}/admin/themes/${numericThemeId}/editor`;
  return {
    openThemeEditor:
      `${base}?template=${encodeURIComponent(template)}`,

    openAppEmbeds:
      `${base}?context=apps&template=${encodeURIComponent(template)}`,

    activateAppEmbed:
      `${base}?context=apps` +
      `&template=${encodeURIComponent(template)}` +
      `&activateAppId=${app_client_id}/${appEmbedHandle}`,

    blocks: Object.fromEntries(
      appBlocks.map((block) => [
        block.handle,
        {
          addToMainSection:
            `${base}?template=${encodeURIComponent(template)}` +
            `&addAppBlockId=${app_client_id}/${block.handle}` +
            `&target=mainSection`,
        },
      ])
    ),
  };
}

function getSetupSteps({ appEmbedActive, blockStatuses, createBundleUrl, hasBundles }) {
  const hasAnyBlockActive = blockStatuses.some((block) => block.active);
  const nextInactiveBlock = blockStatuses.find((block) => !block.active);

  return [
    {
      id: "embed",
      title: "Enable app embed",
      description: APP_EMBED.description,
      complete: appEmbedActive,
      primaryAction: appEmbedActive
        ? { label: "Open app embeds", href: null, kind: "app-embeds" }
        : { label: "Enable app embed", href: null, kind: "activate-embed" },
      secondaryAction: { label: "Refresh status", isRefresh: true },
    },
    {
      id: "block",
      title: nextInactiveBlock
        ? `Add ${nextInactiveBlock.shortTitle}`
        : "Add a bundle block",
      description: hasAnyBlockActive
        ? "At least one bundle block is active on your product template. You can add more block types below if needed."
        : "Add a bundle block to your product page template. Each block type displays a different kind of bundle offer to your customers.",
      complete: hasAnyBlockActive,
      primaryAction: nextInactiveBlock
        ? {
          label: `Add ${nextInactiveBlock.shortTitle}`,
          href: null,
          kind: "add-block",
          handle: nextInactiveBlock.handle,
        }
        : {
          label: "Open theme editor",
          href: null,
          kind: "theme-editor",
        },
      secondaryAction: {
        label: "Open theme editor",
        href: null,
        kind: "theme-editor",
      },
    },
    {
      id: "bundle",
      title: "Create your first bundle",
      description:
        "Your storefront is ready. Create your first bundle offer and it will appear on your product pages automatically.",
      complete: hasBundles,
      primaryAction: {
        label: "Create bundle",
        href: createBundleUrl,
        kind: "internal",
      },
      secondaryAction: null,
    },
  ];
}
const BUNDLE_TYPE_SLIDES = [
  {
    id: "fixed",
    label: "Fixed bundle",
    tag: "Most popular",
    description: "Pre-select a group of products sold together at a set price or discount. Great for gift sets and curated kits.",
    useCase: "e.g. Skincare starter kit — cleanser + toner + moisturiser",
    bg: "linear-gradient(180deg, #dff2ff 0%, #f7fbff 100%)",
    card: "linear-gradient(180deg, #ffc96b 0%, #f5a623 100%)",
    createType: "fixed",
  },
  {
    id: "volume",
    label: "Volume discount",
    tag: "High AOV",
    description: "Reward shoppers for buying more. Tiered discounts — buy 2 get 10% off, buy 3 get 15% off.",
    useCase: "e.g. Coffee pods — the more you buy, the more you save",
    bg: "linear-gradient(180deg, #f3e8ff 0%, #faf5ff 100%)",
    card: "linear-gradient(180deg, #c084fc 0%, #9333ea 100%)",
    createType: "volume",
  },
  {
    id: "mix",
    label: "Mix & Match",
    tag: "High engagement",
    description: "Shoppers pick any combination from a curated group to fill the bundle. Flexible but still structured.",
    useCase: "e.g. Pick any 3 protein flavours from our range",
    bg: "linear-gradient(180deg, #dcfce7 0%, #f0fdf4 100%)",
    card: "linear-gradient(180deg, #4ade80 0%, #16a34a 100%)",
    createType: "mix",
  },
  {
    id: "byob",
    label: "Build your own box",
    tag: "Flexible",
    description: "Full shopper freedom — choose any products, any quantity, at the merchant-set box price. Best for gifting.",
    useCase: "e.g. Build your own snack box — choose any 6 items",
    bg: "linear-gradient(180deg, #ffe4e6 0%, #fff1f2 100%)",
    card: "linear-gradient(180deg, #fb7185 0%, #e11d48 100%)",
    createType: "byob",
  },
  {
    id: "multivariant",
    label: "Multivariant bundle",
    tag: "Advanced",
    description: "Bundle across variants — a shirt in size S with matching pants in size 32. One bundle, multiple variant combos.",
    useCase: "e.g. Outfit builder — top + bottom, each in their own size",
    bg: "linear-gradient(180deg, #fef3c7 0%, #fffbeb 100%)",
    card: "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)",
    createType: "multivariant",
  },
];

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const featureAccess = {
  FIXED_BUNDLE: await canShopAccessFeature(session.shop, "FIXED_BUNDLE"),
  VOLUME_BUNDLE: await canShopAccessFeature(session.shop, "VOLUME_BUNDLE"),
  BYOB: await canShopAccessFeature(session.shop, "BYOB"),
  MIX_MATCH: await canShopAccessFeature(session.shop, "MIX_MATCH"),
  MULTIVARIANT: await canShopAccessFeature(session.shop, "MULTIVARIANT"),
};
console.log("DASHBOARD FEATURE ACCESS", {
  shop: session.shop,
  featureAccess,
});

  const appApiKey = process.env.SHOPIFY_API_KEY;
  if (!appApiKey) {
    throw new Response("Missing SHOPIFY_API_KEY environment variable.", {
      status: 500,
    });
  }

  const bundleCount = await prisma.bundle.count({
    where: { shop: session.shop },
  });

  const template = "product";
  const appEmbedHandle = APP_EMBED.handle;

  const url = new URL(request.url);
  const requestedThemeId = url.searchParams.get("theme");

  const shopRes = await admin.graphql(SHOP_AND_THEMES_QUERY);
  const shopJson = await shopRes.json();

  const shop = shopJson?.data?.shop;
  const themes = shopJson?.data?.themes?.nodes || [];
  const selectableThemes = getSelectableThemes(themes);
  const mainTheme = getMainTheme(selectableThemes);

  if (!shop || !selectableThemes.length) {
    throw new Response("Unable to load shop or themes.", { status: 500 });
  }

  const selectedTheme =
    selectableThemes.find((theme) => theme.id === requestedThemeId) || mainTheme;



  const filesRes = await admin.graphql(THEME_FILES_QUERY, {
    variables: {
      themeId: selectedTheme.id,
      filenames: [`templates/${template}.json`, "config/settings_data.json"],
    },
  });

  const filesJson = await filesRes.json();
  const fileNodes = filesJson?.data?.theme?.files?.nodes || [];

  const fileMap = Object.fromEntries(
    fileNodes.map((node) => [node.filename, node?.body?.content || ""])
  );

  const templateJson = parseJsonWithComments(
    fileMap[`templates/${template}.json`],
    {}
  );
  const settingsJson = parseJsonWithComments(
    fileMap["config/settings_data.json"],
    {}
  );

  const appEmbedActive = isAppEmbedActive(settingsJson, appEmbedHandle);

  const blockStatuses = APP_BLOCKS.map((block) => ({
    ...block,
    active: isSpecificAppBlockActive(templateJson, block.handle),
  }));

  const hasAnyBlockActive = blockStatuses.some((block) => block.active);

  const urls = buildEditorUrls({
    shop: shop.myshopifyDomain,
    themeId: selectedTheme.id,
    app_client_id,
    template,
    appEmbedHandle,
    appBlocks: APP_BLOCKS,
  });

  const createBundleUrl = "/app/dashboard";
  const steps = getSetupSteps({
    appEmbedActive,
    blockStatuses,
    createBundleUrl,
    hasBundles: bundleCount > 0,
  });

  const completedSteps = steps.filter((step) => step.complete).length;

  const setupComplete = appEmbedActive && hasAnyBlockActive;

  return {
    shop,
      featureAccess,
    themes: selectableThemes.map((theme) => ({
      id: theme.id,
      name: theme.name,
      role: theme.role,
      isMain: theme.role === "MAIN",
    })),
    selectedTheme: {
      id: selectedTheme.id,
      name: selectedTheme.name,
      role: selectedTheme.role,
      isMain: selectedTheme.role === "MAIN",
    },
    template,
    appEmbedHandle,
    appEmbedActive,
    blockStatuses,
    urls,
    steps,
    completedSteps,
    totalSteps: steps.length,
    createBundleUrl,
    viewAllBundlesUrl: "/app/bundles/index",
    setupComplete,
  };
}



function StatusPill({ active, activeLabel = "Active", inactiveLabel = "Inactive" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "3px 10px 3px 8px",
        borderRadius: "999px",
        fontSize: "13px",
        fontWeight: 600,
        background: active ? "#d4f6dd" : "#fff1cc",
        color: active ? "#0f6b3c" : "#8a6116",
        border: `1px solid ${active ? "#b7e7c5" : "#f4d58d"}`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: active ? "#16a34a" : "#eab308",
          flexShrink: 0,
        }}
      />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

function ThemeSelector({ themes, selectedThemeId, onThemeChange }) {
  return (
    <s-box border="base" borderRadius="large" padding="large" background="base">
      <s-stack gap="small-200">
        <s-text type="strong">Theme</s-text>
        <s-text tone="subdued">
          Choose which theme should receive the bundle embed and product block.
        </s-text>

        <div>
          <select
            value={selectedThemeId}
            onChange={(event) => onThemeChange(event.currentTarget.value)}
            style={{
              minWidth: "280px",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #c9cccf",
              background: "#fff",
              fontSize: "14px",
            }}
          >
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
                {theme.isMain ? " (Main theme)" : ""}
              </option>
            ))}
          </select>
        </div>
      </s-stack>
    </s-box>
  );
}

function AdminButton({ label, href, onClick, variant = "secondary", icon = "external" }) {
  return (
    <s-button variant={variant} href={href} target="_blank" onClick={onClick}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", lineHeight: 1 }}>
        <s-icon type={icon} />
        {label}
      </span>
    </s-button>
  );
}

function StatusCard({
  appEmbedActive,
  blockStatuses,
  urls,
  onWatchEditor,
}) {
  const activeBlockCount = blockStatuses.filter((block) => block.active).length;
  const hasAnyBlockActive = activeBlockCount > 0;
  const nextInactiveBlock = blockStatuses.find((block) => !block.active);

  return (
    <s-box border="base" borderRadius="large" background="base">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "16px 20px",
          borderBottom: "1px solid #e1e3e5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <s-text>App embed</s-text>
          <StatusPill
            active={appEmbedActive}
            activeLabel="Enabled"
            inactiveLabel="Not enabled"
          />
        </div>

        {appEmbedActive ? (
          <AdminButton label="Open app embeds" href={urls.openAppEmbeds} onClick={onWatchEditor} />
        ) : (
          <AdminButton
            label="Enable app embed"
            variant="primary"
            href={urls.activateAppEmbed}
            onClick={onWatchEditor}
          />
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "16px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <s-icon type="app-extension" />
          <s-text>Bundle block</s-text>
          <StatusPill
            active={hasAnyBlockActive}
            activeLabel="Ready"
            inactiveLabel="Needs setup"
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <s-text tone="subdued">
            {activeBlockCount} of {blockStatuses.length} block{blockStatuses.length === 1 ? "" : "s"} added
          </s-text>
          {hasAnyBlockActive ? (
            <AdminButton label="Open theme editor" href={urls.openThemeEditor} onClick={onWatchEditor} />
          ) : nextInactiveBlock ? (
            <AdminButton
              label={`Add ${nextInactiveBlock.shortTitle}`}
              variant="primary"
              href={urls.blocks?.[nextInactiveBlock.handle]?.addToMainSection}
              onClick={onWatchEditor}
            />
          ) : (
            <AdminButton label="Open theme editor" href={urls.openThemeEditor} onClick={onWatchEditor} />
          )}
        </div>
      </div>
    </s-box>
  );
}

function StepCircle({ done, index }) {
  if (done) {
    return (
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "999px",
          background: "#008060",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
          <path
            d="M1 4l3.5 3.5L11 1"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "24px",
        height: "24px",
        borderRadius: "999px",
        border: "2px dashed #8c9196",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: "11px",
        fontWeight: 700,
        color: "#8c9196",
      }}
    >
      {index}
    </div>
  );
}

function ProgressBar({ value, max }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div
      style={{
        height: "4px",
        borderRadius: "999px",
        background: "#e4e5e7",
        overflow: "hidden",
        marginTop: "8px",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: "#008060",
          borderRadius: "999px",
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

function BundleBlockPicker({
  blockStatuses,
  urls,
  onWatchEditor,
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "12px",
      }}
    >
      {blockStatuses.map((block) => (
        <s-box
          key={block.handle}
          border="base"
          borderRadius="base"
          padding="base"
          background="base"
        >
          <s-stack gap="small-200">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <s-text type="strong">{block.shortTitle}</s-text>
              <StatusPill
                active={block.active}
                activeLabel="Added"
                inactiveLabel="Not added"
              />
            </div>

            <s-text tone="subdued">{block.description}</s-text>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {!block.active ? (
                <s-button
                  variant="primary"
                  href={urls.blocks?.[block.handle]?.addToMainSection}
                  target="_blank"
                  onClick={onWatchEditor}
                >
                  Add block to theme
                </s-button>
              ) : null}

              <s-button variant="secondary" href={urls.openThemeEditor} target="_blank" onClick={onWatchEditor}>
                Open theme editor
              </s-button>
            </div>
          </s-stack>
        </s-box>
      ))}
    </div>
  );
}
function SetupGuide({
  steps,
  completedSteps,
  totalSteps,
  appEmbedActive,
  blockStatuses,
  refreshing,
  setupComplete,
  onRefresh,
  urls,
  onWatchEditor,
  onCreateBundle,
}) {
  const firstIncomplete = steps.findIndex((step) => !step.complete);
  const [activeStep, setActiveStep] = useState(firstIncomplete >= 0 ? firstIncomplete : 0);

  useEffect(() => {
    const nextIncomplete = steps.findIndex((step) => !step.complete);
    setActiveStep(nextIncomplete >= 0 ? nextIncomplete : 0);
  }, [steps]);

  const hasAnyBlockActive = blockStatuses.some((block) => block.active);
  const nextInactiveBlock = blockStatuses.find((block) => !block.active);

  const firstLabel = !appEmbedActive
    ? "Enable app embed"
    : !hasAnyBlockActive && nextInactiveBlock
      ? `Add ${nextInactiveBlock.shortTitle}`
      : "Create your first bundle";

  return (
    <s-box border="base" borderRadius="large" background="base" padding="none">
      <div style={{ padding: "18px 20px 8px" }}>
        <s-text tone="subdued">
          {completedSteps} of {totalSteps} setup tasks completed
        </s-text>
        <ProgressBar value={completedSteps} max={totalSteps} />
        <div style={{ marginTop: "12px" }}>
          <s-heading>Get started with Bundlo</s-heading>
        </div>
        <s-text tone="subdued">
          Follow these steps to activate Bundlo on your storefront and start offering bundles to your customers.
        </s-text>
      </div>

      <div
        style={{
          margin: "12px 20px",
          padding: "12px 16px",
          borderRadius: "10px",
          background: "#f6f6f7",
          border: "1px solid #e1e3e5",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <s-text>
          <strong>{setupComplete ? "You are ready:" : "Next step:"}</strong> {firstLabel}
        </s-text>

        {!setupComplete ? (
          !appEmbedActive ? (
            <s-button variant="primary" href={urls.activateAppEmbed} target="_blank" onClick={onWatchEditor}>
              Get started
            </s-button>
          ) : !hasAnyBlockActive && nextInactiveBlock ? (
            <s-button
              variant="primary"
              href={urls.blocks?.[nextInactiveBlock.handle]?.addToMainSection}
              target="_blank"
              onClick={onWatchEditor}
            >
              Get started
            </s-button>
          ) : (
            <s-button variant="primary" onClick={onCreateBundle}>
              Create bundle
            </s-button>
          )
        ) : (
          <s-button variant="primary" onClick={onCreateBundle}>
            Create bundle
          </s-button>
        )}
      </div>

      <div
        style={{
          padding: "0 20px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {steps.map((step, idx) => {
          const isDone = step.complete;

          const isOpen = activeStep === idx;

          return (
            <div
              key={step.id}
              style={{
                borderRadius: "10px",
                border: isOpen ? "1px solid #e1e3e5" : "none",
                background: isOpen ? "#f9fafb" : "transparent",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveStep(idx)}
                style={{
                  width: "100%",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  textAlign: "left",
                  padding: "12px 14px",
                }}
              >
                <StepCircle done={isDone} index={idx + 1} />
                <span
                  style={{
                    fontSize: "14px",
                    color: isDone ? "#6d7175" : "#202223",
                    textDecoration: isDone ? "line-through" : "none",
                  }}
                >
                  {step.title}
                </span>
              </button>

              {isOpen ? (
                <div
                  style={{
                    padding: "0 14px 16px 50px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <s-text tone="subdued">{step.description}</s-text>

                  {step.id === "embed" ? (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {!appEmbedActive ? (
                        <s-button variant="primary" href={urls.activateAppEmbed} target="_blank" onClick={onWatchEditor}>
                          Enable app embed
                        </s-button>
                      ) : (
                        <s-button variant="secondary" href={urls.openAppEmbeds} target="_blank" onClick={onWatchEditor}>
                          Open app embeds
                        </s-button>
                      )}

                      <s-button variant="plain" onClick={onRefresh}>
                        {refreshing ? "Checking status…" : "Check again"}
                      </s-button>
                    </div>
                  ) : null}

                  {step.id === "block" ? (
                    <>
                      <BundleBlockPicker
                        blockStatuses={blockStatuses}
                        urls={urls}
                        onWatchEditor={onWatchEditor}
                      />
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <s-button variant="plain" onClick={onRefresh}>
                          {refreshing ? "Checking…" : "Refresh status"}
                        </s-button>
                      </div>
                    </>
                  ) : null}

                  {step.id === "bundle" ? (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <s-button variant="primary" onClick={onCreateBundle}>
                        Create bundle
                      </s-button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </s-box>
  );
}


export default function AppIndex() {
  const {
    shop,
    featureAccess,
    themes,
    selectedTheme,
    template,
    appEmbedActive,
    blockStatuses,
    urls,
    steps,
    completedSteps,
    totalSteps,
    createBundleUrl,
    viewAllBundlesUrl,
    setupComplete,
  } = useLoaderData();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const revalidator = useRevalidator();

  useEffect(() => {
  console.log("Current URL:", window.location.href);
  console.log("Path:", window.location.pathname);
  console.log("Search:", window.location.search);

  // Uncomment ONLY for testing
  // navigate("/app/Customize/free-shipping-progress-bar?surface=CART");
}, []);


  const [themeId, setThemeId] = useState(selectedTheme.id);
  const [refreshing, setRefreshing] = useState(false);
  const [watchingEditor, setWatchingEditor] = useState(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeBundleType = BUNDLE_TYPE_SLIDES[activeIndex];

const activeBundleFeatureAccess = {
  fixed: featureAccess.FIXED_BUNDLE,
  volume: featureAccess.VOLUME_BUNDLE,
  mix: featureAccess.MIX_MATCH,
  byob: featureAccess.BYOB,
  multivariant: featureAccess.MULTIVARIANT,
};

const canCreateActiveBundle = activeBundleFeatureAccess[activeBundleType.id] === true;
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);


  const goToSlide = (index) => setActiveIndex(index);
  const goPrev = () =>
    setActiveIndex((prev) => (prev === 0 ? BUNDLE_TYPE_SLIDES.length - 1 : prev - 1));
  const goNext = () =>
    setActiveIndex((prev) => (prev === BUNDLE_TYPE_SLIDES.length - 1 ? 0 : prev + 1));

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) goNext();
    if (distance < -50) goPrev();
  };

  useEffect(() => {
    setThemeId(selectedTheme.id);
  }, [selectedTheme.id]);

  useEffect(() => {
    if (revalidator.state === "idle") {
      setRefreshing(false);
    }
  }, [revalidator.state]);

  useEffect(() => {
    let timer;

    const revalidateAfterReturn = () => {
      if (!watchingEditor) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        setRefreshing(true);
        revalidator.revalidate();
      }, 2000);
    };

    const handleVisibility = () => {
      if (!document.hidden) revalidateAfterReturn();
    };

    window.addEventListener("focus", revalidateAfterReturn);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", revalidateAfterReturn);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [revalidator, watchingEditor]);

  useEffect(() => {
    if (!watchingEditor) return;
    const interval = setInterval(() => revalidator.revalidate(), 15000);
    return () => clearInterval(interval);
  }, [revalidator, watchingEditor]);

  useEffect(() => {
    if (appEmbedActive && blockStatuses.some((block) => block.active)) {
      setWatchingEditor(false);
    }
  }, [appEmbedActive, blockStatuses]);

  const handleThemeChange = (nextThemeId) => {
    setThemeId(nextThemeId);
    const params = new URLSearchParams(searchParams);
    params.set("theme", nextThemeId);
    navigate(`?${params.toString()}`);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    revalidator.revalidate();
  };
  const handleCreateBundle = useCallback(() => {
    navigate(createBundleUrl);
  }, [navigate, createBundleUrl]);

  const handleWatchEditor = useCallback(() => {
    setWatchingEditor(true);
  }, []);





  return (
    <s-page>
      <s-section padding="none">
        <s-grid
          gridTemplateColumns="50% 45%"
          blockSize="213px"
          inlineSize="100%"
          overflow="hidden"
          borderRadius="large"
        >
          <s-grid-item>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                height: "100%",
                padding: "8px 32px 24px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "360px",
                  textAlign: "left",
                }}
              >
                <s-stack gap="base" alignItems="flexStart">
                  <h1 style={{ fontSize: "16px", margin: 0 }}>
                    Hi {shop.name}! Welcome to Bundlo.
                  </h1>

                  <s-text style={{ fontSize: "20px" }}>
                    Turn everyday products into stronger offers with bundle
                    experiences that are easy for merchants to launch.
                  </s-text>

                  {setupComplete ? (
                    <div style={{ marginTop: "6px", width: "100%" }}>
                      <s-grid
                        gridTemplateColumns="auto auto"
                        gap="base"
                        justifyContent="start"
                      >
                        <s-grid-item>
                          <s-button variant="primary" onClick={handleCreateBundle}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                lineHeight: 1,
                              }}
                            >
                              <s-icon type="arrow-right" />
                              Create a new bundle
                            </span>
                          </s-button>
                        </s-grid-item>

                        <s-grid-item>
                          <s-button
                            variant="secondary"
                            href={viewAllBundlesUrl}
                            target="auto"
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                lineHeight: 1,
                              }}
                            >
                              <s-icon type="view" />
                              View all bundles
                            </span>
                          </s-button>
                        </s-grid-item>
                      </s-grid>
                    </div>
                  ) : null}
                </s-stack>
              </div>
            </div>
          </s-grid-item>

          <s-grid-item overflow="hidden" blockSize="100%">
            <img
              src="/loading.png"
              alt="Bundlo welcome"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
                display: "block",
              }}
            />
          </s-grid-item>
        </s-grid>
      </s-section>

      <s-section>
        <ThemeSelector
          themes={themes}
          selectedThemeId={themeId}
          onThemeChange={handleThemeChange}
        />
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-stack direction="inline" gap="base">
            <s-text>Selected theme: {selectedTheme.name}</s-text>
            <s-badge tone={selectedTheme.isMain ? "success" : "info"}>
              {selectedTheme.isMain ? "Main theme" : "Draft theme"}
            </s-badge>
          </s-stack>

          <s-text tone="subdued">
            Configure the app embed and at least one bundle block for the{" "}
            {template} template on this theme.
          </s-text>
        </s-stack>
      </s-section>

      <s-section>
        <StatusCard
          appEmbedActive={appEmbedActive}
          blockStatuses={blockStatuses}
          urls={urls}
          onWatchEditor={handleWatchEditor}
        />
      </s-section>

      <s-section>
        {refreshing ? (
          <s-box
            padding="large"
            background="base"
            border="base"
            borderRadius="large"
          >
            <s-stack alignItems="center" gap="base">
              <s-spinner />
              <s-text tone="subdued">Checking setup status…</s-text>
            </s-stack>
          </s-box>
        ) : (
          <SetupGuide
            steps={steps}
            completedSteps={completedSteps}
            totalSteps={totalSteps}
            appEmbedActive={appEmbedActive}
            blockStatuses={blockStatuses}
            refreshing={refreshing}
            setupComplete={setupComplete}
            onRefresh={handleRefresh}
            urls={urls}
            onWatchEditor={handleWatchEditor}
            onCreateBundle={handleCreateBundle}
          />
        )}
      </s-section>

      <s-stack gap="large-200">
        <s-section>
          <s-box
            border="base"
            borderRadius="large-200"
            padding="large-200"
            background="base"
          >
            <s-grid
              gridTemplateColumns="@container (inline-size > 900px) 1.1fr 0.9fr, 1fr"
              gap="large-200"
              alignItems="center"
            >
              <s-grid-item>
                <s-stack gap="base">
                  <s-heading color="subdued" style={{ fontSize: "40px", fontWeight: 600 }}>
                    Build bundle offers that drive more sales
                  </s-heading>

                  <s-heading>
                    Create bundle offers that are easy for your customers to understand and purchase
                  </s-heading>

                  <s-paragraph>
                    Bundlo lets you add fixed sets, volume deals, mix and match, and build-your-own
                    bundles to your store — without overcomplicating the shopping experience for your customers.
                  </s-paragraph>

                  <s-stack direction="inline" gap="base">
                    <s-button variant="primary" onClick={handleCreateBundle}>
                      Create first bundle
                    </s-button>
                    <s-button variant="secondary" href="/examples" target="auto">
                      Explore demo ideas
                    </s-button>
                  </s-stack>

                  <s-grid gridTemplateColumns="repeat(3, 1fr)" gap="base">
                    <s-grid-item>
                      <s-box padding="base" background="subdued" borderRadius="base">
                        <s-stack gap="small-100">
                          <s-text type="strong">Clearer offers</s-text>
                          <s-text tone="subdued">Customers see the value of each bundle at a glance.</s-text>
                        </s-stack>
                      </s-box>
                    </s-grid-item>

                    <s-grid-item>
                      <s-box padding="base" background="subdued" borderRadius="base">
                        <s-stack gap="small-100">
                          <s-text type="strong">Increased order value</s-text>
                          <s-text tone="subdued">Bundles encourage customers to add more to their cart.</s-text>

                        </s-stack>
                      </s-box>
                    </s-grid-item>

                    <s-grid-item>
                      <s-box padding="base" background="subdued" borderRadius="base">
                        <s-stack gap="small-100">
                          <s-text type="strong">Quick to set up</s-text>
                          <s-text tone="subdued">Choose a bundle type and launch it in minutes, no coding required.</s-text>
                        </s-stack>
                      </s-box>
                    </s-grid-item>
                  </s-grid>
                </s-stack>
              </s-grid-item>

              <s-grid-item>
                <s-box
                  border="base"
                  borderRadius="large"
                  padding="base"
                  background="subdued"
                >
                  <s-stack gap="base">
                    <s-box
                      borderRadius="base"
                      padding="base"
                      background="base"
                      border="base"
                    >
                      <s-stack gap="small">
                        <s-text type="strong">Bundle type explorer</s-text>
                        <s-text tone="subdued">
                          Browse the available bundle types below to understand how each one works and when to use it.
                        </s-text>
                      </s-stack>
                    </s-box>
                    <s-box
                      border="base"
                      borderRadius="large-200"
                      background="subdued"
                      padding="large-200"
                    >
                      <s-stack gap="large">
                        <s-stack gap="small-100">
                          <s-badge tone="info">Explore bundle types</s-badge>
                          <s-heading>Find the right bundle type for your products</s-heading>
                          <s-text tone="subdued">
                            Each bundle type serves a different purpose. Browse through them to find the best
                            fit for your store, then create it directly from here.
                          </s-text>
                        </s-stack>

                        <s-grid
                          gridTemplateColumns="@container (inline-size > 900px) 1.1fr 0.9fr, 1fr"
                          gap="large"
                          alignItems="stretch"
                        >
                          <s-grid-item>
                            <s-box
                              border="base"
                              borderRadius="large"
                              background="base"
                              padding="large"
                              minBlockSize="100%"
                            >
                              <s-stack gap="base">
                                <s-stack direction="inline" alignItems="center" gap="base">
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      flexWrap: "wrap",
                                      width: "100%",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <s-badge tone="success">Live preview</s-badge>
                                      <s-text type="strong">Product page experience</s-text>
                                    </div>

                                    <s-text tone="subdued">{BUNDLE_TYPE_SLIDES[activeIndex].label}</s-text>
                                  </div>
                                </s-stack>

                                <s-box
                                  border="base"
                                  borderRadius="large"
                                  background="subdued"
                                  padding="base"
                                >
                                  <s-stack gap="base">
                                    <div
                                      onTouchStart={handleTouchStart}
                                      onTouchEnd={handleTouchEnd}
                                      style={{
                                        position: "relative",
                                        overflow: "hidden",
                                        borderRadius: "18px",
                                        width: "100%",
                                        maxWidth: "320px",
                                        margin: "0 auto",
                                        background: "#ffffff",
                                        border: "1px solid #e1e3e5",
                                        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          padding: "10px 12px",
                                          borderBottom: "1px solid #eef0f1",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "6px",
                                          background: "#fafbfb",
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: "8px",
                                            height: "8px",
                                            borderRadius: "999px",
                                            background: "#ff5f57",
                                          }}
                                        />
                                        <span
                                          style={{
                                            width: "8px",
                                            height: "8px",
                                            borderRadius: "999px",
                                            background: "#ffbd2f",
                                          }}
                                        />
                                        <span
                                          style={{
                                            width: "8px",
                                            height: "8px",
                                            borderRadius: "999px",
                                            background: "#28c840",
                                          }}
                                        />
                                        <span
                                          style={{
                                            marginLeft: "8px",
                                            fontSize: "12px",
                                            color: "#6d7175",
                                            fontWeight: 500,
                                          }}
                                        >
                                          Bundlo storefront preview
                                        </span>
                                      </div>

                                      <div
                                        style={{
                                          display: "flex",
                                          width: `${BUNDLE_TYPE_SLIDES.length * 100}%`,
                                          transform: `translateX(-${activeIndex * (100 / BUNDLE_TYPE_SLIDES.length)}%)`,
                                          transition: "transform 320ms ease",
                                        }}
                                      >
                                        {BUNDLE_TYPE_SLIDES.map((slide) => (
                                          <div
                                            key={slide.id}
                                            style={{
                                              width: `${100 / BUNDLE_TYPE_SLIDES.length}%`,
                                              flexShrink: 0,
                                              padding: "16px",
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: "100%",
                                                minHeight: "260px",
                                                borderRadius: "18px",
                                                background: slide.bg,
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "space-between",
                                                padding: "18px",
                                                gap: "20px",
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: "flex",
                                                  justifyContent: "space-between",
                                                  alignItems: "flex-start",
                                                  gap: "20px",
                                                }}
                                              >
                                                <div>
                                                  <div
                                                    style={{
                                                      width: "55px",
                                                      height: "55px",
                                                      borderRadius: "16px",
                                                      background: slide.card,
                                                      boxShadow: "0 12px 24px rgba(0, 0, 0, 0.12)",
                                                      padding: "12px",
                                                    }}
                                                  />
                                                </div>
                                                <div style={{
                                                  padding: "6px 10px",
                                                  borderRadius: "999px",
                                                  background: "rgba(255,255,255,0.78)",
                                                  fontSize: "12px",
                                                  fontWeight: 600,
                                                  color: "#111827",
                                                }}>
                                                  {slide.tag}
                                                </div>
                                              </div>

                                              <div style={{ display: "grid", gap: "10px" }}>
                                                {/* Main card — bundle type name + description */}
                                                <div
                                                  style={{
                                                    background: "rgba(255,255,255,0.92)",
                                                    borderRadius: "14px",
                                                    padding: "15px",
                                                    border: "1px solid rgba(255,255,255,0.9)",
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      fontSize: "14px",
                                                      fontWeight: 700,
                                                      color: "#111827",
                                                      marginBottom: "4px",
                                                    }}
                                                  >
                                                    {slide.label}
                                                  </div>
                                                  <div
                                                    style={{
                                                      fontSize: "12px",
                                                      color: "#6b7280",
                                                      lineHeight: 1.5,
                                                    }}
                                                  >
                                                    {slide.description}
                                                  </div>
                                                </div>

                                                {/* Use case example pill */}
                                                <div
                                                  style={{
                                                    background: "rgba(255,255,255,0.85)",
                                                    borderRadius: "12px",
                                                    padding: "10px 12px",
                                                    fontSize: "12px",
                                                    color: "#374151",
                                                    fontStyle: "italic",
                                                  }}
                                                >
                                                  {slide.useCase}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={goPrev}
                                        aria-label="Previous preview"
                                        style={{
                                          position: "absolute",
                                          top: "50%",
                                          left: "10px",
                                          transform: "translateY(-50%)",
                                          width: "34px",
                                          height: "34px",
                                          borderRadius: "999px",
                                          border: "1px solid #d1d5db",
                                          background: "rgba(255,255,255,0.96)",
                                          cursor: "pointer",
                                          fontSize: "18px",
                                          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                                        }}
                                      >
                                        ‹
                                      </button>

                                      <button
                                        type="button"
                                        onClick={goNext}
                                        aria-label="Next preview"
                                        style={{
                                          position: "absolute",
                                          top: "50%",
                                          right: "10px",
                                          transform: "translateY(-50%)",
                                          width: "34px",
                                          height: "34px",
                                          borderRadius: "999px",
                                          border: "1px solid #d1d5db",
                                          background: "rgba(255,255,255,0.96)",
                                          cursor: "pointer",
                                          fontSize: "18px",
                                          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                                        }}
                                      >
                                        ›
                                      </button>
                                    </div>

                                    <s-stack gap="small-100" alignItems="center">
                                      <div style={{ display: "flex", gap: "8px" }}>
                                        {BUNDLE_TYPE_SLIDES.map((_, index) => (
                                          <button
                                            key={index}
                                            type="button"
                                            aria-label={`Go to preview ${index + 1}`}
                                            onClick={() => goToSlide(index)}
                                            style={{
                                              width: index === activeIndex ? "20px" : "8px",
                                              height: "8px",
                                              borderRadius: "999px",
                                              border: "none",
                                              padding: 0,
                                              cursor: "pointer",
                                              transition: "all 180ms ease",
                                              background: index === activeIndex ? "#111827" : "#d1d5db",
                                            }}
                                          />
                                        ))}
                                      </div>

                                      <s-grid gridTemplateColumns="repeat(3, 1fr)" gap="small" inlineSize="100%">
                                        <s-grid-item>
                                          <s-box border="base" borderRadius="base" padding="small" background="base">
                                            <s-stack gap="small-100">
                                              <s-text type="strong">Clear offer</s-text>
                                              <s-text tone="subdued">Customers understand the deal immediately</s-text>
                                            </s-stack>
                                          </s-box>
                                        </s-grid-item>
                                        <s-grid-item>
                                          <s-box border="base" borderRadius="base" padding="small" background="base">
                                            <s-stack gap="small-100">
                                              <s-text type="strong">Higher revenue</s-text>
                                              <s-text tone="subdued">More items per order, more value per visit</s-text>
                                            </s-stack>
                                          </s-box>
                                        </s-grid-item>
                                        <s-grid-item>
                                          <s-box border="base" borderRadius="base" padding="small" background="base">
                                            <s-stack gap="small-100">
                                              <s-text type="strong">Fits your store</s-text>
                                              <s-text tone="subdued">Designed to blend into your existing theme</s-text>
                                            </s-stack>
                                          </s-box>
                                        </s-grid-item>
                                      </s-grid>
                                    </s-stack>
                                  </s-stack>
                                </s-box>
                              </s-stack>
                            </s-box>
                          </s-grid-item>

                          <s-stack gap="base">
                            <s-badge tone="info">{BUNDLE_TYPE_SLIDES[activeIndex].tag}</s-badge>
                            <s-heading>{BUNDLE_TYPE_SLIDES[activeIndex].label}</s-heading>
                            <s-text tone="subdued">
                              {BUNDLE_TYPE_SLIDES[activeIndex].description}
                            </s-text>
                            <s-box
                              border="base"
                              borderRadius="base"
                              padding="base"
                              background="subdued"
                            >
                              <s-text tone="subdued">
                                {BUNDLE_TYPE_SLIDES[activeIndex].useCase}
                              </s-text>
                            </s-box>
                            <s-button
                              variant="primary"
                              disabled={!canCreateActiveBundle}
                              onClick={() => {
                                if (!canCreateActiveBundle) return;

                                navigate(
                                  `${createBundleUrl}?type=${BUNDLE_TYPE_SLIDES[activeIndex].createType}`
                                );
                              }}
                            >
                              {canCreateActiveBundle
                                ? "Create this bundle type"
                                : "Upgrade to unlock"}
                            </s-button>
                          </s-stack>
                        </s-grid>
                      </s-stack>
                    </s-box>
                  </s-stack>
                </s-box>
              </s-grid-item>
            </s-grid>
          </s-box>
        </s-section>

        <s-section heading="Why this experience works">
          <s-stack direction="inline" gap="base">
            <div style={{ inlineSize: "100%", maxWidth: "300px" }}>
              <s-box border="base" borderRadius="large" padding="large" background="base">
                <div
                  style={{
                    minHeight: "170px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "16px",
                  }}
                >
                  <s-stack gap="small-100">
                    <s-heading size="small">Higher average order value</s-heading>
                    <s-text tone="subdued">
                      Well-structured bundles naturally encourage customers to purchase more in a single order.
                    </s-text>
                  </s-stack>

                  <s-badge tone="info">More revenue per order</s-badge>
                </div>
              </s-box>
            </div>

            <div style={{ inlineSize: "100%", maxWidth: "300px" }}>
              <s-box border="base" borderRadius="large" padding="large" background="base">
                <div
                  style={{
                    minHeight: "170px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "16px",
                  }}
                >
                  <s-stack gap="small-100">
                    <s-heading size="small">Simple to get started</s-heading>
                    <s-text tone="subdued">
                      Select a bundle type, configure your offer, and publish — no design or development work needed.
                    </s-text>
                  </s-stack>

                  <s-badge tone="attention">No coding required</s-badge>
                </div>
              </s-box>
            </div>

            <div style={{ inlineSize: "100%", maxWidth: "300px" }}>
              <s-box border="base" borderRadius="large" padding="large" background="base">
                <div
                  style={{
                    minHeight: "170px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "16px",
                  }}
                >
                  <s-stack gap="small-100">
                    <s-heading size="small">Easier launch path</s-heading>
                    <s-text tone="subdued">
                      Start from proven patterns instead of designing every offer from
                      scratch.
                    </s-text>
                  </s-stack>

                  <s-badge tone="attention">Faster to launch</s-badge>
                </div>
              </s-box>
            </div>
          </s-stack>
        </s-section>

      </s-stack>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);






