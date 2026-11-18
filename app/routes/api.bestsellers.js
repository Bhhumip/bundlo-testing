import { getValidSession } from "../utils/validateShop.server";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Content-Type": "application/json",
  };
}

export const headers = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
  "Content-Type": "application/json",
});

export const loader = async ({ request }) => {
  console.log("Bestsellers loader hit:", request.url);
  const headers = corsHeaders();

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const country = url.searchParams.get("country") ?? "US";
  const productIds = url.searchParams.get("productIds") ?? "";
  const cartIds = new Set(productIds.split(",").filter(Boolean));

  const session = await getValidSession(shop);

  if (!session) {
    console.warn("[Bundlo] Rejected request for unknown/invalid shop:", shop);
    return Response.json({ bestsellers: [] }, { status: 401, headers });
  }

  try {
    const gqlFetch = (query, variables = {}) =>
      fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": session.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      }).then((r) => r.json());

    // ── Find the first "automated" collection (all products, sorted by best selling)
    // OR use the Storefront API approach via collectionByHandle on "frontpage" / "all"
    // Admin API: collectionByHandle on the built-in "all" collection supports BEST_SELLING
    const collectionRes = await gqlFetch(
    `
    query GetBestSellers(
        $country: CountryCode!
    ) {
        collections(first: 1, query: "title:all") {
            nodes {
                id
                handle
                products(first: 10, sortKey: BEST_SELLING) {
                    nodes {
                        id
                        title
                        featuredImage { url }
                        variants(first: 1) {
                            nodes {
                                id
                                contextualPricing(context: { country: $country }) {
                                    price {
                                        amount
                                        currencyCode
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    `,
    {
        country
    }
    );

    if (collectionRes.errors) {
      console.error("[Bundlo] GraphQL errors:", JSON.stringify(collectionRes.errors));
    }

    let products = collectionRes?.data?.collections?.nodes?.[0]?.products?.nodes ?? [];

    // ──  if no "all" collection found, fall back to newest products ──
    if (products.length === 0) {
      console.log("[Bundlo] No collection found, falling back to newest products");
      const fallbackRes = await gqlFetch(
      `
      query GetNewestProducts(
          $country: CountryCode!
      ) {
          products(first: 10, sortKey: CREATED_AT, reverse: true) {
              nodes {
                  id
                  title
                  featuredImage {
                      url
                  }
                  variants(first: 1) {
                      nodes {
                          id
                          contextualPricing(context: { country: $country }) {
                              price {
                                  amount
                                  currencyCode
                              }
                          }
                      }
                  }
              }
          }
      }
      `,
      {
          country
      }
      );

      if (fallbackRes.errors) {
        console.error("[Bundlo] Fallback GraphQL errors:", JSON.stringify(fallbackRes.errors));
      }

      products = fallbackRes?.data?.products?.nodes ?? [];
    }

    const bestsellers = products
      .filter((p) => !cartIds.has(p.id))
      .slice(0, 5)
      .map((p) => ({
        variantId: p.variants.nodes[0]?.id ?? null,
        title: p.title,
        image: p.featuredImage?.url ?? null,
        price:p.variants.nodes[0]?.contextualPricing?.price?.amount,
        currencyCode:p.variants.nodes[0]?.contextualPricing?.price?.currencyCode
      }))
      .filter((p) => p.variantId);

    // ─────────────────────────────────────────────────────────────
    // AUTO-SYNC: CPR discount % → Shop metafield
    // Reads discountValue from CPR widget's Manage page (Prisma DB)
    // and syncs to shop metafield. Runs on every bestsellers call
    // so CPR percentage stays fresh even without bundles configured.
    // ─────────────────────────────────────────────────────────────
    

    return Response.json({ bestsellers }, { headers });

  } catch (err) {
    console.error("[Bundlo] /api/bestsellers error:", err);
    return Response.json({ bestsellers: [] }, { status: 500, headers });
  }
};