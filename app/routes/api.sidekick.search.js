import { authenticate } from "../shopify.server";
import { canShopAccessFeature } from "../featureAccess.server";
import { listBundles } from "../models/bundle.server";

export async function loader({ request }) {
  try {
    const { session, cors } = await authenticate.admin(request);

    if (!session?.shop) {
      return cors(
        Response.json(
          {
            ok: false,
            error: "Unauthenticated request: missing shop session.",
          },
          { status: 401 },
        ),
      );
    }

    // Shopify Sidekick access is available to Starter plan and above.
    const hasSidekickAccess = await canShopAccessFeature(
      session.shop,
      "BASIC_SUPPORT",
    );

    if (!hasSidekickAccess) {
      return cors(
        Response.json(
          {
            ok: false,
            error:
              "Bundlo Sidekick access is available on the Starter plan and above.",
          },
          { status: 403 },
        ),
      );
    }

    const url = new URL(request.url);

    const query = url.searchParams.get("query") || "";

    const firstParam = Number(
      url.searchParams.get("first") || 10,
    );

    const first = Math.min(
      Math.max(firstParam, 1),
      50,
    );

    const after = url.searchParams.get("after");

    const skip = after ? Number(after) || 0 : 0;

    const { bundles, total } = await listBundles(session.shop, {
      skip,
      take: first,
      query: query || undefined,
    });

    const results = bundles.map((bundle) => ({
      id: bundle.id,
      type: "bundle",
      title: bundle.title,
      url: `/app/bundles/${bundle.id}`,
    }));

    return cors(
      Response.json({
        results,
        pageInfo: {
          hasNextPage: skip + bundles.length < total,
          hasPreviousPage: skip > 0,
          startCursor: results.length
            ? String(skip)
            : null,
          endCursor: results.length
            ? String(skip + results.length)
            : null,
        },
      }),
    );
  } catch (error) {
    console.error("[Sidekick Search] Error:", error);

    return Response.json(
      {
        ok: false,
        error: "Failed to search Bundlo data.",
      },
      { status: 500 },
    );
  }
}