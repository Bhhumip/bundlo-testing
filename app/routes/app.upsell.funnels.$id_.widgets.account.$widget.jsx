import { useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getUpsellFunnel } from "../models/upsell.server";
import { findWidgetDefinition } from "./app.upsell.funnels.$id_.widgets.account.jsx";
import { ACCOUNT_WIDGET_COMPONENTS } from "../components/account-widgets";
import { WidgetManagePage } from "../components/widget-route-utils";

const SURFACE = "ACCOUNT";

const widgetKeyFromSlug = (slug) => String(slug || "").replace(/-/g, "_");

export const loader = async ({ request, params }) => {
  const { session, redirect } = await authenticate.admin(request);
  const funnel = await getUpsellFunnel(session.shop, params.id);

  if (!funnel) {
    throw new Response("Not Found", { status: 404 });
  }

  if (funnel.surface !== SURFACE) {
    return redirect(`/app/upsell/funnels/${params.id}/widgets`);
  }

  const widgetKey = widgetKeyFromSlug(params.widget);
  const definition = findWidgetDefinition(widgetKey);

  if (!definition) {
    throw new Response("Not Found", { status: 404 });
  }

  return { funnel, definition };
};

export default function AccountWidgetManageRoute() {
  const { funnel, definition } = useLoaderData();
  const WidgetComponent = ACCOUNT_WIDGET_COMPONENTS[definition.key] || null;

  return (
    <WidgetManagePage
      funnel={funnel}
      definition={definition}
      WidgetComponent={WidgetComponent}
      backPath={`/app/upsell/funnels/${funnel.id}/widgets/account`}
      surfaceName="Customer account"
      backLabel="Back to customer account widgets"
    />
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
