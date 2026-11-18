import { authenticate } from "../shopify.server";
import {
  getBundleAnalyticsDaily,
  getBundleAnalyticsSummary,
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

    const [summary, daily] = await Promise.all([
      getBundleAnalyticsSummary(
        session.shop,
        startDate,
        endDate,
      ),
      getBundleAnalyticsDaily(
        session.shop,
        startDate,
        endDate,
      ),
    ]);

    const dailyData = daily.map((item) => ({
      date: item.date.toISOString().slice(0, 10),
      revenue: Number(item.revenue ?? 0),
      orders: Number(item.orders ?? 0),
      quantity: Number(item.quantity ?? 0),
    }));

    const result = {
      startDate: startDateParam,
      endDate: endDateParam,
      summary: {
        totalRevenue: Number(summary?.totalRevenue ?? 0),
        totalUnitsSold: Number(summary?.totalUnitsSold ?? 0),
        totalOrders: Number(summary?.totalOrders ?? 0),
      },
      daily: dailyData,
    };

    console.log("[Sidekick Bundle Analytics] Result:", result);

    return cors(Response.json(result));
  } catch (error) {
    console.error("[Sidekick Bundle Analytics] Error:", error);

    return Response.json(
      {
        ok: false,
        error: "Failed to get bundle analytics.",
      },
      { status: 500 },
    );
  }
}
