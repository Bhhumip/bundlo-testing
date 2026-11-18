import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getUpsellFunnel } from "../models/upsell.server";
import { UPSELL_SURFACES } from "../models/upsell.constants";

function buildSurfaceWidgetsRoute(id, surface) {
  switch (surface) {
    case UPSELL_SURFACES.PDP:
      return `/app/upsell/funnels/${id}/widgets/pdp`;
    case UPSELL_SURFACES.CART:
      return `/app/upsell/funnels/${id}/widgets/cart`;
    case UPSELL_SURFACES.CHECKOUT:
      return `/app/upsell/funnels/${id}/widgets/checkout`;
    case UPSELL_SURFACES.POST_PURCHASE:
      return `/app/upsell/funnels/${id}/widgets/post-purchase`;
    case UPSELL_SURFACES.ACCOUNT:
      return `/app/upsell/funnels/${id}/widgets/account`;
    default:
      return `/app/upsell/funnels/${id}/widgets/pdp`;
  }
}

function buildWidgetsBaseRoute(id) {
  return `/app/upsell/funnels/${id}/widgets`;
}

export const loader = async ({ request, params }) => {
  const url = new URL(request.url);
  console.log(`[widgets layout loader] START | url=${url.pathname} | funnelId=${params.id} | method=${request.method}`);
  console.log(`[widgets layout loader] Headers: session-token=${request.headers.get("authorization") ? "present" : "MISSING"} | cookie=${request.headers.get("cookie") ? "present" : "MISSING"}`);

  let session, redirect;
  try {
    ({ session, redirect } = await authenticate.admin(request));
    console.log(`[widgets layout loader] authenticate.admin OK | shop=${session?.shop ?? "NULL"}`);
  } catch (err) {
    console.error(`[widgets layout loader] authenticate.admin THREW:`, err?.message ?? err);
    throw err;
  }

  if (!session?.shop) {
    console.warn(`[widgets layout loader] WARNING: session.shop is null/undefined after auth`);
  }

  let funnel;
  try {
    funnel = await getUpsellFunnel(session.shop, params.id);
    console.log(`[widgets layout loader] getUpsellFunnel | found=${!!funnel} | surface=${funnel?.surface ?? "N/A"}`);
  } catch (err) {
    console.error(`[widgets layout loader] getUpsellFunnel THREW:`, err?.message ?? err);
    throw err;
  }

  if (!funnel) {
    console.warn(`[widgets layout loader] Funnel not found, throwing 404`);
    throw new Response("Not Found", { status: 404 });
  }

  const widgetsBasePath = buildWidgetsBaseRoute(params.id);
  const isBaseRoute = url.pathname === widgetsBasePath;
  console.log(`[widgets layout loader] isBaseRoute=${isBaseRoute} | widgetsBasePath=${widgetsBasePath}`);

  if (isBaseRoute) {
    const target = buildSurfaceWidgetsRoute(params.id, funnel.surface);
    console.log(`[widgets layout loader] Redirecting base route → ${target}`);
    return redirect(target);
  }

  console.log(`[widgets layout loader] DONE, rendering Outlet`);
  return { funnel };
};

export default function UpsellFunnelWidgetsRoute() {
  useLoaderData();
  return <Outlet />;
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);