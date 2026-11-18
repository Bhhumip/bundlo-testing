import { redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

/**
 * /app/upsell has no UI of its own.
 * Redirect every direct visit straight to the funnels dashboard.
 */
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return redirect("/app/upsell/funnels");
};

export const headers = (headersArgs) => boundary.headers(headersArgs);