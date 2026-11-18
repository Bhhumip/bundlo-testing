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
});



export const loader = async ({ request }) => {
    console.log("🔥 FBT loader hit:", request.url);
    const headers = corsHeaders();

    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const productIdsParam = url.searchParams.get("productIds") ?? "";
    const country = url.searchParams.get("country") ?? "US";
    console.log("[FBT] Country:", country);

    if (!shop || !productIdsParam) {
        return Response.json({ fbt: [] }, { headers });
    }

    const cartProductIds = productIdsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .map((id) =>
            id.startsWith("gid://") ? id : `gid://shopify/Product/${id}`
        );

    const cartIdSet = new Set(cartProductIds);

    const session = await getValidSession(shop);
    if (!session) {
        console.warn("[FBT] No session for shop:", shop);
        return Response.json({ fbt: [] }, { status: 401, headers });
    }
    // Read the ACTUAL FBT discount configuration
    // from Shopify's automatic app discount.
    let fbtDiscountValue = 0;

    try {
        const discountRes = await fetch(
            `https://${shop}/admin/api/2025-01/graphql.json`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": session.accessToken,
                },
                body: JSON.stringify({
                    query: `
                    query GetFbtDiscount {
                        discountNodes(
    first: 10
    query: "title:\"FBT Discount\""
) {
    nodes {
        id

        metafield(
            namespace: "$app"
            key: "function-configuration"
        ) {
            value
            jsonValue
        }

        discount {
            __typename

            ... on DiscountAutomaticApp {
                title
                status
                discountId
            }
        }
    }
}
                    }
                `,
                }),
            }
        );

        const discountJson = await discountRes.json();

        const discounts =
            discountJson?.data?.discountNodes?.nodes ?? [];

        console.log(
            "[FBT DISCOUNT CONFIG]",
            JSON.stringify(
                discounts.map((node) => ({
                    id: node.id,
                    type: node.discount?.__typename,
                    title: node.discount?.title,
                    status: node.discount?.status,
                    config: node.metafield?.value,
                })),
                null,
                2
            )
        );

        const matchingDiscount = discounts.find(
            (node) =>
                node.discount?.__typename === "DiscountAutomaticApp" &&
                node.discount?.title === "FBT Discount" &&
                node.discount?.status === "ACTIVE"
        );

        const rawConfig =
            matchingDiscount?.metafield?.value;

        if (rawConfig) {
            const config = JSON.parse(rawConfig);

            fbtDiscountValue = Number(
                config?.percentage ?? 0
            );
        }

        console.log(
            "[FBT ACTUAL DISCOUNT]",
            fbtDiscountValue
        );

    } catch (discountErr) {
        console.error(
            "[FBT DISCOUNT] Failed to read actual discount:",
            discountErr
        );
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

        // ── Paginate through ALL orders using cursors ───────────────────────────
        // Each page fetches 50 orders. We keep going until hasNextPage = false.
        // Cap at 500 orders (10 pages) to avoid timeout on very large stores.
        const MAX_PAGES = 10;
        const allOrders = [];
        let cursor = null;
        let page = 0;

        while (page < MAX_PAGES) {
            const res = await gqlFetch(`
        query GetOrders($cursor: String, $country: CountryCode!) {
          orders(first: 50, sortKey: PROCESSED_AT, reverse: true, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              lineItems(first: 30) {
                nodes {
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
    featuredImage {
      url
    }
  }
}
                }
              }
            }
          }
        }
      `, { cursor, country, });

            if (res.errors) {
                console.error("[FBT] GraphQL errors:", JSON.stringify(res.errors));
                break;
            }

            const ordersPage = res?.data?.orders;
            allOrders.push(...(ordersPage?.nodes ?? []));

            console.log(`[FBT] Page ${page + 1}: fetched ${ordersPage?.nodes?.length} orders, total: ${allOrders.length}`);

            if (!ordersPage?.pageInfo?.hasNextPage) break;

            cursor = ordersPage.pageInfo.endCursor;
            page++;
        }

        console.log("[FBT] Total orders scanned:", allOrders.length);

        // ── Build co-occurrence map across ALL orders ───────────────────────────
        // Logic: for every order that contains a cart product,
        // count how many times each OTHER product appears alongside it.
        const coOccurrence = {};

        for (const order of allOrders) {
            const lineItems = order.lineItems.nodes.filter(
                (li) => li.variant?.product?.id
            );

            //console.log("[FBT] Order line items:", lineItems);

            // All products in this order
            const productsInOrder = lineItems.map((li) => {

                /*console.log("[FBT PRICE DEBUG]", {
                    variantId: li.variant.id,
                    product: li.variant.product.title,
                    price: li.variant.contextualPricing?.price?.amount,
currencyCode: li.variant.contextualPricing?.price?.currencyCode,
                });*/

                return {
                    productId: li.variant.product.id,
                    variantId: li.variant.id,
                    title: li.variant.product.title,
                    image: li.variant.product.featuredImage?.url ?? null,
                    price: li.variant.contextualPricing?.price?.amount,
                    currencyCode: li.variant.contextualPricing?.price?.currencyCode,
                };
            });


            // For EACH cart product
            for (const cartProductId of cartProductIds) {

                // Does this order contain this cart product
                const anchorExists = productsInOrder.some(
                    (p) => p.productId === cartProductId
                );

                if (!anchorExists) continue;

                // Initialize bucket
                if (!coOccurrence[cartProductId]) {
                    coOccurrence[cartProductId] = {};
                }

                // Count co-occurring products
                for (const product of productsInOrder) {

                    // Skip self
                    if (product.productId === cartProductId) continue;

                    const bucket = coOccurrence[cartProductId];

                    if (bucket[product.productId]) {
                        bucket[product.productId].count += 1;
                    } else {
                        bucket[product.productId] = {
                            count: 1,
                            variantId: product.variantId,
                            title: product.title,
                            image: product.image,
                            price: product.price,
                            currencyCode: product.currencyCode,
                        };
                    }
                }
            }
        }

        // console.log("[FBT] Co-occurrence keys found:", Object.keys(coOccurrence));
        //console.log("[FBT] Cart product IDs requested:", cartProductIds);
        //console.log("[FBT] Missing from history:",
        //    cartProductIds.filter(id => !coOccurrence[id])
        //);


        // ── Sort by frequency, return top N ────────────────────────────────────────
        const fbt = [];

        for (const cartProductId of cartProductIds) {  // ← iterate cartProductIds, NOT Object.keys(coOccurrence)

            const bucket = coOccurrence[cartProductId];

            // No co-occurrence data for this cart product — still include it
            // with empty recommendations so the widget can decide what to do
            if (!bucket) {
                //console.warn("[FBT] No co-occurrence data for:", cartProductId);
                continue; // skip products with no order history
            }

            const recommendations = Object.entries(bucket)
                .sort(([, a], [, b]) => b.count - a.count)
                .filter(([productId]) => !cartIdSet.has(productId))  // ← exclude other cart items
                .slice(0, 4)
                .map(([productId, { variantId, title, image, price, currencyCode }]) => ({
                    productId, variantId, title, image, price, currencyCode, discountValue: fbtDiscountValue,
                }));

            if (recommendations.length === 0) continue;

            fbt.push({
                anchorProductId: cartProductId,
                recommendations,
            });
        }

        //console.log("[FBT] Final sections:", fbt.map(f =>
        //  `${f.anchorProductId} → ${f.recommendations.length} recs`
        //));
        //console.log(
        //    "[FBT] Final response:",
        //    JSON.stringify(fbt, null, 2)
        //);
        // Auto-sync FBT-eligible metafield on recommended products 
        // This ensures products in FBT recommendations automatically
        // get the `custom.fbt_eligible = true` metafield, which the FBT discount
        // function reads to apply discounts at checkout.
        try {
            // Collect all unique product IDs from all recommendations
            const eligibleProductIds = new Set();
            for (const section of fbt) {
                for (const rec of (section.recommendations ?? [])) {
                    if (rec.productId) eligibleProductIds.add(rec.productId);
                }
            }

            if (eligibleProductIds.size > 0) {
                console.log(`[FBT META] Syncing fbt_eligible=true on ${eligibleProductIds.size} products`);

                // Build metafieldsSet input array
                const metafieldsInput = Array.from(eligibleProductIds).map((productId) => ({
                    ownerId: productId,
                    namespace: "custom",
                    key: "fbt_eligible",
                    type: "boolean",
                    value: "true",
                }));

                // Fire and forget — don't block the response
                gqlFetch(`
            mutation SetFbtEligible($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) {
                    metafields { id namespace key value }
                    userErrors { field message }
                }
            }
        `, { metafields: metafieldsInput }).then((res) => {
                    if (res.errors) {
                        console.error("[FBT META] GraphQL errors:", JSON.stringify(res.errors));
                    } else {
                        const errs = res?.data?.metafieldsSet?.userErrors ?? [];
                        if (errs.length > 0) {
                            console.error("[FBT META] User errors:", JSON.stringify(errs));
                        } else {
                            const count = res?.data?.metafieldsSet?.metafields?.length ?? 0;
                            console.log(`[FBT META] ✓ Successfully synced ${count} products`);
                        }
                    }
                }).catch((err) => {
                    console.error("[FBT META] Sync failed:", err.message);
                });
            }
        } catch (metaErr) {
            console.error("[FBT META] Sync setup failed:", metaErr.message);
            // Don't fail the FBT response even if metafield sync fails
        }
        return Response.json({ fbt }, { headers });

    } catch (err) {
        //console.error("[FBT] Error:", err);
        return Response.json({ fbt: [] }, { status: 500, headers });
    }
};

export async function action({ request }) {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: corsHeaders(),
        });
    }
}