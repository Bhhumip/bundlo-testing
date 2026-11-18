// app/models/BYOB.server.js

import prisma from "../db.server";

// -----------------------------------------------------------------------
// READ — single box
// -----------------------------------------------------------------------
export async function getByobBox(id, shop) {
    return prisma.bundle.findFirst({ where: { id, shop, type: "BYOB" } });
}

// -----------------------------------------------------------------------
// READ — check if any active/draft BYOB box exists (one-box guard)
// -----------------------------------------------------------------------
export async function getExistingByobBox(shop) {
    return prisma.bundle.findFirst({
        where: {
            shop,
            type: "BYOB",
            status: { in: ["ACTIVE", "DRAFT"] }
        },
        orderBy: { createdAt: "desc" },
    });
}

// -----------------------------------------------------------------------
// CREATE
// -----------------------------------------------------------------------
export async function createByobBox(shop, admin, {
    title, description, status, price,
    minItems, maxItems, tags, mediaUrl,
    discountType, discountValue, fixedPrice,
}) {
    const shopifyProduct = await createShopifyProduct(admin, { title, description, status, price });
    const shopifyProductId = shopifyProduct?.id ?? null;
    const shopifyVariantId = shopifyProduct?.variants?.edges?.[0]?.node?.id ?? null;

    return prisma.bundle.create({
        data: {
            shop, title,
            type: "BYOB",
            description: description ?? "",
            status: status ?? "ACTIVE",
            price: price ?? null,
            tags: tags?.join(",") ?? null,
            mediaUrl: mediaUrl ?? null,
            discountType: discountType ?? "NONE",
            discountValue: discountValue ?? 0,
            fixedPrice: fixedPrice ?? null,
            shopifyProductId,
            shopifyVariantId,
        },
    });
}

// -----------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------
export async function updateByobBox(id, shop, admin, updates) {
    const existing = await prisma.bundle.findFirstOrThrow({ where: { id, shop, type: "BYOB" } });

    if (existing.shopifyProductId) {
        await syncShopifyProduct(admin, existing.shopifyProductId, existing.shopifyVariantId, {
            title: updates.title ?? existing.title,
            status: updates.status ?? existing.status,
            price: updates.price ?? existing.price,
        });
    }

    return prisma.bundle.update({
        where: {
            id,
            type: "BYOB",
        },
        data: {
            ...(updates.title !== undefined && { title: updates.title }),
            ...(updates.description !== undefined && { description: updates.description }),
            ...(updates.status !== undefined && { status: updates.status }),
            ...(updates.price !== undefined && { price: updates.price }),
            ...(updates.tags !== undefined && {
                tags: Array.isArray(updates.tags)
                    ? updates.tags.join(",")
                    : updates.tags
            }),
            ...(updates.mediaUrl !== undefined && { mediaUrl: updates.mediaUrl }),
            ...(updates.discountType !== undefined && { discountType: updates.discountType }),
            ...(updates.discountValue !== undefined && { discountValue: updates.discountValue }),
            ...(updates.fixedPrice !== undefined && { fixedPrice: updates.fixedPrice }),
        },
    });
}

// -----------------------------------------------------------------------
// DELETE
// -----------------------------------------------------------------------
export async function deleteByobBox(id, shop, admin) {
    const existing = await prisma.bundle.findFirstOrThrow({ where: { id, shop, type: "BYOB" } });
    if (existing.shopifyProductId) {
        await archiveShopifyProduct(admin, existing.shopifyProductId);
    }
    await prisma.bundle.delete({ where: { id, type: "BYOB" } });
}

// -----------------------------------------------------------------------
// Shopify GraphQL helpers
// -----------------------------------------------------------------------
async function createShopifyProduct(admin, { title, description, status, price }) {
    const response = await admin.graphql(             // step1 -Create the product (no variants fields allowed on productCreate)
        `#graphql
        mutation productCreate($product: ProductCreateInput!) {
            productCreate(product: $product) {
                product {
                    id
                    variants(first: 1) { edges { node { id price } } }
                }
                userErrors { field message }
            }
        }`,
        {
            variables: {
                product: {
                    title,
                    descriptionHtml: description ?? "",
                    status: status === "ACTIVE" ? "ACTIVE" : "DRAFT",
                    productType: "Build Your Own Box",
                    tags: ["byob", "build-your-own-box"],
                },
            },
        }
    );
    const data = await response.json();
    const userErrors = data?.data?.productCreate?.userErrors;
    if (userErrors?.length) throw new Error(userErrors.map(e => e.message).join(", "));

    const product = data?.data?.productCreate?.product;

    // Step 2- Set price on the default variant
    const defaultVariantId = product?.variants?.edges?.[0]?.node?.id ?? null;
    if (defaultVariantId && price) {
        await admin.graphql(
            `#graphql
            mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                    productVariants { id price }
                    userErrors { field message }
                }
            }`,
            {
                variables: {
                    productId: product.id,
                    variants: [{ id: defaultVariantId, price: String(price) }],
                },
            }
        );
    }

    return product;
}

async function syncShopifyProduct(admin, shopifyProductId, shopifyVariantId, { title, status, price }) {
    await admin.graphql(
        `#graphql
        mutation productUpdate($input: ProductInput!) {
            productUpdate(input: $input) {
                product { id }
                userErrors { field message }
            }
        }`,
        {
            variables: {
                input: {
                    id: shopifyProductId,
                    title,
                    status: status === "ACTIVE" ? "ACTIVE" : "DRAFT",
                },
            },
        }
    );
    if (price !== null && price !== undefined && shopifyVariantId) {
        await admin.graphql(`
mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id price }
    userErrors { field message }
  }
}`, {
            variables: {
                productId: shopifyProductId,
                variants: [
                    {
                        id: shopifyVariantId,
                        price: String(price)
                    }
                ]
            }
        });
    }
}

async function archiveShopifyProduct(admin, shopifyProductId) {
    await admin.graphql(
        `#graphql
        mutation productUpdate($input: ProductInput!) {
            productUpdate(input: $input) {
                product { id }
                userErrors { field message }
            }
        }`,
        { variables: { input: { id: shopifyProductId, status: "ARCHIVED" } } }
    );
}