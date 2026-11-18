
// core server logic — Fixed, Volume, Mix & Match bundles.

import db from "../db.server.js";
import { nanoid } from "nanoid";
import {
    CREATE_PRODUCT_MUTATION,
    UPDATE_PRODUCT_MUTATION,
    PUBLISH_PRODUCT_MUTATION,
    GET_PUBLICATIONS_QUERY,
    // CREATE_PRODUCT_MEDIA_MUTATION,
    METAFIELDS_SET_MUTATION,
    STAGED_UPLOADS_MUTATION,
    CREATE_METAFIELD_DEFINITION_MUTATION,
    GET_ORDERS_WITH_LINE_ITEMS,

} from "../graphql/bundles.js";

import { computeBundlePrice } from "../utils/bundle-price.js";
import {
    Free_PLAN,
    Pro_PLAN,
    PLAN_REVENUE_LIMITS,
    BASE_PLAN_KEY,
} from "../plans.js";

import { shopPlans } from "./shopPlans.server.js";
import { sendEmail } from "../services/email.server";
import { revenueLimitEmail } from "../services/emailTemplates";
import { getBundleCodesForProducts } from "../utils/webhook-handlers";

// -----------------------------------------------------------------------
// listBundles
// -----------------------------------------------------------------------
export async function listBundles(shop, options = {}) {
    const { skip = 0, take = 10, status, query, type, dateFrom, dateTo } = options;

    const where = {
        shop,
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(query ? { title: { contains: query } } : {}),
        // Added date filter
        ...(dateFrom || dateTo ? {
            createdAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
            }
        } : {}),
    };

    const [bundles, total] = await Promise.all([
        db.bundle.findMany({
            where,
            include: {
                components: { orderBy: { position: "asc" } },
                volumeTiers: { orderBy: { minQuantity: "asc" } },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take,
        }),
        db.bundle.count({ where }),
    ]);

    return { bundles, total };
}

// -----------------------------------------------------------------------
// getBundle
// -----------------------------------------------------------------------
export async function getBundle(id, shop) {
    return db.bundle.findFirst({
        where: { id, shop },
        include: {
            components: { orderBy: { position: "asc" } },
            volumeTiers: { orderBy: { minQuantity: "asc" } },
        },
    });
}

