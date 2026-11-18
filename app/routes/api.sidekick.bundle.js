import { authenticate } from "../shopify.server";
import { getBundle } from "../models/bundle.server";
import { requireSidekickAccess } from "../featureAccess.server";

export async function loader({ request }) {
  try {
    const { session, cors } = await authenticate.admin(request);

    if (!session?.shop) {
      return cors(
        Response.json(
          {
            ok: false,
            error: "Unauthenticated request.",
          },
          { status: 401 },
        ),
      );
    }

    const access = await requireSidekickAccess(session.shop);

if (!access.allowed) {
    return cors(Response.json({
        ok: false,
        error: access.error,
    }, { status: 403 }));
}   

    const url = new URL(request.url);
    const bundleId = url.searchParams.get("bundleId");

    if (!bundleId) {
      return cors(
        Response.json(
          {
            ok: false,
            error: "bundleId is required.",
          },
          { status: 400 },
        ),
      );
    }

    console.log("[Sidekick Bundle] Request:", { bundleId, shop: session.shop });

    const bundle = await getBundle(bundleId, session.shop);

    console.log("[Sidekick Bundle] DB Result:", bundle);

    if (!bundle) {
      return cors(
        Response.json(
          {
            ok: false,
            error: "Bundle not found.",
          },
          { status: 404 },
        ),
      );
    }

    return cors(
  Response.json({
    id: bundle.id,
    title: bundle.title,
    status: bundle.status,
    type: bundle.type,
    discountType: bundle.discountType,
    discountValue: Number(bundle.discountValue ?? 0),
    price: Number(bundle.price ?? 0),
    available: Boolean(bundle.available),
  }),
);
  } catch (error) {
    console.error("[Sidekick Bundle] Error:", error);

    return Response.json(
      {
        ok: false,
        error: "Failed to get bundle details.",
      },
      { status: 500 },
    );
  }
}
