import { authenticate } from "../shopify.server";

const DISCOUNT_TITLE = "CPR Discount";

const FIND_DISCOUNT_QUERY = `
  query FindDiscount($query: String!) {
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

              combinesWith {
                orderDiscounts
                productDiscounts
                shippingDiscounts
              }
            }
          }
        }
      }
    }
  }
`;

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
  }
`;

const UPDATE_DISCOUNT_MUTATION = `
  mutation discountAutomaticAppUpdate(
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
  }
`;

async function findExistingDiscountGid(admin) {
  const response = await admin.graphql(FIND_DISCOUNT_QUERY, {
    variables: {
      query: `title:"${DISCOUNT_TITLE}"`,
    },
  });

  const json = await response.json();

  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }

  const edges = json.data?.discountNodes?.edges ?? [];

  for (const edge of edges) {
    const node = edge?.node;
    const discount = node?.discount;

    if (
      discount?.__typename === "DiscountAutomaticApp" &&
      discount?.title === DISCOUNT_TITLE
    ) {
      console.log(
        `[CPR] Found existing AUTOMATIC discount: ${node.id}`
      );

      console.log(
        "[CPR] Existing combinesWith:",
        discount.combinesWith
      );

      return node.id;
    }
  }

  console.log(
    `[CPR] No existing automatic discount found for "${DISCOUNT_TITLE}"`
  );

  return null;
}


async function createDiscount(admin, percentage) {
  const startsAt = new Date().toISOString();

  const endsAt = new Date();
  endsAt.setFullYear(endsAt.getFullYear() + 1);

  const response = await admin.graphql(CREATE_DISCOUNT_MUTATION, {
    variables: {
      automaticAppDiscount: {
        title: DISCOUNT_TITLE,

        functionHandle: "cpr-discount-fn",

        discountClasses: ["PRODUCT"],

        startsAt,

        endsAt: endsAt.toISOString(),

        /*
         * IMPORTANT
         *
         * CPR MUST be able to combine with
         * another PRODUCT discount such as FBT.
         */
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
    const errMsg = userErrors[0]?.message ?? "";

    const isDuplicateTitle =
      errMsg.toLowerCase().includes("title must be unique") ||
      errMsg.toLowerCase().includes("already exists");

    if (isDuplicateTitle) {
      throw new Error("DUPLICATE_TITLE");
    }

    throw new Error(errMsg);
  }

  console.log(
    "[CPR] Discount CREATED:",
    result?.automaticAppDiscount
  );

  return result?.automaticAppDiscount;
}

async function updateDiscount(admin, discountNodeId, percentage) {
  console.log(
    "[CPR] Updating existing discount:",
    discountNodeId
  );

  const response = await admin.graphql(
    UPDATE_DISCOUNT_MUTATION,
    {
      variables: {
        id: discountNodeId,

        automaticAppDiscount: {
          /*
           * THIS IS THE IMPORTANT PART.
           *
           * CPR must combine with PRODUCT discounts.
           * FBT is a PRODUCT discount.
           */
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
    }
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
        .map((e) => e?.message)
        .filter(Boolean)
        .join(", ")
    );
  }

  const updatedDiscount =
    result?.automaticAppDiscount;

  console.log(
    "[CPR] Discount UPDATE RESULT:",
    JSON.stringify(updatedDiscount, null, 2)
  );

  console.log(
    "[CPR] CPR combinesWith AFTER UPDATE:",
    updatedDiscount?.combinesWith
  );

  /*
   * Extra safety check.
   *
   * If Shopify accepted the mutation but did not return
   * productDiscounts=true, fail loudly instead of pretending
   * everything worked.
   */
  if (
    updatedDiscount?.combinesWith?.productDiscounts !== true
  ) {
    throw new Error(
      "CPR discount was updated, but productDiscounts combination is still disabled."
    );
  }

  return {
    updated: true,

    discount: updatedDiscount,

    combinesWith:
      updatedDiscount?.combinesWith,
  };
}

export async function syncCprDiscount(admin, percentage) {
  console.log(
    `[CPR] Syncing CPR discount: ${percentage}%`
  );

  const existingDiscountGid =
    await findExistingDiscountGid(admin);

  let result;

  // ============================================================
  // EXISTING DISCOUNT
  // ============================================================

  if (existingDiscountGid) {
    console.log(
      "[CPR] Existing discount found. Updating..."
    );

    /*
     * IMPORTANT:
     * Store the return value.
     *
     * The previous code called updateDiscount()
     * but then tried to log an undefined variable "updated".
     */
    const updated = await updateDiscount(
      admin,
      existingDiscountGid,
      percentage
    );

    console.log(
      "[CPR] UPDATE RESULT =",
      JSON.stringify(updated, null, 2)
    );

    result = updated;
  }

  // ============================================================
  // CREATE NEW DISCOUNT
  // ============================================================

  else {
    console.log(
      "[CPR] No existing discount found. Creating..."
    );

    try {
      result = await createDiscount(
        admin,
        percentage
      );
    } catch (err) {
      if (err?.message === "DUPLICATE_TITLE") {
        console.log(
          "[CPR] Duplicate title detected."
        );

        console.log(
          "[CPR] Looking up existing discount again..."
        );

        const gid =
          await findExistingDiscountGid(admin);

        if (!gid) {
          throw err;
        }

        const updated =
          await updateDiscount(
            admin,
            gid,
            percentage
          );

        result = updated;
      } else {
        throw err;
      }
    }
  }

  console.log(
    "[CPR] FINAL SYNC RESULT:",
    JSON.stringify(result, null, 2)
  );

  return result;
}

export async function action({ request }) {
  console.log(
    "🔥 API.CPR-DISCOUNTS HIT"
  );

  const { admin } =
    await authenticate.admin(request);

  try {
    const body =
      await request.json();

    const percentage =
      Number(body?.percentage ?? 10);

    console.log(
      "[CPR API] BODY =",
      body
    );

    console.log(
      "[CPR API] PERCENTAGE =",
      percentage
    );

    if (
      Number.isNaN(percentage) ||
      percentage < 1 ||
      percentage > 100
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Percentage must be between 1 and 100.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await syncCprDiscount(
        admin,
        percentage
      );

    return Response.json({
      ok: true,

      discount: result,

      combinesWith:
        result?.combinesWith ?? null,
    });
  } catch (error) {
    console.error(
      "[CPR Discount API]",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error?.message ??
          "Unknown CPR discount error",
      },
      {
        status: 500,
      }
    );
  }
}