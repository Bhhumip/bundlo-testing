import { authenticate } from "../shopify.server";

function json(data, init) {
  return Response.json(data, init);
}

// More tolerant parser for settings_data.json
function safeParseSettings(content) {
  if (!content || typeof content !== "string") return {};

  // Remove BOM if present
  content = content.replace(/^\uFEFF/, "");

  // Strip // line comments
  content = content.replace(/^\s*\/\/.*$/gm, "");

  // Strip /* */ block comments
  content = content.replace(/\/\*[\s\S]*?\*\//g, "");

  // Remove trailing commas before } or ]
  content = content.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

function getBlocksFromSettings(settingsData) {
  if (!settingsData || typeof settingsData !== "object") return {};

  // Case 1: your own structure { current: { blocks: {...} } }
  if (settingsData.current && settingsData.current.blocks) {
    return settingsData.current.blocks || {};
  }

  // Case 2: standard Shopify structure:
  // { "current": "default", "presets": { "default": { "blocks": {...} } } }
  if (typeof settingsData.current === "string" && settingsData.presets) {
    const preset = settingsData.presets[settingsData.current];
    if (preset && preset.blocks) {
      return preset.blocks || {};
    }
  }

  return {};
}

function isEmbedEnabled(settingsData) {
  const blocks = getBlocksFromSettings(settingsData);
  const entries = Object.entries(blocks);

  const matches = entries.filter(([, block]) => {
    const type = String(block?.type || "");
    return (
      type.includes("/blocks/free-shipping-progress-embed/") ||
      type.includes("free-shipping-progress-embed") ||
      type.includes("cart-progress-embed")
    );
  });

  const enabledMatch = matches.find(([, block]) => block?.disabled !== true);

  return {
    enabled: Boolean(enabledMatch),
    blockCount: matches.length,
    matches: matches.map(([id, block]) => ({
      id,
      type: block?.type || "",
      disabled: Boolean(block?.disabled),
    })),
  };
}

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const themesRes = await admin.graphql(`
    query GetThemes {
      themes(first: 20) {
        nodes {
          id
          name
          role
        }
      }
    }
  `);

  const themesJson = await themesRes.json();
  const themes = themesJson?.data?.themes?.nodes || [];
  const mainTheme = themes.find(
    (theme) => String(theme.role || "").toLowerCase() === "main",
  );

  if (!mainTheme) {
    return json(
      { ok: false, enabled: false, error: "Main theme not found" },
      { status: 404 },
    );
  }

  const fileRes = await admin.graphql(
    `
      query GetThemeSettings($id: ID!) {
        theme(id: $id) {
          id
          files(filenames: ["config/settings_data.json"], first: 1) {
            nodes {
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
    `,
    {
      variables: { id: mainTheme.id },
    },
  );

  const fileJson = await fileRes.json();
  const content =
    fileJson?.data?.theme?.files?.nodes?.[0]?.body?.content || "{}";

  const settingsData = safeParseSettings(content);

  if (!settingsData) {
    return json(
      {
        ok: false,
        enabled: false,
        themeId: mainTheme.id,
        themeName: mainTheme.name,
        error: "Could not parse settings_data.json (non-JSON syntax)",
      },
      { status: 500 },
    );
  }

  const result = isEmbedEnabled(settingsData);

  return json({
    ok: true,
    themeId: mainTheme.id,
    themeName: mainTheme.name,
    enabled: result.enabled,
    blockCount: result.blockCount,
    matches: result.matches,
  });
}