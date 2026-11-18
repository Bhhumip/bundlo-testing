import { authenticate } from "../shopify.server";
import {
  getBundleAnalyticsPerformance,
  getBundleAnalyticsByType,
} from "../models/bundle.server";
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

    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return cors(
        Response.json(
          {
            ok: false,
            error: "startDate and endDate are required.",
          },
          { status: 400 },
        ),
      );
    }

    const startDate = new Date(`${startDateParam}T00:00:00.000Z`);
    const endDate = new Date(`${endDateParam}T23:59:59.999Z`);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return cors(
        Response.json(
          {
            ok: false,
            error: "Invalid date format. Use YYYY-MM-DD.",
          },
          { status: 400 },
        ),
      );
    }

    if (startDate > endDate) {
      return cors(
        Response.json(
          {
            ok: false,
            error: "startDate cannot be after endDate.",
          },
          { status: 400 },
        ),
      );
    }

    const [performance, byType] = await Promise.all([
      getBundleAnalyticsPerformance(
        session.shop,
        startDate,
        endDate,
      ),
      getBundleAnalyticsByType(
        session.shop,
        startDate,
        endDate,
      ),
    ]);

    const performanceData = performance.map((item) => ({
  bundleId: item.bundleId,
  title: item.bundle?.title ?? "Unknown bundle",
  type: item.bundle?.type ?? "UNKNOWN",
  revenue: Number(item.totalRevenue ?? 0),
  orders: Number(item.totalOrders ?? 0),
  quantity: Number(item.totalQuantity ?? 0),
}));

    const typeData = byType.map((item) => ({
      type: item.type,
      revenue: Number(item.revenue ?? 0),
      orders: Number(item.orders ?? 0),
      quantity: Number(item.quantity ?? 0),
    }));

    const result = {
      startDate: startDateParam,
      endDate: endDateParam,
      performance: performanceData,
      byType: typeData,
    };

    return cors(Response.json(result));
  } catch (error) {
    console.error("[Sidekick Bundle Performance] Error:", error);

    return Response.json(
      {
        ok: false,
        error: "Failed to get bundle performance.",
      },
      { status: 500 },
    );
  }
}
