import { authenticate } from "../shopify.server";
import { requireFeatureAccess } from "../featureAccess.server";

const DISCOUNT_TITLE = "FBT Discount";

const FIND_DISCOUNT_QUERY = `query FindDiscount($query: String!) {
  discountNodes(first: 10, query: $query) {
    edges {
      node {
        id
        discount {
          __typename

          ... on DiscountAutomaticApp {
            discountId
            title
            status
          }
        }
      }
    }
  }
}`;

const CREATE_DISCOUNT_MUTATION = `
mutation discountAutomaticAppCreate(
  $automaticAppDiscount: DiscountAutomaticAppInput!
) {
  discountAutomaticAppCreate(
    automaticAppDiscount: $automaticAppDiscount
  ) {
    automaticAppDiscount {
      discountId
      title
      status
    }
    userErrors {
      field
      message
    }
  }
}
`;

async function findExistingDiscountGid(admin) {
  const response = await admin.graphql(FIND_DISCOUNT_QUERY, {
    variables: {
      query: `title:"${DISCOUNT_TITLE}"`,
    },
  });

  const json = await response.json();

  const edges = json.data?.discountNodes?.edges ?? [];

  for (const edge of edges) {
    const node = edge?.node;
    const discount = node?.discount;

    if (
      discount?.__typename === "DiscountAutomaticApp" &&
      discount?.title === DISCOUNT_TITLE
    ) {
      console.log(
        `[FBT] Found existing AUTOMATIC discount: ${node.id} (${discount.status})`
      );

      return node.id;
    }
  }

  console.log(
    `[FBT] No existing automatic discount found for "${DISCOUNT_TITLE}"`
  );

  return null;
}

//const FUNCTION_ID = "019f8365-59cf-714f-8a2a-b2c25646149c";
const FUNCTION_HANDLE = "fbt-discount-fn";

async function createDiscount(admin, percentage) {

  const startsAt = new Date().toISOString();

  const endsAt = new Date();
  endsAt.setFullYear(endsAt.getFullYear() + 1);

  const response = await admin.graphql(CREATE_DISCOUNT_MUTATION, {
    variables: {
      automaticAppDiscount: {

        title: DISCOUNT_TITLE,

        functionHandle: FUNCTION_HANDLE,

        discountClasses: ["PRODUCT"],

        startsAt,

        endsAt: endsAt.toISOString(),

        combinesWith: {
          orderDiscounts: false,
          productDiscounts: true,
          shippingDiscounts: false,
        },

        metafields: [
          {
            namespace: "$app",
            key: "function-configuration",
            type: "json",
            value: JSON.stringify({
              percentage,
            }),
          },
        ],
      },
    },
  });

  const json = await response.json();

  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }

  const result = json.data?.discountAutomaticAppCreate;

  const userErrors = result?.userErrors ?? [];

  if (userErrors.length) {
    const errMsg = userErrors[0].message ?? "";

    // Same handling as Progress Bar
    const isDuplicateTitle =
      errMsg.toLowerCase().includes("title must be unique") ||
      errMsg.toLowerCase().includes("already exists");

    if (isDuplicateTitle) {
      throw new Error("DUPLICATE_TITLE");
    }

    throw new Error(errMsg);
  }

  return result.automaticAppDiscount;
}

async function updateDiscount(admin, discountNodeId, percentage) {
  const response = await admin.graphql(
    `mutation discountAutomaticAppUpdate(
            $id: ID!
            $automaticAppDiscount: DiscountAutomaticAppInput!
        ) {
            discountAutomaticAppUpdate(
                id: $id
                automaticAppDiscount: $automaticAppDiscount
            ) {
                automaticAppDiscount {
                    discountId
                    title
                    status
                    combinesWith {
                        orderDiscounts
                        productDiscounts
                        shippingDiscounts
                    }
                }
                userErrors {
                    field
                    message
                }
            }
        }`,
    {
      variables: {
        id: discountNodeId,
        automaticAppDiscount: {
          combinesWith: {
            orderDiscounts: false,
            productDiscounts: true,
            shippingDiscounts: false,
          },
        },
      },
    },
  );

  const json = await response.json();

  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }

  const result =
    json.data?.discountAutomaticAppUpdate;

  const errors =
    result?.userErrors ?? [];

  if (errors.length) {
    throw new Error(
      errors
        .map((e) => e.message)
        .join(", ")
    );
  }

  console.log(
    "[FBT] Combination updated:",
    result?.automaticAppDiscount?.combinesWith
  );

  // Update percentage separately
  const metafieldResponse = await admin.graphql(
    `mutation metafieldsSet(
            $metafields: [MetafieldsSetInput!]!
        ) {
            metafieldsSet(
                metafields: $metafields
            ) {
                metafields {
                    id
                    namespace
                    key
                    value
                }
                userErrors {
                    field
                    message
                }
            }
        }`,
    {
      variables: {
        metafields: [
          {
            ownerId: discountNodeId,
            namespace: "$app",
            key: "function-configuration",
            type: "json",
            value: JSON.stringify({
              percentage,
            }),
          },
        ],
      },
    },
  );

  const metafieldJson =
    await metafieldResponse.json();

  if (metafieldJson.errors) {
    throw new Error(
      JSON.stringify(metafieldJson.errors)
    );
  }

  const metafieldErrors =
    metafieldJson.data?.metafieldsSet?.userErrors ?? [];

  if (metafieldErrors.length) {
    throw new Error(
      metafieldErrors
        .map((e) => e.message)
        .join(", ")
    );
  }

  console.log(
    "[FBT] Percentage updated:",
    percentage
  );

  return {
    updated: true,
    combinesWith:
      result?.automaticAppDiscount?.combinesWith,
  };
}

export async function syncFbtDiscount(admin, percentage) {
  const existingDiscountGid = await findExistingDiscountGid(admin);

  let result;

  if (existingDiscountGid) {
    console.log("[FBT] Existing discount found.");

    await updateDiscount(
      admin,
      existingDiscountGid,
      percentage,
    );

    result = {
      updated: true,
    };
  } else {
    console.log("[FBT] No existing discount found. Creating...");

    try {
      result = await createDiscount(
        admin,
        percentage,
      );
    } catch (err) {
      if (err.message === "DUPLICATE_TITLE") {
        console.log("[FBT] Duplicate title detected. Looking up existing discount...");

        const gid = await findExistingDiscountGid(admin);

        if (!gid) {
          throw err;
        }

        await updateDiscount(
          admin,
          gid,
          percentage,
        );

        result = {
          updated: true,
        };
      } else {
        throw err;
      }
    }
  }



  return result;
}
export async function action({ request }) {
  console.log(" API.FBT-DISCOUNTS HIT");
  const { admin, session } = await authenticate.admin(request);
  await requireFeatureAccess(session.shop, "FBT_CHECKOUT");

  try {
    const body = await request.json();

    const percentage = Number(body?.percentage ?? 10);
    console.log("[FBT API] BODY =", body);
    console.log("[FBT API] PERCENTAGE =", percentage);

    if (
      Number.isNaN(percentage) ||
      percentage < 1 ||
      percentage > 100
    ) {
      return Response.json(
        {
          ok: false,
          error: "Percentage must be between 1 and 100.",
        },
        {
          status: 400,
        },
      );
    }

    const result = await syncFbtDiscount(
      admin,
      percentage,
    );

    return Response.json({
      ok: true,
      discount: result,
    });
  } catch (error) {
    console.error("[FBT Discount API]", error);

    return Response.json(
      {
        ok: false,
        error: error.message,
      },
      {
        status: 500,
      },
    );
  }
}
