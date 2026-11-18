import { authenticate } from "../shopify.server";
import { getBundleStats } from "../models/bundle.server";
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
    

    const stats = await getBundleStats(session.shop);

    console.log("[Sidekick Bundle Stats] Result:", stats);

    return cors(
      Response.json({
        totalBundles: Number(stats?.totalBundles ?? 0),
        activeBundles: Number(stats?.activeBundles ?? 0),
        totalRevenue: Number(stats?.totalRevenue ?? 0),
        rolling30DayRevenue: Number(stats?.rolling30DayRevenue ?? 0),
        totalOrders: Number(stats?.totalOrders ?? 0),
        totalUnitsSold: Number(stats?.totalUnitsSold ?? 0),
        deltas: {
          totalBundles: stats?.deltas?.totalBundles ?? null,
          activeBundles: stats?.deltas?.activeBundles ?? null,
        },
      }),
    );
  } catch (error) {
    console.error("[Sidekick Bundle Stats] Error:", error);

    return Response.json(
      {
        ok: false,
        error: "Failed to get bundle statistics.",
      },
      { status: 500 },
    );
  }
}
