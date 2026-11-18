import { authenticate, unauthenticated } from "../shopify.server";



/**
 * Get the discount percentage from the actual Shopify automatic discount
 * used by the selected widget.
 *
 * FBT widget -> "FBT Discount"
 * CPR widget -> "CPR Discount"
 */
async function getWidgetDiscountPercentage(admin, widgetKey) {
  let discountTitle = null;

  if (widgetKey === "frequently_bought_together") {
    discountTitle = "FBT Discount";
  } else if (widgetKey === "customer_personalized_recommendation") {
    discountTitle = "CPR-discount";
  }

  if (!discountTitle) {
    return null;
  }

  try {
    const response = await admin.graphql(
      `#graphql
        query FindWidgetDiscount($query: String!) {
          discountNodes(first: 10, query: $query) {
            nodes {
              id
              metafield(
                namespace: "$app"
                key: "function-configuration"
              ) {
                value
                jsonValue
              }
              discount {
                __typename

                ... on DiscountAutomaticApp {
                  title
                  status
                  discountId
                }
              }
            }
          }
        }
      `,
      {
        variables: {
          query: `title:"${discountTitle}"`,
        },
      },
    );

    const json = await response.json();

    console.log(
      "[DISCOUNT GRAPHQL RAW]",
      JSON.stringify(json, null, 2),
    );

    if (json.errors) {
      console.error(
        "[WIDGET DISCOUNT] GraphQL errors:",
        JSON.stringify(json.errors, null, 2),
      );

      return null;
    }

    const nodes = json.data?.discountNodes?.nodes ?? [];

    console.log(
      `[WIDGET DISCOUNT] ${discountTitle} nodes:`,
      JSON.stringify(nodes, null, 2),
    );

    const matchingNode = nodes.find(
      (node) =>
        node.discount?.__typename === "DiscountAutomaticApp" &&
        node.discount?.title === discountTitle &&
        node.discount?.status === "ACTIVE",
    );

    if (!matchingNode) {
      console.log(
        `[WIDGET DISCOUNT] Active ${discountTitle} not found`,
      );

      return null;
    }

    const metafield = matchingNode.metafield;

    console.log(
      `[WIDGET DISCOUNT] ${discountTitle} metafield:`,
      JSON.stringify(metafield, null, 2),
    );

    // First try jsonValue
    if (
      metafield?.jsonValue &&
      typeof metafield.jsonValue === "object"
    ) {
      const percentage = Number(
        metafield.jsonValue.percentage,
      );

      if (
        Number.isFinite(percentage) &&
        percentage >= 0 &&
        percentage <= 100
      ) {
        console.log(
          `[WIDGET DISCOUNT] ${discountTitle} = ${percentage}%`,
        );

        return percentage;
      }
    }

    // Then try raw JSON string
    if (metafield?.value) {
      try {
        const parsed = JSON.parse(metafield.value);

        const percentage = Number(
          parsed?.percentage,
        );

        if (
          Number.isFinite(percentage) &&
          percentage >= 0 &&
          percentage <= 100
        ) {
          console.log(
            `[WIDGET DISCOUNT] ${discountTitle} = ${percentage}%`,
          );

          return percentage;
        }
      } catch (error) {
        console.error(
          `[WIDGET DISCOUNT] Failed to parse ${discountTitle}:`,
          error,
        );
      }
    }

    console.log(
      `[WIDGET DISCOUNT] No percentage found for ${discountTitle}`,
    );

    return null;
  } catch (error) {
    console.error(
      `[WIDGET DISCOUNT] Failed to read ${discountTitle}:`,
      error,
    );

    return null;
  }
}

export const loader = async ({ request }) => {
  // Validates the checkout session token, handles OPTIONS/CORS

  const url = new URL(request.url);
  console.log(
    "[widget-theme] REQUEST",
    JSON.stringify({
      method: request.method,
      widgetKey: url.searchParams.get("widgetKey"),
      surface: url.searchParams.get("surface"),
      hasAuthHeader: request.headers.has("authorization"),
    })
  );

  console.log("[widget-theme] hit:", request.method,
    "| auth header:", request.headers.get("authorization")?.slice(0, 25) ?? "MISSING");

  let auth;
  try {
    auth = await authenticate.public.checkout(request);
  } catch (e) {
    console.log("[widget-theme] auth rejected:", e?.status,
      e instanceof Response ? await e.clone().text() : e);
    throw e;
  }
  const { cors, sessionToken } = auth;
  const dest = sessionToken.dest;
  const shop = dest.startsWith("http") ? new URL(dest).host : dest;


  const widgetKey = url.searchParams.get("widgetKey");
  const surface = url.searchParams.get("surface") || "CHECKOUT";



  if (!widgetKey) {
    return cors(Response.json({ theme: null, enabled: false }));
  }

  try {
    const { getUpsellWidget } = await import("../models/upsell.server");
    const existingWidget = await getUpsellWidget(shop, `${surface}:${widgetKey}`);

    let savedTheme = null;
    let enabled = false;
    if (existingWidget?.notes) {
      try {
        const parsed = JSON.parse(existingWidget.notes);
        enabled = Boolean(parsed?.enabled);
        savedTheme = parsed?.theme ?? null;
      } catch (err) {
        console.error("[widget-theme] notes parse error:", err);
      }
    }

    const finalTheme = { ...(savedTheme || {}) };
    delete finalTheme.judgeMePrivateToken; // never send secrets to the browser

    if (
      widgetKey === "frequently_bought_together" ||
      widgetKey === "customer_personalized_recommendation"
    ) {
      const { admin } = await unauthenticated.admin(shop);
      const pct = await getWidgetDiscountPercentage(admin, widgetKey);
      if (pct != null) finalTheme.discountValue = pct;
    }

    return cors(Response.json({ theme: finalTheme, enabled }));
  } catch (err) {
    console.error("[widget-theme] error:", err);
    return cors(Response.json({ theme: null, enabled: false }));
  }
};