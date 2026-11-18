import { getValidSession } from "../utils/validateShop.server";
import { authenticate } from "../shopify.server";
import { authenticateOrderHistoryRequest } from "../utils/orderHistoryIdentity.server";

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
        "Content-Type": "application/json",
    };
}

// This ensures CORS headers appear even on Remix-level errors/redirects
export const headers = () => ({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
});

export const action = async ({ request }) => {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
};

export const loader = async ({ request }) => {
    const headers = corsHeaders();

    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
    }

    try {
        const { identity, cors } = await authenticateOrderHistoryRequest(
            request,
            authenticate.public.checkout
        );
        if (!identity) {
            const response = Response.json({ recommendations: [] }, { headers });
            return cors ? cors(response) : response;
        }

        const url = new URL(request.url);
        const { shop, customerId } = identity;
        const productIds = url.searchParams.get("productIds") ?? "";
        const cartIds = new Set(productIds.split(",").filter(Boolean));
        const country = url.searchParams.get("country") ?? "US";

        const session = await getValidSession(shop);

        if (!session?.accessToken || session.shop !== shop) {
            return cors(Response.json({ recommendations: [] }, { headers }));
        }

        // ── Fetch customer's past orders from Shopify Admin GraphQL ───────────
        const graphqlResponse = await fetch(
            `https://${shop}/admin/api/2025-01/graphql.json`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": session.accessToken,
                },
                body: JSON.stringify({
                    query: `
            query GetCustomerOrders($customerId: ID!, $country: CountryCode!) {
              customer(id: $customerId) {
                orders(first: 10, sortKey: PROCESSED_AT, reverse: true) {
                  nodes {
                    lineItems(first: 20) {
                     nodes {
                          title
                          image { url }
                         variant {
                            id

                            contextualPricing(context: { country: $country }) {
                                price {
                                    amount
                                    currencyCode
                                }
                            }

                            product {
                                id
                                title
                                featuredImage { url }
                            }
                        }
                 }
                    }
                  }
                }
              }
            }
          `,
                    variables: { customerId, country },
                }),
            }
        );

        const data = await graphqlResponse.json();
        const orders = data?.data?.customer?.orders?.nodes ?? [];
        //.log("[OrderHistory] customerId:", customerId);
        //.log("[OrderHistory] orders found:", orders.length);
        //.log("[OrderHistory] raw data:", JSON.stringify(data?.data, null, 2));

        if (data.errors) {
            //.error("[Bundlo] GraphQL errors:", JSON.stringify(data.errors));
        }


        // ── Tally purchase frequency, exclude cart items ───────────────────────
        const freq = {};
        for (const order of orders) {
            for (const lineItem of order.lineItems.nodes) {
                const { variant, title, image } = lineItem;

                // skip if product is still in cart
                if (variant && cartIds.has(variant.product?.id)) continue;

                const key = variant?.id ?? title; // use title as key if variant deleted
                if (freq[key]) {
                    freq[key].count += 1;
                } else {
                    freq[key] = {
                        count: 1,
                        variantId: variant?.id ?? null,
                        title: variant?.product?.title ?? title,
                        image: variant?.product?.featuredImage?.url ?? image?.url ?? null,
                        price:variant?.contextualPricing?.price?.amount ?? null,
                        currencyCode:variant?.contextualPricing?.price?.currencyCode ?? null,
                    };
                }
            }
        }

        // After building freq map, resolve missing variantIds
        const unresolvedTitles = Object.values(freq)
            .filter(item => !item.variantId)
            .map(item => item.title);

        if (unresolvedTitles.length > 0) {
            // Search for products by title to get current variant
            const searchRes = await fetch(
                `https://${shop}/admin/api/2025-01/graphql.json`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Shopify-Access-Token": session.accessToken,
                    },
                    body: JSON.stringify({
                        query: `
                    query SearchProducts($query: String!) {
                        products(first: 10, query: $query) {
                            nodes {
                                title
                                featuredImage { url }
                                variants(first: 1) {
                                    nodes {
                                        id
                                        price
                                    }
                                }
                            }
                        }
                    }
                `,
                        variables: {
                            query: unresolvedTitles.map(t => `title:${t}`).join(" OR ")
                        },
                    }),
                }
            );

            const searchData = await searchRes.json();
            const foundProducts = searchData?.data?.products?.nodes ?? [];

            // Patch freq entries with resolved data
            for (const product of foundProducts) {
                const variant = product.variants.nodes[0];
                if (!variant) continue;

                // Find matching freq entry by title
                const match = Object.values(freq).find(
                    item => item.title === product.title && !item.variantId
                );
                if (match) {
                    match.variantId = variant.id;
                    match.price = variant.price;
                    match.image = product.featuredImage?.url ?? null;
                }
            }
        }



        const recommendations = Object.values(freq)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map(({ variantId, title, image, price, currencyCode }) => ({ variantId, title, image, price, currencyCode }));
        return cors(Response.json({ recommendations }, { headers }));

    } catch (err) {
        return Response.json({ recommendations: [] }, { status: 500, headers });
    }
};