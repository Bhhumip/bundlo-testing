// app/routes/api.upsell-tiers.jsx

import { unauthenticated } from "../shopify.server";
import { getUpsellTiersFromDiscounts } from "../models/upsell-tiers.server";
import { getUpsellWidget } from "../models/upsell.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const shop = url.searchParams.get("shop");

  if (!shop) {
    return jsonResponse({ tiers: [], error: "missing ?shop param" }, 400);
  }

  try {
    const { admin } = await unauthenticated.admin(shop);
    const tiers = await getUpsellTiersFromDiscounts(admin);

    const widget = await getUpsellWidget(
      shop,
      "CHECKOUT:free_shipping_progress_bar"
    );

    let theme = null;

    if (widget?.notes) {
      try {
        const parsed = JSON.parse(widget.notes);
        theme = parsed?.theme ?? null;
      } catch {
        theme = null;
      }
    }

    return jsonResponse({ tiers, theme }, 200);
  } catch (err) {
    return jsonResponse(
      { tiers: [], error: err?.message ?? "unknown error" },
      500
    );
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

