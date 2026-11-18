import { useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getUpsellFunnel } from "../models/upsell.server";
import { findWidgetDefinition } from "./app.upsell.funnels.$id_.widgets.cart.jsx";
import { CART_WIDGET_COMPONENTS } from "../components/cart-widgets";
import { WidgetManagePage } from "../components/widget-route-utils";
import { requireFeatureAccess } from "../featureAccess.server";
const SURFACE = "CART";

const widgetKeyFromSlug = (slug) => String(slug || "").replace(/-/g, "_");

export const loader = async ({ request, params }) => {
  const url = new URL(request.url);
  console.log(
    `[cart widget detail loader] START | url=${url.pathname} | funnelId=${params.id} | widget=${params.widget} | method=${request.method}`,
  );
  console.log(
    `[cart widget detail loader] Headers: session-token=${
      request.headers.get("authorization") ? "present" : "MISSING"
    } | cookie=${request.headers.get("cookie") ? "present" : "MISSING"}`,
  );

  let session, redirect;
  try {
    ({ session, redirect } = await authenticate.admin(request));
    console.log(
      `[cart widget detail loader] authenticate.admin OK | shop=${session?.shop ?? "NULL"}`,
    );
  } catch (err) {
    console.error(`[cart widget detail loader] authenticate.admin THREW:`, err);
    throw err;
  }
  const funnel = await getUpsellFunnel(session.shop, params.id);
  console.log(
    `[cart widget detail loader] getUpsellFunnel | found=${!!funnel} | surface=${
      funnel?.surface ?? "N/A"
    }`,
  );

  if (!funnel) {
    console.warn(`[cart widget detail loader] Funnel not found, throwing 404`);
    throw new Response("Not Found", { status: 404 });
  }

  if (funnel.surface !== SURFACE) {
    console.warn(
      `[cart widget detail loader] Surface mismatch: expected=${SURFACE} actual=${funnel.surface}; redirecting to widgets base`,
    );
    return redirect(`/app/upsell/funnels/${params.id}/widgets`);
  }

  const widgetKey = widgetKeyFromSlug(params.widget);

  if (widgetKey === "order_notes") {
  await requireFeatureAccess(session.shop, "ORDER_NOTES_CART");
}
if (widgetKey === "countdown_timer_urgency") {
  await requireFeatureAccess(session.shop, "CART_COUNTDOWN");
}

  const definition = findWidgetDefinition(widgetKey);
  console.log(
    `[cart widget detail loader] findWidgetDefinition | widgetKey=${widgetKey} | found=${!!definition}`,
  );

  if (!definition) {
    console.warn(
      `[cart widget detail loader] Widget definition not found, throwing 404`,
    );
    throw new Response("Not Found", { status: 404 });
  }

  console.log(`[cart widget detail loader] DONE`);
  return { funnel, definition };
};

export default function CartWidgetManageRoute() {
  const { funnel, definition } = useLoaderData();
  const WidgetComponent = CART_WIDGET_COMPONENTS[definition.key] || null;

  return (
    <WidgetManagePage
      funnel={funnel}
      definition={definition}
      WidgetComponent={WidgetComponent}
      backPath={`/app/upsell/funnels/${funnel.id}/widgets/cart`}
      surfaceName="Cart"
      backLabel="Back to cart widgets"
    />
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