// -----------------------------------------------------------------------
// getBundleStats
// -----------------------------------------------------------------------
export async function getBundleStats(shop) {
    if (!shop) {
        return {
            totalBundles: 0,
            activeBundles: 0,
            totalRevenue: 0,
            totalOrders: 0,
            totalUnitsSold: 0,
            deltas: { totalBundles: null, activeBundles: null },
        };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoStart = new Date(now);
    thirtyDaysAgoStart.setHours(0, 0, 0, 0);
    thirtyDaysAgoStart.setDate(thirtyDaysAgoStart.getDate() - 29);
    // Start of the rolling 30-day window.
    // Includes today plus the previous 29 calendar days.

    const [
        totalBundles,
        activeBundles,
        recentBundles,       // bundles created in last 30 days
        prevBundles,         // bundles created in 30–60 days ago
        prevActiveBundles,   // active bundles created 30–60 days ago (for delta)
        revenueData,
        dailyRevenueData,
    ] = await Promise.all([
        // Bundle counts — from Bundle table
        db.bundle.count({ where: { shop } }),
        db.bundle.count({ where: { shop, status: "ACTIVE" } }),

        db.bundle.count({
            where: { shop, createdAt: { gte: thirtyDaysAgo } },
        }),
        db.bundle.count({
            where: { shop, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        }),
        db.bundle.count({
            where: { shop, status: "ACTIVE", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        }),

        // Revenue stats — from BundleStats table (webhook-driven)
        db.bundleStats.aggregate({
            where: { shop },
            _sum: {
                totalRevenue: true,
                totalQuantity: true,
                totalOrders: true,
            },
        }),
        // Rolling 30-day revenue — used for plan revenue-limit checks.
        db.bundleRevenueDaily.aggregate({
            where: {
                shop,
                date: {
                    gte: thirtyDaysAgoStart,
                },
            },
            _sum: {
                revenue: true,
                quantity: true,
                orders: true,
            },
        }),
    ]);

    function pctChange(current, previous) {
        if (previous === 0 && current === 0) return null;
        if (previous === 0 && current > 0) return 100;
        return Math.round(((current - previous) / previous) * 100);
    }

    return {
        totalBundles,
        activeBundles,
        totalRevenue: revenueData._sum.totalRevenue ?? 0,
        // Revenue generated during the current rolling 30-day window.
        rolling30DayRevenue: dailyRevenueData._sum.revenue ?? 0,
        totalOrders: revenueData._sum.totalOrders ?? 0,
        totalUnitsSold: revenueData._sum.totalQuantity ?? 0,
        deltas: {
            totalBundles: pctChange(recentBundles, prevBundles),
            activeBundles: pctChange(activeBundles, prevActiveBundles),
        },
    };
}

//-------------------------------------------------------
// Function to handle image uploads to Shopify CDN using staged uploads API
//--------------------------------------------------------
export async function uploadImageToShopify(admin, base64DataUrl) {
    // 1. Extract file type and raw base64 from data URL
    // base64DataUrl looks like: "data:image/jpeg;base64,/9j/4AAQ..."
    const matches = base64DataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) throw new Error("Invalid image format");

    const mimeType = matches[1];           // e.g. "image/jpeg"
    const base64Data = matches[2];         // raw base64 string
    const buffer = Buffer.from(base64Data, "base64");
    const fileSize = buffer.length;
    const filename = `bundle-image-${Date.now()}.${mimeType.split("/")[1]}`;

    // 2. Ask Shopify for a staged upload URL
    const stageRes = await admin.graphql(STAGED_UPLOADS_MUTATION, {
        variables: {
            input: [{
                filename,
                mimeType,
                resource: "PRODUCT_IMAGE",
                fileSize: String(fileSize),
                httpMethod: "POST",
            }],
        },
    });

    const stageData = await stageRes.json();
    const stageErrors = stageData?.data?.stagedUploadsCreate?.userErrors ?? [];
    if (stageErrors.length > 0) {
        throw new Error(stageErrors.map(e => e.message).join(", "));
    }

    const target = stageData?.data?.stagedUploadsCreate?.stagedTargets?.[0];
    if (!target) throw new Error("No staged upload target returned");

    const { url, resourceUrl, parameters } = target;

    // 3. Upload the image to Shopify's CDN using multipart form
    const formData = new FormData();
    parameters.forEach(({ name, value }) => formData.append(name, value));
    formData.append("file", new Blob([buffer], { type: mimeType }), filename);

    const uploadRes = await fetch(url, { method: "POST", body: formData });
    if (!uploadRes.ok) {
        throw new Error(`Image upload failed: ${uploadRes.statusText}`);
    }

    // resourceUrl is the permanent Shopify CDN URL
    //.log("[uploadImageToShopify]  Uploaded to:", resourceUrl);
    return resourceUrl;
}

// -----------------------------------------------------------------------
// attachImageToProduct — waits for Shopify to process staged upload
// and returns the permanent cdn.shopify.com URL
// -----------------------------------------------------------------------
async function attachImageToProduct(admin, shopifyProductId, stagedResourceUrl) {
    // Step 1: trigger the media creation
    const res = await admin.graphql(`
        mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
            productCreateMedia(productId: $productId, media: $media) {
                media {
                    id
                    mediaContentType
                    status
                    ... on MediaImage {
                        image { url }
                    }
                }
                mediaUserErrors { field message }
            }
        }
    `, {
        variables: {
            productId: shopifyProductId,
            media: [{ originalSource: stagedResourceUrl, mediaContentType: "IMAGE" }],
        },
    });

    const data = await res.json();
    const errors = data?.data?.productCreateMedia?.mediaUserErrors ?? [];
    if (errors.length > 0) throw new Error(errors.map(e => e.message).join(", "));

    const mediaId = data?.data?.productCreateMedia?.media?.[0]?.id;
    if (!mediaId) throw new Error("No media ID returned from productCreateMedia");

    //.log("[attachImageToProduct] Media created, ID:", mediaId, "— polling for URL...");

    // Step 2: poll until status = READY and image.url is available
    for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2s between polls

        const pollRes = await admin.graphql(`
            query getProductMedia($productId: ID!) {
                product(id: $productId) {
                    media(first: 10) {
                        edges {
                            node {
                                id
                                status
                                ... on MediaImage {
                                    image { url }
                                }
                            }
                        }
                    }
                }
            }
        `, { variables: { productId: shopifyProductId } });

        const pollData = await pollRes.json();
        const mediaNodes = pollData?.data?.product?.media?.edges ?? [];
        const match = mediaNodes.find(e => e.node.id === mediaId);

        //.log(`[attachImageToProduct] Attempt ${attempt + 1}: status=${match?.node?.status}, url=${match?.node?.image?.url}`);

        if (match?.node?.status === "READY" && match?.node?.image?.url) {
            //.log("[attachImageToProduct] Permanent URL:", match.node.image.url);
            return match.node.image.url;
        }
    }

    throw new Error("Image processing timed out after 10 attempts");
}

// -----------------------------------------------------------------------
// Send revenue-limit notification to the merchant.
// Notification is sent only once for the current limit-exceeded event.
// -----------------------------------------------------------------------
async function notifyRevenueLimitReached(
    shop,
    currentPlan,
    revenueLimit,
    gracePeriodEndsAt
) {
    const shopRecord = await db.shop.findUnique({
        where: { shop },
    });

    if (!shopRecord?.email) {
        console.warn(
            `[revenue-limit] No merchant email found for ${shop}.`
        );
        return false;
    }

    const { subject, htmlBody } = revenueLimitEmail(
        shop,
        currentPlan,
        revenueLimit,
        gracePeriodEndsAt
    );

    await sendEmail({
        shop,
        event: "revenue_limit_reached",
        to: shopRecord.email,
        subject,
        htmlBody,
    });

    return true;
}
// -----------------------------------------------------------------------
// Check rolling 30-day revenue limit before creating a new bundle
// -----------------------------------------------------------------------
async function checkBundleRevenueLimit(shop) {
    let currentPlan = await shopPlans.getPaidAppPlan(shop);

    // No active paid subscription = Free plan
    if (!currentPlan) {
        currentPlan = Free_PLAN;
    }

    // Annual Shopify subscription → convert to base plan
    currentPlan = BASE_PLAN_KEY[currentPlan] ?? currentPlan;

    // Pro has no revenue limit
    if (currentPlan === Pro_PLAN) {
        return;
    }

    const revenueLimit = PLAN_REVENUE_LIMITS[currentPlan];

    // Safety: if this plan has no configured limit, don't block creation.
    if (revenueLimit == null) {
        return;
    }

    const now = new Date();

    // Rolling 30-day window:
    // today + previous 29 calendar days.
    const thirtyDaysAgoStart = new Date(now);
    thirtyDaysAgoStart.setHours(0, 0, 0, 0);
    thirtyDaysAgoStart.setDate(thirtyDaysAgoStart.getDate() - 29);

    const revenueData = await db.bundleRevenueDaily.aggregate({
        where: {
            shop,
            date: {
                gte: thirtyDaysAgoStart,
            },
        },
        _sum: {
            revenue: true,
        },
    });

    const rolling30DayRevenue = revenueData._sum.revenue ?? 0;

    // Revenue is below the limit.
    if (rolling30DayRevenue < revenueLimit) {
        return;
    }

    // Get the merchant's ShopPlan row.
    const shopPlan = await db.shopPlan.findUnique({
        where: { shop },
    });

    // First time the revenue limit has been reached.
    if (!shopPlan?.revenueLimitExceededAt) {
        const gracePeriodEnds = new Date(
            now.getTime() + 7 * 24 * 60 * 60 * 1000
        );

        // Record when the limit was first reached and start the
        // 7-day grace period.
        const updatedShopPlan = await db.shopPlan.upsert({
            where: { shop },
            create: {
                shop,
                status: "TRIALING",
                currentPlan,
                revenueLimitExceededAt: now,
                revenueGracePeriodEndsAt: gracePeriodEnds,
            },
            update: {
                revenueLimitExceededAt: now,
                revenueGracePeriodEndsAt: gracePeriodEnds,
            },
        });

        // Send the notification only once.
        if (!updatedShopPlan.revenueLimitNotificationSentAt) {
            try {
                const sent = await notifyRevenueLimitReached(
                    shop,
                    currentPlan,
                    revenueLimit,
                    gracePeriodEnds
                );

                if (sent) {
                    await db.shopPlan.update({
                        where: { shop },
                        data: {
                            revenueLimitNotificationSentAt: new Date(),
                        },
                    });
                }
            } catch (error) {
                // Email failure must not break the revenue-limit enforcement.
                console.error(
                    "[revenue-limit] Failed to send notification:",
                    error.message
                );
            }
        }
    }

    throw new Error(
        `Your ${currentPlan} plan has reached its rolling 30-day revenue limit of $${revenueLimit.toLocaleString()}. Please upgrade your plan to create more bundles.`
    );
}
// -----------------------------------------------------------------------
// createBundle  (Fixed / Mix & Match / Volume)
// -----------------------------------------------------------------------
export async function createBundle(shop, admin, input) {
    // Check plan revenue limit BEFORE creating anything.
    await checkBundleRevenueLimit(shop);
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();

    const bundleCode = `BND-${month}-${nanoid(4)}`;

    //.log("[createBundle] input.price:", input.price, "type:", typeof input.price);
    const {
        title,
        description,
        discountType,
        discountValue,
        fixedPrice,
        components = [],
        volumeTiers = [],
        type = "FIXED",
        minSelectCount,
        maxSelectCount,
        status = "ACTIVE",
        tags = [],
        mediaUrl = null,
        price,

    } = input;

    const computedFinalPrice =
        price != null
            ? price
            : computeBundlePrice(
                components,
                discountType,
                discountValue,
                fixedPrice,
                price
            ) ?? 0;
    // ── Step 1: Persist to DB as Active ──────────────────────────────────
    let bundle;
    try {
        bundle = await db.bundle.create({
            data: {
                shop,
                title,
                description: description ?? null,
                discountType,
                discountValue,
                fixedPrice: fixedPrice ?? null,
                status: "ACTIVE",
                type,
                bundleCode,
                // Mix & match
                minSelectCount: minSelectCount ?? null,
                maxSelectCount: maxSelectCount ?? null,
                tags: tags.join(","),
                components: components.length > 0
                    ? {
                        create: components.map((c, index) => ({
                            shopifyProductId: c.shopifyProductId,
                            shopifyProductTitle: c.shopifyProductTitle,
                            shopifyProductImage: c.shopifyProductImage ?? null,
                            shopifyVariantId: c.shopifyVariantId ?? null,
                            shopifyVariantTitle: c.shopifyVariantTitle ?? null,
                            shopifyVariantPrice: c.shopifyVariantPrice ?? null,
                            shopifySku: c.shopifySku ?? null,
                            quantity: c.quantity ?? 1,
                            isRequired: c.isRequired ?? (type === "FIXED"),
                            position: c.position ?? index,
                        })),
                    }
                    : undefined,
                volumeTiers: volumeTiers.length > 0
                    ? {
                        create: volumeTiers.map((t) => ({
                            minQuantity: t.minQuantity,
                            discountType: t.discountType,    // PERCENTAGE | FIXED_AMOUNT
                            discountValue: t.discountValue,
                        })),
                    }
                    : undefined,
            },
            include: {
                components: true,
                volumeTiers: { orderBy: { minQuantity: "asc" } },
            },
        });
    } catch (err) {
        console.error("[createBundle] REAL ERROR:", err.name, err.message, err.stack);
        await db.bundle.delete({ where: { id: bundle.id } }).catch(() => { });
        throw new Error(err.message); // ← show the real message, not the generic one
    }
    //.log("[createBundle]  DB record created:", bundle.id);
    // ── Step 2: Create Shopify product ──────────────────────────────────
    let mutationResponse;
    try {
        mutationResponse = await admin.graphql(CREATE_PRODUCT_MUTATION, {
            variables: {
                input: {
                    title, status, tags: Array.isArray(tags) ? tags : [], descriptionHtml: description ?? null,

                },
            },
        });
    } catch (err) {
        console.error("[createBundle] Shopify GraphQL error:", err);
        await db.bundle.delete({ where: { id: bundle.id } }).catch(() => { });
        throw new Error("Could not reach Shopify. Please try again.");
    }

    const mutationData = await mutationResponse.json();

    if (mutationData.errors) {
        await db.bundle.delete({ where: { id: bundle.id } }).catch(() => { });
        throw new Error(JSON.stringify(mutationData.errors));
    }

    const product = mutationData?.data?.productCreate?.product;
    const userErrors = mutationData?.data?.productCreate?.userErrors ?? [];
    const defaultVariantId = product?.variants?.edges?.[0]?.node?.id;
    if (userErrors.length > 0) {
        await db.bundle.delete({ where: { id: bundle.id } }).catch(() => { });
        throw new Error(userErrors.map((e) => e.message).join(", "));
    }

    if (!product?.id) {
        await db.bundle.delete({ where: { id: bundle.id } }).catch(() => { });
        throw new Error("Invalid Shopify response: product not created.");
    }
    //  After product created, attach media if provided
    // Upload image via staged uploads and save CDN URL
    let finalMediaUrl = null;
    // AFTER — uses attachImageToProduct to get permanent URL
    if (mediaUrl?.startsWith("data:image")) {
        try {
            const stagedUrl = await uploadImageToShopify(admin, mediaUrl);
            finalMediaUrl = await attachImageToProduct(admin, product.id, stagedUrl);
            //.log("[createBundle] Image attached, permanent URL:", finalMediaUrl);
        } catch (err) {
            console.warn("[createBundle] Image upload failed (non-fatal):", err.message);
        }
    }


    //.log("[createBundle] Shopify productCreate response:", JSON.stringify(mutationData, null, 2));
    // ── Step 2b: Set variant price ──────────────────────────────────────
    if (defaultVariantId && computedFinalPrice != null) {
        try {
            const variantRes = await admin.graphql(`
             mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                    productVariants {
                        id
                        price
                    }
                    userErrors { field message }
                }
            }
        `, {
                variables: {
                    productId: product.id,
                    variants: [{
                        id: defaultVariantId,
                        price: String(computedFinalPrice.toFixed(2)),
                    }]
                }
            });
            const variantData = await variantRes.json();
            const variantErrors = variantData?.data?.productVariantUpdate?.userErrors ?? [];
            if (variantErrors.length > 0) {
                //.warn("[createBundle] Variant price errors:", variantErrors);
            } else {
                //.log("[createBundle] Variant price set to:", computedFinalPrice);
            }
        } catch (err) {
            console.warn("[createBundle] Variant price update failed (non-fatal):", err.message);
        }
    }
    // ── Step 3: Save Shopify product ID, set ACTIVE ──────────────────────
    const updated = await db.bundle.update({
        where: { id: bundle.id },
        data: {
            shopifyProductId: product.id,
            shopifyProductHandle: product.handle,
            shopifyVariantId: defaultVariantId ?? null,
            status: "ACTIVE",
            mediaUrl: finalMediaUrl,  // Save the CDN URL to DB
            price: computedFinalPrice,  // Save the bundle price to DB
        },
        include: {
            components: { orderBy: { position: "asc" } },
            volumeTiers: { orderBy: { minQuantity: "asc" } },
        },
    });
    //.log("[createBundle] shopifyProductId saved:", updated.shopifyProductId);
    // Set metafields for bundle type and components (used by storefront for display and cart logic)
    try {
        await setMetafields(admin, updated.shopifyProductId, {
            id: updated.id,
            type: type,
            bundleCode: updated.bundleCode,
            discountType,
            discountValue,
            fixedPrice: fixedPrice ?? null,
            mediaUrl: finalMediaUrl ?? null,
            price: updated.price
        }, components);
    } catch (err) {
        console.warn("[createBundle] Metafields failed (non-fatal):", err.message);
    }

    // Step 4: Publish to Online Store
    try {
        await publishBundle(shop, admin, updated.id);
    } catch (err) {
        // Non-fatal — bundle is created, just not published yet
        console.warn("[createBundle] Could not publish to Online Store:", err.message);
    }

    return updated;
}
// -----------------------------------------------------------------------
// Deactivate bundles after the 7-day revenue-limit grace period
// -----------------------------------------------------------------------
export async function enforceRevenueGracePeriod(shop, admin) {
    const shopPlan = await db.shopPlan.findUnique({
        where: { shop },
    });

    if (!shopPlan?.revenueGracePeriodEndsAt) {
        return { deactivated: 0 };
    }

    const now = new Date();

    // Grace period is still active.
    if (now < shopPlan.revenueGracePeriodEndsAt) {
        return { deactivated: 0 };
    }

    // Grace period has expired.
    // Only deactivate bundles that are currently ACTIVE.
    const activeBundles = await db.bundle.findMany({
        where: {
            shop,
            status: "ACTIVE",
        },
        select: {
            id: true,
            shopifyProductId: true,
        },
    });

    let deactivated = 0;

    for (const bundle of activeBundles) {
        try {
            // Archive/unpublish the Shopify product if it exists.
            if (bundle.shopifyProductId) {
                try {
                    await admin.graphql(
                        `
                        mutation productUpdate(
                            $input: ProductInput!
                        ) {
                            productUpdate(input: $input) {
                                product {
                                    id
                                    status
                                }
                                userErrors {
                                    field
                                    message
                                }
                            }
                        }
                        `,
                        {
                            variables: {
                                input: {
                                    id: bundle.shopifyProductId,
                                    status: "ARCHIVED",
                                },
                            },
                        }
                    );
                } catch (shopifyError) {
                    console.warn(
                        `[revenue-limit] Failed to archive Shopify product ${bundle.shopifyProductId}:`,
                        shopifyError.message
                    );
                }
            }

            // Mark bundle as archived in our DB.
            await db.bundle.update({
                where: { id: bundle.id },
                data: {
                    status: "ARCHIVED",
                },
            });

            deactivated++;
        } catch (error) {
            console.error(
                `[revenue-limit] Failed to deactivate bundle ${bundle.id}:`,
                error.message
            );
        }
    }

    console.log(
        `[revenue-limit] Grace period expired for ${shop}. Deactivated ${deactivated} bundle(s).`
    );

    return { deactivated };
}

// -----------------------------------------------------------------------
// updateBundle
// -----------------------------------------------------------------------
export async function updateBundle(id, shop, admin, input) {
    const existing = await getBundle(id, shop);
    if (!existing) throw new Error("Bundle not found.");

    const dbData = {};
    if (input.title !== undefined) dbData.title = input.title;
    if (input.description !== undefined) dbData.description = input.description;
    if (input.discountType !== undefined) dbData.discountType = input.discountType;
    if (input.discountValue !== undefined) dbData.discountValue = input.discountValue;
    if (input.fixedPrice !== undefined) dbData.fixedPrice = input.fixedPrice;
    if (input.status !== undefined) dbData.status = input.status;
    if (input.minSelectCount !== undefined) dbData.minSelectCount = input.minSelectCount;
    if (input.maxSelectCount !== undefined) dbData.maxSelectCount = input.maxSelectCount;
    if (input.price !== undefined) dbData.price = input.price;

    // Replace components if provided
    if (input.components !== undefined) {
        dbData.components = {
            deleteMany: {},
            create: input.components.map((c, index) => ({
                shopifyProductId: c.shopifyProductId,
                shopifyProductTitle: c.shopifyProductTitle,
                shopifyProductImage: c.shopifyProductImage ?? null,
                shopifyVariantId: c.shopifyVariantId ?? null,
                shopifyVariantTitle: c.shopifyVariantTitle ?? null,
                shopifyVariantPrice: c.shopifyVariantPrice ?? null,
                shopifySku: c.shopifySku ?? null,
                quantity: c.quantity ?? 1,
                isRequired: c.isRequired ?? true,
                position: c.position ?? index,
                options: c.options ? JSON.stringify(c.options) : null,
                variants: c.variants ? JSON.stringify(c.variants) : null,
            })),
        };
    }

    // Replace volume tiers if provided
    if (input.volumeTiers !== undefined) {
        dbData.volumeTiers = {
            deleteMany: {},
            create: input.volumeTiers.map((t) => ({
                minQuantity: t.minQuantity,
                discountType: t.discountType,
                discountValue: t.discountValue,
            })),
        };
    }

    //  Handle image BEFORE db.bundle.update so dbData has the URL
    let finalMediaUrl = existing.mediaUrl ?? null;
    // AFTER — uses attachImageToProduct to get permanent URL
    if (input.mediaUrl?.startsWith("data:image")) {
        try {
            const stagedUrl = await uploadImageToShopify(admin, input.mediaUrl);
            if (existing.shopifyProductId) {
                finalMediaUrl = await attachImageToProduct(admin, existing.shopifyProductId, stagedUrl);
                //.log("[updateBundle] Image attached, permanent URL:", finalMediaUrl);
            } else {
                finalMediaUrl = stagedUrl; // fallback if no shopify product yet
            }
        } catch (err) {
            console.warn("[updateBundle] Image upload failed:", err.message);
        }
    }

    //  Now update DB with all data including mediaUrl
    const updated = await db.bundle.update({
        where: { id },
        data: dbData,
        include: {
            components: { orderBy: { position: "asc" } },
            volumeTiers: { orderBy: { minQuantity: "asc" } },
        },
    });

    //  Sync metafields after DB update
    //  Only sync metafields if components changed — not on status-only updates
    if (updated.shopifyProductId) {
        try {
            await setMetafields(admin, updated.shopifyProductId, {
                id: updated.id,
                type: updated.type,
                bundleCode: updated.bundleCode,
                discountType: updated.discountType,
                discountValue: updated.discountValue,
                fixedPrice: updated.fixedPrice ?? null,
                mediaUrl: finalMediaUrl ?? null,
                price: input.price ?? updated.price ?? null,
            }, updated.components);
        } catch (err) {
            console.warn("[updateBundle] Metafields sync failed:", err.message);
        }
    }

    // Sync title/status to Shopify
    if (existing.shopifyProductId) {
        const shopifyUpdate = {};
        if (input.title !== undefined) shopifyUpdate.title = input.title;
        if (input.status !== undefined)
            shopifyUpdate.status = input.status === "ACTIVE" ? "ACTIVE" : "DRAFT";

        if (Object.keys(shopifyUpdate).length > 0) {
            try {
                await admin.graphql(UPDATE_PRODUCT_MUTATION, {
                    variables: { input: { id: existing.shopifyProductId, ...shopifyUpdate } },
                });
            } catch (err) {
                console.error("[updateBundle] Shopify sync failed:", err);
            }
        }
    }

    //  Sync variant price to Shopify when price changes
    if (input.price !== undefined && existing.shopifyVariantId) {
        try {
            await admin.graphql(`
             mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                    productVariants {
                        id
                        price
                    }
                    userErrors { field message }
                }
            }
        `, {
                variables: {
                    productId: existing.shopifyProductId,
                    variants: [{
                        id: existing.shopifyVariantId,
                        price: String(input.price ?? "0.00"),
                    }]
                }
            });
            //.log("[updateBundle]  Variant price updated:", input.price);
        } catch (err) {
            console.warn("[updateBundle] Price update failed:", err.message);
        }
    } else if (input.price !== undefined && !existing.shopifyVariantId) {
        //  shopifyVariantId not saved — fetch it from Shopify first
        try {
            const productRes = await admin.graphql(`
            query {
                product(id: "${existing.shopifyProductId}") {
                    variants(first: 1) {
                        edges { node { id } }
                    }
                }
            }
        `);
            const productData = await productRes.json();
            const variantId = productData?.data?.product?.variants?.edges?.[0]?.node?.id;

            if (variantId) {
                // Save variantId to DB for future use
                await db.bundle.update({
                    where: { id },
                    data: { shopifyVariantId: variantId },
                });

                await admin.graphql(`
                mutation productVariantUpdate($input: ProductVariantInput!) {
                    productVariantUpdate(input: $input) {
                        productVariant { id price }
                        userErrors { field message }
                    }
                }
            `, {
                    variables: {
                        input: {
                            id: variantId,
                            price: String(input.price ?? "0.00"),
                        }
                    }
                });
                //.log("[updateBundle]  Variant price updated (fetched variantId):", input.price);
            }
        } catch (err) {
            console.warn("[updateBundle] Price update (fetch variant) failed:", err.message);
        }
    }

    //Multivariant options and variants are stored as JSON strings in the DB for simplicity, since they can be complex objects. 
    if (input.bundleOptions !== undefined) dbData.bundleOptions = JSON.stringify(input.bundleOptions);
    if (input.isMulti !== undefined) dbData.isMulti = input.isMulti;
    if (input.productCount !== undefined) dbData.productCount = input.productCount;

    return updated;
}
// -----------------------------------------------------------------------
// archiveBundle / activateBundle / deleteBundle
// -----------------------------------------------------------------------
export async function archiveBundle(id, shop, admin) {
    return updateBundle(id, shop, admin, { status: "ARCHIVED" });
}

export async function activateBundle(id, shop, admin) {
    return updateBundle(id, shop, admin, { status: "ACTIVE" });
}

export async function deleteBundle(shop, admin, bundleId) {
    const bundle = await db.bundle.findFirst({ where: { id: bundleId, shop } });

    if (!bundle) throw new Error("Bundle not found.");

    if (bundle?.shopifyProductId) {
        try {
            const res = await admin.graphql(`
                mutation {
                    productDelete(input: { id: "${bundle.shopifyProductId}" }) {
                        deletedProductId
                        userErrors { field message }
                    }
                }
            `);
            const data = await res.json();
            const userErrors = data?.data?.productDelete?.userErrors ?? [];

            // Filter out "does not exist" errors — product already gone, that's fine
            const realErrors = userErrors.filter(e =>
                !e.message.toLowerCase().includes("does not exist") &&
                !e.message.toLowerCase().includes("not found")
            );

            if (realErrors.length > 0) {
                throw new Error(realErrors.map(e => e.message).join(", "));
            }

            //.log("[deleteBundle] Shopify product deleted or already gone.");
        } catch (err) {
            // If product doesn't exist on Shopify, still delete from DB
            if (
                err.message?.toLowerCase().includes("does not exist") ||
                err.message?.toLowerCase().includes("not found")
            ) {
                //.warn("[deleteBundle] Product already deleted from Shopify, cleaning up DB.");
            } else {
                throw err; // real error — re-throw
            }
        }
    }

    // Always delete from DB regardless of Shopify outcome
    await db.bundle.delete({ where: { id: bundleId } });
}
// -----------------------------------------------------------------------
// getVolumeTierForQuantity  (used by storefront API route)
// Returns the best matching tier for a given quantity.
// -----------------------------------------------------------------------
export function getVolumeTierForQuantity(tiers, quantity) {
    const sorted = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
    return sorted.find((t) => quantity >= t.minQuantity) ?? null;
}

// -----------------------------------------------------------------------
// GraphQL operations for publishing and fetching bundles via Shopify Admin API.
// -----------------------------------------------------------------------

export async function publishBundle(shop, admin, bundleId) {
    const bundle = await db.bundle.findFirst({ where: { id: bundleId, shop } });
    if (!bundle?.shopifyProductId) throw new Error("Bundle has no Shopify product.");
    return publishProductToOnlineStore(admin, bundle.shopifyProductId);
}
// Publishes any Shopify product to the Online Store channel.
export async function publishProductToOnlineStore(admin, shopifyProductId) {
    const pubResponse = await admin.graphql(GET_PUBLICATIONS_QUERY);
    const pubData = await pubResponse.json();
    const publications = pubData?.data?.publications?.edges ?? [];

    const onlineStore = publications.find((e) => e.node.name === "Online Store");
    if (!onlineStore) throw new Error("Online Store publication not found.");

    const response = await admin.graphql(PUBLISH_PRODUCT_MUTATION, {
        variables: {
            productId: shopifyProductId,
            publicationId: onlineStore.node.id,
        },
    });

    const data = await response.json();
    const userErrors = data?.data?.publishablePublish?.userErrors ?? [];
    if (userErrors.length > 0) {
        throw new Error(userErrors.map((e) => e.message).join(", "));
    }

    return data?.data?.publishablePublish?.publishable;
}

// -----------------------------------------------------------------------
// GET BUNDLE DETAILS (for storefront display)
// Fetches the Shopify product details, including variants, for a given bundle.
// -----------------------------------------------------------------------
export async function setMetafields(admin, shopifyProductId, bundle, components) {
    const componentsData = components.map(c => ({
        productId: c.shopifyProductId,
        allVariantIds: c.allVariantIds ?? [],
        title: c.shopifyProductTitle,
        variantTitle: c.shopifyVariantTitle,
        price: c.shopifyVariantPrice,
        image: c.shopifyProductImage,
        quantity: c.quantity ?? 1,
    }));

    const bundlePayload = {
        id: bundle.id,
        bundleCode: bundle.bundleCode,
        type: bundle.type,
        discountType: bundle.discountType,
        discountValue: bundle.discountValue,
        fixedPrice: bundle.fixedPrice ?? null,
        price: bundle.price ?? null,
        mediaUrl: bundle.mediaUrl ?? null,
        componentProductIds: components.map(c => c.shopifyProductId),
        componentVariantIds: components.flatMap(c =>
            c.allVariantIds?.length > 0
                ? c.allVariantIds
                : (c.shopifyVariantId ? [c.shopifyVariantId] : [])
        ),
        components: componentsData,
    };

    const response = await admin.graphql(`
        mutation SetBundleData($id: ID!, $metafields: [MetafieldInput!]!) {
            productUpdate(input: { id: $id, metafields: $metafields }) {
                product {
                    id
                    metafield(namespace: "$app", key: "data") {
                        id
                        value
                    }
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `, {
        variables: {
            id: shopifyProductId,
            metafields: [{
                namespace: "$app",
                key: "data",
                type: "json",
                value: JSON.stringify(bundlePayload),
            }],
        },
    });

    const data = await response.json();
    const userErrors = data?.data?.productUpdate?.userErrors ?? [];
    const savedValue = data?.data?.productUpdate?.product?.metafield?.value;

    if (userErrors.length > 0) {
        //.error("[setMetafields] errors:", userErrors);
        throw new Error(userErrors.map(e => e.message).join(", "));
    }

    // This confirms the value was actually written and can be read back
    //.log("[setMetafields] Confirmed written, metafield value length:", savedValue?.length);
}

// -----------------------------------------------------------------------
// getBundleRevenue — fetch revenue + units sold from Shopify Orders API
// -----------------------------------------------------------------------
/**
 * @param {string} shop
 * @param {object} admin       — Shopify admin GraphQL client
 * @param {string[]} productIds — array of shopifyProductId GIDs to match
 * @returns {Map<string, { revenue: number, unitsSold: number, orderCount: number }>}
 */
export async function getBundleRevenue(shop, admin, productIds) {
    // Build a Set for O(1) lookup
    const productIdSet = new Set(productIds);

    // result map: productId -> stats
    const stats = new Map();
    for (const pid of productIds) {
        stats.set(pid, { revenue: 0, unitsSold: 0, orderCount: 0 });
    }

    let cursor = null;
    let hasNextPage = true;

    while (hasNextPage) {
        const res = await admin.graphql(GET_ORDERS_WITH_LINE_ITEMS, {
            variables: { cursor },
        });

        const data = await res.json();

        if (data.errors) {
            //.error("[getBundleRevenue] GraphQL errors:", data.errors);
            break;
        }

        const orders = data?.data?.orders?.edges ?? [];
        const pageInfo = data?.data?.orders?.pageInfo;

        for (const { node: order } of orders) {
            const lineItems = order.lineItems?.edges ?? [];

            // Track which bundle products appear in this order (for orderCount)
            const seenProductsInOrder = new Set();

            for (const { node: item } of lineItems) {
                const productId = item.product?.id;
                if (!productId || !productIdSet.has(productId)) continue;

                const revenue = parseFloat(
                    item.originalTotalSet?.shopMoney?.amount ?? "0"
                );
                const quantity = item.quantity ?? 0;

                const entry = stats.get(productId);
                entry.revenue += revenue;
                entry.unitsSold += quantity;

                if (!seenProductsInOrder.has(productId)) {
                    entry.orderCount += 1;
                    seenProductsInOrder.add(productId);
                }
            }
        }

        hasNextPage = pageInfo?.hasNextPage ?? false;
        cursor = pageInfo?.endCursor ?? null;
    }

    return stats;
}

// Fetch daily bundle analytics data for a shop within the selected date range.
// Used to power time-based revenue, sales, and order analytics.
export async function getBundleAnalyticsDaily(shop, startDate, endDate) {
    return db.bundleRevenueDaily.findMany({
        where: {
            shop,
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
        orderBy: {
            date: "asc",
        },
    });
}

export async function getBundleAnalyticsSummary(
    shop,
    startDate,
    endDate
) {
    const daily = await db.bundleRevenueDaily.findMany({
        where: {
            shop,
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
    });

    return {
        totalRevenue: daily.reduce(
            (sum, item) => sum + Number(item.revenue ?? 0),
            0
        ),
        totalUnitsSold: daily.reduce(
            (sum, item) => sum + Number(item.quantity ?? 0),
            0
        ),
        totalOrders: daily.reduce(
            (sum, item) => sum + Number(item.orders ?? 0),
            0
        ),
    };
}

// Fetch bundle-level performance statistics for analytics.
export async function getBundleAnalyticsPerformance(
    shop,
    startDate,
    endDate
) {
    const stats = await db.bundleRevenueDaily.groupBy({
        by: ["bundleId"],
        where: {
            shop,
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
        _sum: {
            revenue: true,
            quantity: true,
            orders: true,
        },
    });

    const bundleIds = stats.map(
        (item) => item.bundleId
    );

    if (bundleIds.length === 0) {
        return [];
    }

    const bundles = await db.bundle.findMany({
        where: {
            shop,
            id: {
                in: bundleIds,
            },
        },
        select: {
            id: true,
            title: true,
            type: true,
        },
    });

    const bundleMap = new Map(
        bundles.map((bundle) => [
            bundle.id,
            bundle,
        ])
    );

    return stats
        .map((item) => ({
            bundleId: item.bundleId,
            totalRevenue:
                item._sum.revenue ?? 0,
            totalQuantity:
                item._sum.quantity ?? 0,
            totalOrders:
                item._sum.orders ?? 0,
            bundle:
                bundleMap.get(item.bundleId) ?? null,
        }))
        .sort(
            (a, b) =>
                Number(b.totalRevenue) -
                Number(a.totalRevenue)
        );
}

// Aggregate bundle revenue, units, and orders by bundle type.
export async function getBundleAnalyticsByType(
    shop,
    startDate,
    endDate
) {
    const stats = await db.bundleRevenueDaily.groupBy({
        by: ["bundleId"],
        where: {
            shop,
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
        _sum: {
            revenue: true,
            quantity: true,
            orders: true,
        },
    });

    const bundleIds = stats.map(
        (item) => item.bundleId
    );

    if (bundleIds.length === 0) {
        return [];
    }

    const bundles = await db.bundle.findMany({
        where: {
            shop,
            id: {
                in: bundleIds,
            },
        },
        select: {
            id: true,
            type: true,
        },
    });

    const bundleMap = new Map(
        bundles.map((bundle) => [
            bundle.id,
            bundle,
        ])
    );

    const typeMap = new Map();

    for (const stat of stats) {
        const bundle = bundleMap.get(
            stat.bundleId
        );

        if (!bundle) continue;

        const current =
            typeMap.get(bundle.type) ?? {
                type: bundle.type,
                revenue: 0,
                quantity: 0,
                orders: 0,
            };

        current.revenue += Number(
            stat._sum.revenue ?? 0
        );

        current.quantity += Number(
            stat._sum.quantity ?? 0
        );

        current.orders += Number(
            stat._sum.orders ?? 0
        );

        typeMap.set(bundle.type, current);
    }

    return Array.from(
        typeMap.values()
    ).sort(
        (a, b) => b.revenue - a.revenue
    );
}

export async function getBundleOrderComparison(
    shop,
    admin,
    startDate,
    endDate
) {
    const daily = await db.bundleRevenueDaily.findMany({
        where: {
            shop,
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
    });

    const withBundles = daily.reduce(
        (acc, item) => {
            acc.orders += Number(item.orders ?? 0);
            acc.revenue += Number(item.revenue ?? 0);
            return acc;
        },
        { orders: 0, revenue: 0 }
    );

    const withBundlesAOV =
        withBundles.orders > 0
            ? withBundles.revenue / withBundles.orders
            : 0;

    // Temporary demo/test data for non-bundle orders
    const withoutBundles = {
        orders: 31,
        revenue: 3200,
        aov: 3200 / 31,
    };

    return {
        withBundles: {
            orders: withBundles.orders,
            revenue: withBundles.revenue,
            aov: withBundlesAOV,
        },
        withoutBundles,
    };
}