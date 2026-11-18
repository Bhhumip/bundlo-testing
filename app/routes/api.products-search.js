import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";

  // Only send a query when the user typed something
  const variables = { first: 20 };
  if (query.trim()) {
    variables.query = `title:*${query}*`;
  }

  const response = await admin.graphql(
    `
      query searchProducts($first: Int!, $query: String) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              title
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                    sku
                  }
                }
              }
            }
          }
        }
      }
    `,
    { variables }
  );

  const data = await response.json();

  if (data?.errors?.length) {
    return Response.json(
      { ok: false, error: data.errors[0].message, products: [] },
      { status: 500 }
    );
  }

  const products =
    data?.data?.products?.edges?.map((edge) => ({
      id: edge.node.id,
      title: edge.node.title,
      variants:
        edge.node.variants?.edges?.map((v) => ({
          id: v.node.id,
          title: v.node.title,
          price: v.node.price,
          sku: v.node.sku,
        })) || [],
    })) || [];

  return Response.json({ ok: true, products });
}