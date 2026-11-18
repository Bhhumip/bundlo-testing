// app/models/multivariant.server.js
// Single product — real options + variants via productOptionsCreate
// Multi product  — native Shopify bundle via productBundleCreate

import db from "../db.server.js";
import { nanoid } from "nanoid";
import {
    CREATE_PRODUCT_MUTATION,
    CREATE_PRODUCT_MEDIA_MUTATION,
    CREATE_PRODUCT_BUNDLE_MUTATION,
    UPDATE_PRODUCT_BUNDLE_MUTATION,
    POLL_BUNDLE_OPERATION_QUERY,
    UPDATE_PRODUCT_MUTATION,
    CREATE_PRODUCT_OPTIONS_MUTATION,
} from "../graphql/bundles.js";
import {
    uploadImageToShopify,
    publishBundle,
    setMetafields,
} from "./bundle.server.js";

// -----------------------------------------------------------------------
// cartesian
// -----------------------------------------------------------------------
function cartesian(arrays) {
    return arrays.reduce(
        (acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])),
        [[]]
    );
}

// -----------------------------------------------------------------------
// findSourceVariant
// Match combo values to a Shopify variant by position
// selectedOptions from resource picker only has {value} not {name}
// -----------------------------------------------------------------------
function findSourceVariant(variants, comboValues) {
    return variants.find((variant) =>
        variant.selectedOptions.every((sel, index) =>
            sel.value === comboValues[index]
        )
    ) ?? null;
}

// -----------------------------------------------------------------------
// generateVariantsForProduct
// Returns all combination rows for one product
// -----------------------------------------------------------------------
function generateVariantsForProduct(product, bundleProductConfig) {
    const { options, variants, title, shopifyProductId } = product;
    const selectedOptionValues = bundleProductConfig.options;

    const valueSets = options.map((opt) => {
        const config = selectedOptionValues.find(o => o.name === opt.name);
        return config?.selectedValues ?? [];
    });

    if (valueSets.some(s => s.length === 0)) return [];

    const combinations = cartesian(valueSets);

    return combinations.map((comboValues) => {
        const sourceVariant = findSourceVariant(variants, comboValues);

        const optionValuesMap = {};
        options.forEach((opt, index) => {
            optionValuesMap[opt.name] = comboValues[index];
        });

        const bundleVariantTitle = [title, ...comboValues].join(" - ");

        return {
            bundleVariantTitle,
            sourceProductId: shopifyProductId,
            sourceVariantId: sourceVariant?.id ?? null,
            sourceVariantPrice: parseFloat(sourceVariant?.price ?? "0"),
            optionValues: optionValuesMap,
        };
    });
}

//------------------------------------------------------------------------
// helper function that queries the operation as a node and extracts the product ID
//------------------------------------------------------------------------
async function fetchBundleProductByTitle(admin, title) {
    try {
        // Small delay to let Shopify index the new product
        await new Promise(r => setTimeout(r, 500));

        const res = await admin.graphql(`#graphql
            query FindBundleProduct($query: String!) {
                products(first: 5, query: $query, sortKey: CREATED_AT, reverse: true) {
                    edges {
                        node {
                            id
                            handle
                            title
                            variants(first: 250) {
                                edges {
                                    node {
                                        id
                                        title
                                        price
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `, { variables: { query: `title:"${title}"` } });

        const data = await res.json();
        const products = data?.data?.products?.edges ?? [];

        console.log("[fetchBundleProductByTitle] Found", products.length, "products matching title");

        // Return the most recently created one
        const product = products[0]?.node ?? null;
        console.log("[fetchBundleProductByTitle] productId =", product?.id ?? "null");
        return product;

    } catch (err) {
        console.warn("[fetchBundleProductByTitle] Failed:", err.message);
        return null;
    }
}
// -----------------------------------------------------------------------
// pollBundleOperation
// productBundleCreate is async — poll until COMPLETE or FAILED
// -----------------------------------------------------------------------
async function pollBundleOperation(admin, operationId, title, maxAttempts = 20) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {

        const delay = attempt === 0 ? 500 : 1500;
        await new Promise(r => setTimeout(r, delay));

        const res = await admin.graphql(POLL_BUNDLE_OPERATION_QUERY, {
            variables: { id: operationId },
        });
        const data = await res.json();
        const operation = data?.data?.productOperation;

        console.log(
            `[pollBundleOperation] Attempt ${attempt + 1}/${maxAttempts}:`,
            `status = ${operation?.status}`,
            `productId = ${operation?.product?.id ?? "null"}`,
            `(waited ${delay}ms)`
        );

        if (operation?.status === "FAILED") {
            const errors = operation.userErrors?.map(e => e.message).join(", ");
            throw new Error(`Bundle operation failed: ${errors}`);
        }

        if (operation?.status === "COMPLETE") {
            if (operation?.product?.id) {
                return operation.product;
            }
            console.warn("[pollBundleOperation] COMPLETE but product null — searching by title...");
            const product = await fetchBundleProductByTitle(admin, title);
            if (product?.id) {
                console.log("[pollBundleOperation] Found product via title search:", product.id);
                return product;
            }
            console.warn("[pollBundleOperation] Title search returned null, retrying...");
        }
    }

    throw new Error(`Bundle operation timed out after ${maxAttempts} attempts.`);
}
// -----------------------------------------------------------------------
// createSingleProductBundle
// Uses real option names (Colour, Size) with productOptionsCreate
// Creates proper variant structure in Shopify admin
// -----------------------------------------------------------------------
async function createSingleProductBundle(shop, admin, input, bundle, allGeneratedVariants, bundlePrice) {
    const { title, description, status, tags } = input;

    // ── Create Shopify product shell ───────────────────────────────────
    let shopifyProduct;
    try {
        const res = await admin.graphql(CREATE_PRODUCT_MUTATION, {
            variables: {
                input: {
                    title,
                    status,
                    tags: Array.isArray(tags) ? tags : [],
                    descriptionHtml: description ?? null,
                },
            },
        });
        const data = await res.json();
        const userErrors = data?.data?.productCreate?.userErrors ?? [];
        if (userErrors.length > 0) {
            throw new Error(userErrors.map(e => e.message).join(", "));
        }
        shopifyProduct = data?.data?.productCreate?.product;
        if (!shopifyProduct?.id) throw new Error("Shopify product not created.");
        console.log("[createSingleProductBundle] Product created:", shopifyProduct.id);
    } catch (err) {
        throw new Error("Could not create Shopify product: " + err.message);
    }

    const defaultVariantId = shopifyProduct?.variants?.edges?.[0]?.node?.id;

    // ── Get the source product's real options ──────────────────────────
    // allGeneratedVariants all come from one product
    // Extract unique option names from their optionValues keys
    const firstVariant = allGeneratedVariants[0];
    const optionNames = Object.keys(firstVariant.optionValues);

    // Build option → selected values map
    const optionValuesMap = {};
    for (const v of allGeneratedVariants) {
        for (const [optName, optValue] of Object.entries(v.optionValues)) {
            if (!optionValuesMap[optName]) optionValuesMap[optName] = new Set();
            optionValuesMap[optName].add(optValue);
        }
    }

    // ── Create real options on the product ─────────────────────────────
    // Pass first option with first value only — renames default variant
    const firstOptionName = optionNames[0];
    const firstOptionValues = [...optionValuesMap[firstOptionName]];
    let createdOptionIds = {};
    let firstVariantId = null;

    try {
        const optRes = await admin.graphql(`#graphql
            mutation productOptionsCreate(
                $productId: ID!
                $options: [OptionCreateInput!]!
            ) {
                productOptionsCreate(productId: $productId, options: $options) {
                    userErrors { field message code }
                    product {
                        id
                        options { id name }
                        variants(first: 5) {
                            edges { node { id title } }
                        }
                    }
                }
            }
        `, {
            variables: {
                productId: shopifyProduct.id,
                options: optionNames.map(name => ({
                    name,
                    values: [...optionValuesMap[name]].map(v => ({ name: v })),
                })),
            },
        });

        const optData = await optRes.json();
        const optErrors = optData?.data?.productOptionsCreate?.userErrors ?? [];
        if (optErrors.length > 0) {
            console.warn("[createSingleProductBundle] Option errors:", JSON.stringify(optErrors));
        }

        const updatedProduct = optData?.data?.productOptionsCreate?.product;

        // Map option names to their IDs
        for (const opt of updatedProduct?.options ?? []) {
            createdOptionIds[opt.name] = opt.id;
        }

        // First variant was auto-created from first option value
        firstVariantId = updatedProduct?.variants?.edges?.[0]?.node?.id ?? null;

        console.log("[createSingleProductBundle] Options created:", Object.keys(createdOptionIds));
        console.log("[createSingleProductBundle] First variant ID:", firstVariantId);

    } catch (err) {
        console.warn("[createSingleProductBundle] productOptionsCreate failed:", err.message);
    }

    // ── Bulk create remaining variants ─────────────────────────────────
    const createdShopifyVariants = firstVariantId
        ? [{ id: firstVariantId, title: allGeneratedVariants[0].bundleVariantTitle }]
        : [];

    // Skip first variant — already created by productOptionsCreate
    const remainingVariants = allGeneratedVariants.slice(1);

    if (remainingVariants.length > 0 && Object.keys(createdOptionIds).length > 0) {
        const BATCH_SIZE = 100;

        for (let i = 0; i < remainingVariants.length; i += BATCH_SIZE) {
            const batch = remainingVariants.slice(i, i + BATCH_SIZE);

            const variantInputs = batch.map((v) => ({
                price: String(bundlePrice),
                optionValues: Object.entries(v.optionValues).map(([name, value]) => ({
                    optionId: createdOptionIds[name],
                    name: value,
                })),
            }));

            try {
                const varRes = await admin.graphql(`#graphql
                    mutation productVariantsBulkCreate(
                        $productId: ID!
                        $variants: [ProductVariantsBulkInput!]!
                    ) {
                        productVariantsBulkCreate(
                            productId: $productId
                            variants: $variants
                        ) {
                            productVariants { id title price }
                            userErrors { field message }
                        }
                    }
                `, {
                    variables: {
                        productId: shopifyProduct.id,
                        variants: variantInputs,
                    },
                });

                const varData = await varRes.json();
                const varErrors = varData?.data?.productVariantsBulkCreate?.userErrors ?? [];
                if (varErrors.length > 0) {
                    console.warn("[createSingleProductBundle] Variant errors:", JSON.stringify(varErrors));
                }

                const batchCreated = varData?.data?.productVariantsBulkCreate?.productVariants ?? [];
                createdShopifyVariants.push(...batchCreated);
                console.log("[createSingleProductBundle] Batch created:", batchCreated.length);

            } catch (err) {
                console.warn("[createSingleProductBundle] Batch failed:", err.message);
            }
        }
    }

    // ── Update price on first variant ──────────────────────────────────
    if (firstVariantId) {
        try {
            await admin.graphql(`#graphql
                mutation productVariantsBulkUpdate(
                    $productId: ID!
                    $variants: [ProductVariantsBulkInput!]!
                ) {
                    productVariantsBulkUpdate(
                        productId: $productId
                        variants: $variants
                    ) {
                        productVariants { id price }
                        userErrors { field message }
                    }
                }
            `, {
                variables: {
                    productId: shopifyProduct.id,
                    variants: [{ id: firstVariantId, price: String(bundlePrice) }],
                },
            });
            console.log("[createSingleProductBundle] First variant price updated");
        } catch (err) {
            console.warn("[createSingleProductBundle] Price update failed:", err.message);
        }
    }

    console.log("[createSingleProductBundle] Total variants:", createdShopifyVariants.length);

    return { shopifyProduct, createdShopifyVariants };
}


// -----------------------------------------------------------------------
// normalizeOptionName
// Shopify has no tolerance for spelling variants like Color/Colour
// across component products — they count as separate options.
// Normalize to consistent names so productBundleCreate sees max 3.
// -----------------------------------------------------------------------
const OPTION_NAME_MAP = {
    "colour": "Color",
    "color": "Color",
    "size": "Size",
    "sizing": "Size",
    "material": "Material",
    "style": "Style",
    "finish": "Finish",
};

function normalizeOptionName(name) {
    return OPTION_NAME_MAP[name.toLowerCase()] ?? name;
}

// -----------------------------------------------------------------------
// buildConsolidatedOptions
// Groups component options by normalized name and builds the
// consolidatedOptions payload Shopify needs to merge them into one
// bundle-level option (so 2 products × 2 options = 2, not 4).
//
// consolidatedOptions schema (from Shopify docs Step 4):
// [
//   {
//     optionName: "Color",
//     optionSelections: [
//       {
//         optionValue: "Red",
//         components: [
//           { componentOptionId: "gid://...Option/1", componentOptionValue: "Red" },
//           { componentOptionId: "gid://...Option/2", componentOptionValue: "Red" }
//         ]
//       }
//     ]
//   }
// ]
// -----------------------------------------------------------------------
function buildConsolidatedOptions(componentInputs) {
    const groupMap = new Map();

    for (const comp of componentInputs) {
        for (const sel of (comp.optionSelections ?? [])) {
            const name = normalizeOptionName(sel.name);
            if (!groupMap.has(name)) groupMap.set(name, new Map());
            const valueMap = groupMap.get(name);

            for (const value of (sel.values ?? [])) {
                if (!valueMap.has(value)) valueMap.set(value, []);
                valueMap.get(value).push({
                    componentOptionId: sel.componentOptionId,
                    componentOptionValue: value,
                });
            }
        }
    }

    const consolidatedOptions = [];
    for (const [optionName, valueMap] of groupMap.entries()) {
        const allOptionIds = new Set(
            [...valueMap.values()].flat().map(c => c.componentOptionId)
        );
        if (allOptionIds.size <= 1) continue; // only one product has this — no merge needed

        consolidatedOptions.push({
            optionName,
            optionSelections: [...valueMap.entries()].map(([optionValue, components]) => ({
                optionValue,
                components,
            })),
        });
    }

    return { consolidatedOptions };
}
// -----------------------------------------------------------------------
// createMultiProductBundle
// Uses productBundleCreate — native Shopify bundle
// Shows component products as linked rows in admin
// Options are union of all selected products' options
// -----------------------------------------------------------------------
async function createMultiProductBundle(shop, admin, input, bundle, allGeneratedVariants, bundlePrice, components, bundleOptions) {
    const { title, description, status, tags } = input;

    const unionOptionsMap = {};

    for (const productConfig of bundleOptions) {
        for (const opt of productConfig.options) {
            const normalizedName = normalizeOptionName(opt.name);
            if (!unionOptionsMap[normalizedName]) {
                unionOptionsMap[normalizedName] = new Set();
            }
            for (const val of opt.selectedValues) {
                unionOptionsMap[normalizedName].add(val);
            }
        }
    }
    const bundleProductOptions = Object.entries(unionOptionsMap).slice(0, 3).map(([name, values]) => ({
        name,
        values: [...values],
    }));

    const allowedOptionNames = new Set(bundleProductOptions.map(o => o.name));

    const componentInputs = components.map((comp) => {
        const productConfig = bundleOptions.find(
            bo => bo.productId === comp.shopifyProductId
        );
        if (!productConfig) return null;

        const optionSelections = productConfig.options
            .map(opt => {
                const normalizedName = normalizeOptionName(opt.name);

                if (!allowedOptionNames.has(normalizedName)) {
                    console.warn(`[createMultiProductBundle] Dropping "${opt.name}" → not in allowed set`);
                    return null;
                }

                const sourceOption = (comp.options ?? []).find(
                    o => normalizeOptionName(o.name) === normalizedName
                );

                if (!sourceOption?.id) {
                    console.error(
                        `[CRITICAL] Cannot find option ID for "${opt.name}" (normalized: "${normalizedName}") ` +
                        `on product "${comp.shopifyProductTitle}". ` +
                        `Available options: ${JSON.stringify(comp.options?.map(o => ({ name: o.name, id: o.id })))}`
                    );
                    return null;
                }

                return {
                    componentOptionId: sourceOption.id,
                    name: normalizedName,
                    values: opt.selectedValues,
                };
            })
            .filter(Boolean);

        return {
            productId: comp.shopifyProductId,
            quantity: comp.quantity ?? 1,
            optionSelections,
        };
    }).filter(Boolean);

    const uniqueNormalizedOptionNames = new Set(
        componentInputs.flatMap(c =>
            (c.optionSelections ?? []).map(sel => normalizeOptionName(sel.name))
        )
    );

    console.log("[createMultiProductBundle] Unique option names after normalization:",
        [...uniqueNormalizedOptionNames]);

    console.log("[createMultiProductBundle] Final optionSelections being sent to Shopify:",
        JSON.stringify(componentInputs.map(c => ({
            productId: c.productId,
            names: c.optionSelections.map(s => s.name)
        })), null, 2)
    );
    // ── Build consolidatedOptions for the update step ──────────────────
    const { consolidatedOptions } = buildConsolidatedOptions(componentInputs);

    console.log("[createMultiProductBundle] consolidatedOptions:",
        JSON.stringify(consolidatedOptions, null, 2)
    );

    // ── Step A: productBundleCreate with FIRST component only ──────────
    // Rationale:
    // - productBundleCreate has no consolidatedOptions support
    // - It counts every componentOptionId as a separate dimension
    // - 2 products × 2 options = 4 dimensions → rejected
    // - Solution: create with 1 product (max 2 dimensions) → succeeds
    // - Then update to add all products + consolidatedOptions
    const [firstComponent, ...remainingComponents] = componentInputs;

    let operationId = null;
    let shopifyProduct = null;
    let createdShopifyVariants = [];

    try {
        console.log("[createMultiProductBundle] Calling productBundleCreate with first component only...");

        const res = await admin.graphql(CREATE_PRODUCT_BUNDLE_MUTATION, {
            variables: {
                input: {
                    title,
                    components: [firstComponent],
                },
            },
        });

        const data = await res.json();

        console.log("[createMultiProductBundle] Raw errors:", JSON.stringify(data?.errors));
        console.log("[createMultiProductBundle] userErrors:",
            JSON.stringify(data?.data?.productBundleCreate?.userErrors));
        console.log("[createMultiProductBundle] Operation ID:",
            data?.data?.productBundleCreate?.productBundleOperation?.id);

        if (data?.errors) throw new Error(JSON.stringify(data.errors));

        const userErrors = data?.data?.productBundleCreate?.userErrors ?? [];
        if (userErrors.length > 0) {
            throw new Error(userErrors.map(e => `${e.field}: ${e.message}`).join(", "));
        }

        operationId = data?.data?.productBundleCreate?.productBundleOperation?.id;
        if (!operationId) throw new Error("No operation ID returned from productBundleCreate");

        const immediateProduct = data?.data?.productBundleCreate?.productBundleOperation?.product;
        if (immediateProduct?.id) {
            shopifyProduct = immediateProduct;
            console.log("[createMultiProductBundle] Product immediately available:", shopifyProduct.id);
        }

    } catch (err) {
        console.error("[createMultiProductBundle] FULL ERROR:", err.message);
        throw new Error("productBundleCreate failed: " + err.message);
    }

    // ── Poll until creation is complete ───────────────────────────────
    if (operationId && !shopifyProduct?.id) {
        try {
            shopifyProduct = await pollBundleOperation(admin, operationId, title);
            console.log("[createMultiProductBundle] Bundle product ready:", shopifyProduct?.id);
        } catch (err) {
            throw new Error("Bundle operation polling failed: " + err.message);
        }
    }

    if (!shopifyProduct?.id) {
        throw new Error("Bundle product was not created after polling.");
    }

    // ── Step B: productBundleUpdate — add all components + consolidate ─
    // Now that the bundle exists, productBundleUpdate accepts consolidatedOptions
    // which tells Shopify to merge the 4 option dimensions into 2 logical ones
    try {
        console.log("[createMultiProductBundle] productBundleUpdate: adding all components + consolidatedOptions...");

        const updateInput = {
            productId: shopifyProduct.id,
            title,
            components: componentInputs,                          // ← all products
            ...(consolidatedOptions.length > 0 && { consolidatedOptions }),
        };

        console.log("[createMultiProductBundle] Update input:",
            JSON.stringify(updateInput, null, 2)
        );

        const updateRes = await admin.graphql(UPDATE_PRODUCT_BUNDLE_MUTATION, {
            variables: { input: updateInput },
        });

        const updateData = await updateRes.json();
        const updateErrors = updateData?.data?.productBundleUpdate?.userErrors ?? [];

        if (updateErrors.length > 0) {
            // Log but don't throw — bundle exists with first product at minimum
            console.warn("[createMultiProductBundle] productBundleUpdate errors:",
                JSON.stringify(updateErrors)
            );
        } else {
            const updateOpId = updateData?.data?.productBundleUpdate?.productBundleOperation?.id;
            console.log("[createMultiProductBundle] Update operation ID:", updateOpId);

            if (updateOpId) {
                try {
                    const updatedProduct = await pollBundleOperation(admin, updateOpId, title);
                    if (updatedProduct?.id) {
                        shopifyProduct = updatedProduct;
                        console.log("[createMultiProductBundle] All components added:", shopifyProduct.id);
                    }
                } catch (pollErr) {
                    console.warn("[createMultiProductBundle] Update poll failed:", pollErr.message);
                }
            }
        }

    } catch (err) {
        console.warn("[createMultiProductBundle] productBundleUpdate failed:", err.message);
    }

    // ── Collect variants ───────────────────────────────────────────────
    createdShopifyVariants = shopifyProduct?.variants?.edges?.map(e => e.node) ?? [];
    console.log("[createMultiProductBundle] Variants from bundle:", createdShopifyVariants.length);

    // ── Post-creation: set description + options ───────────────────────
    if (shopifyProduct?.id) {
        await Promise.all([

            description
                ? admin.graphql(UPDATE_PRODUCT_MUTATION, {
                    variables: {
                        input: {
                            id: shopifyProduct.id,
                            descriptionHtml: description,
                        },
                    },
                }).then(r => r.json()).then(d => {
                    const errs = d?.data?.productUpdate?.userErrors ?? [];
                    if (errs.length) console.warn("[createMultiProductBundle] productUpdate errors:", errs);
                    else console.log("[createMultiProductBundle] Description set");
                }).catch(err => console.warn("[createMultiProductBundle] productUpdate failed:", err.message))
                : Promise.resolve(),

            bundleProductOptions.length > 0
                ? admin.graphql(CREATE_PRODUCT_OPTIONS_MUTATION, {
                    variables: {
                        productId: shopifyProduct.id,
                        options: bundleProductOptions.slice(0, 3).map(opt => ({
                            name: opt.name,
                            values: opt.values.map(v => ({ name: v })),
                        })),
                    },
                }).then(r => r.json()).then(d => {
                    const errs = d?.data?.productOptionsCreate?.userErrors ?? [];
                    if (errs.length) console.warn("[createMultiProductBundle] productOptionsCreate errors:", errs);
                    else console.log("[createMultiProductBundle] Options set");
                }).catch(err => console.warn("[createMultiProductBundle] productOptionsCreate failed:", err.message))
                : Promise.resolve(),

        ]);
    }

    // ── Update variant prices ──────────────────────────────────────────
    if (createdShopifyVariants.length > 0) {
        try {
            const priceUpdates = createdShopifyVariants.map(v => ({
                id: v.id,
                price: String(bundlePrice),
            }));

            const BATCH_SIZE = 100;
            for (let i = 0; i < priceUpdates.length; i += BATCH_SIZE) {
                const batch = priceUpdates.slice(i, i + BATCH_SIZE);
                await admin.graphql(`#graphql
                    mutation productVariantsBulkUpdate(
                        $productId: ID!
                        $variants: [ProductVariantsBulkInput!]!
                    ) {
                        productVariantsBulkUpdate(
                            productId: $productId
                            variants: $variants
                        ) {
                            productVariants { id price }
                            userErrors { field message }
                        }
                    }
                `, {
                    variables: {
                        productId: shopifyProduct.id,
                        variants: batch,
                    },
                });
            }
            console.log("[createMultiProductBundle] Prices updated");
        } catch (err) {
            console.warn("[createMultiProductBundle] Price update failed:", err.message);
        }
    }

    return { shopifyProduct, createdShopifyVariants };
}
// -----------------------------------------------------------------------
// createMultivariantBundle — main export
// Routes to single or multi product path based on isMulti
// -----------------------------------------------------------------------
export async function createMultivariantBundle(shop, admin, input) {
    const {
        title,
        description,
        discountType = "NONE",
        discountValue = 0,
        fixedPrice = null,
        status = "ACTIVE",
        tags = [],
        mediaUrl = null,
        price = null,
        isMulti = false,
        productCount = 1,
        variantLimit = 1000,
        bundleOptions = [],
        components = [],
    } = input;

    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const bundleCode = `MV-${month}-${nanoid(4)}`;

    // ── Step 1: Generate all variant combinations ──────────────────────
    const allGeneratedVariants = [];

    for (const productConfig of bundleOptions) {
        const matchingComponent = components.find(
            c => c.shopifyProductId === productConfig.productId
        );
        if (!matchingComponent) continue;

        const productForGeneration = {
            title: matchingComponent.shopifyProductTitle,
            shopifyProductId: matchingComponent.shopifyProductId,
            options: matchingComponent.options ?? [],
            variants: matchingComponent.variants ?? [],
        };

        const variants = generateVariantsForProduct(productForGeneration, productConfig);
        allGeneratedVariants.push(...variants);
    }

    console.log("[createMultivariantBundle] Generated variants:", allGeneratedVariants.length);

    if (allGeneratedVariants.length === 0) {
        throw new Error("No valid variant combinations generated.");
    }

    if (allGeneratedVariants.length > variantLimit) {
        throw new Error(
            `${allGeneratedVariants.length} variants exceeds your limit of ${variantLimit}.`
        );
    }

    // ── Step 2: Compute bundle price ───────────────────────────────────
    let bundlePrice = price;
    if (!bundlePrice) {
        const totalSourcePrice = allGeneratedVariants.reduce(
            (sum, v) => sum + v.sourceVariantPrice, 0
        );
        bundlePrice = totalSourcePrice / allGeneratedVariants.length;

        if (discountType === "PERCENTAGE" && discountValue > 0) {
            bundlePrice = bundlePrice * (1 - discountValue / 100);
        } else if (discountType === "FIXED_AMOUNT" && discountValue > 0) {
            bundlePrice = Math.max(0, bundlePrice - discountValue);
        } else if (discountType === "FIXED_PRICE" && fixedPrice) {
            bundlePrice = fixedPrice;
        }
    }

    bundlePrice = parseFloat(bundlePrice.toFixed(2));
    console.log("[createMultivariantBundle] Bundle price:", bundlePrice);

    // ── Step 3: Save to DB ─────────────────────────────────────────────
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
                type: "MULTIVARIANT",
                bundleCode,
                isMulti,
                productCount: productCount ?? null,
                variantLimit,
                bundleOptions: JSON.stringify(bundleOptions),
                tags: tags.join(","),
                price: bundlePrice,
                components: {
                    create: allGeneratedVariants.map((v, index) => ({
                        shopifyProductId: v.sourceProductId,
                        shopifyProductTitle: components.find(
                            c => c.shopifyProductId === v.sourceProductId
                        )?.shopifyProductTitle ?? "",
                        shopifyProductImage: components.find(
                            c => c.shopifyProductId === v.sourceProductId
                        )?.shopifyProductImage ?? null,
                        shopifyVariantId: null,
                        shopifyVariantTitle: v.bundleVariantTitle,
                        shopifyVariantPrice: v.sourceVariantPrice,
                        quantity: 1,
                        isRequired: true,
                        position: index,
                        selectedOptions: JSON.stringify({
                            bundleVariantTitle: v.bundleVariantTitle,
                            sourceVariantId: v.sourceVariantId,
                            optionValues: v.optionValues,
                        }),
                    })),
                },
            },
            include: { components: true, volumeTiers: false },
        });
    } catch (err) {
        console.error("[createMultivariantBundle] DB error:", err.message);
        throw new Error(err.message);
    }

    console.log("[createMultivariantBundle] DB record created:", bundle.id);

    // ── Step 4: Create Shopify product — single or multi path ──────────
    let shopifyProduct;
    let createdShopifyVariants;

    try {
        if (!isMulti) {
            // Single product — real options and variants
            const result = await createSingleProductBundle(
                shop, admin, input, bundle, allGeneratedVariants, bundlePrice
            );
            shopifyProduct = result.shopifyProduct;
            createdShopifyVariants = result.createdShopifyVariants;
        } else {
            // Multi product — native Shopify bundle
            const result = await createMultiProductBundle(
                shop, admin, input, bundle, allGeneratedVariants,
                bundlePrice, components, bundleOptions
            );
            shopifyProduct = result.shopifyProduct;
            createdShopifyVariants = result.createdShopifyVariants;
        }
    } catch (err) {
        await db.bundle.delete({ where: { id: bundle.id } }).catch(() => { });
        throw err;
    }

    // ── Step 5: Update DB components with Shopify variant IDs ──────────
    const componentUpdatePromises = bundle.components.map((comp) => {
        const matchedShopifyVariant = createdShopifyVariants.find(
            sv => sv.title === comp.shopifyVariantTitle
        );
        if (!matchedShopifyVariant) return Promise.resolve();
        return db.bundleComponent.update({
            where: { id: comp.id },
            data: { shopifyVariantId: matchedShopifyVariant.id },
        });
    });

    await Promise.all(componentUpdatePromises);
    console.log("[createMultivariantBundle] DB components updated");

    // ── Step 6: Upload image ───────────────────────────────────────────
    let finalMediaUrl = null;
    if (mediaUrl?.startsWith("data:image")) {
        try {
            finalMediaUrl = await uploadImageToShopify(admin, mediaUrl);
            await admin.graphql(CREATE_PRODUCT_MEDIA_MUTATION, {
                variables: {
                    productId: shopifyProduct.id,
                    media: [{
                        originalSource: finalMediaUrl,
                        mediaContentType: "IMAGE",
                    }],
                },
            });
            console.log("[createMultivariantBundle] Image uploaded");
        } catch (err) {
            console.warn("[createMultivariantBundle] Image upload failed:", err.message);
        }
    }

    // ── Step 7: Save Shopify IDs to DB ─────────────────────────────────
    const firstVariant = createdShopifyVariants.find(sv => sv.title !== "Default Title");

    const updated = await db.bundle.update({
        where: { id: bundle.id },
        data: {
            shopifyProductId: shopifyProduct.id,
            shopifyProductHandle: shopifyProduct.handle,
            shopifyVariantId: firstVariant?.id ?? null,
            status: "ACTIVE",
            mediaUrl: finalMediaUrl,
            price: bundlePrice,
        },
        include: {
            components: { orderBy: { position: "asc" } },
            volumeTiers: { orderBy: { minQuantity: "asc" } },
        },
    });

    console.log("[createMultivariantBundle] DB updated with Shopify IDs");

    // ── Step 8: Set metafields ─────────────────────────────────────────
    try {
        await setMetafields(admin, updated.shopifyProductId, {
            id: updated.id,
            type: "MULTIVARIANT",
            bundleCode: updated.bundleCode,
            discountType,
            discountValue,
            fixedPrice: fixedPrice ?? null,
            mediaUrl: finalMediaUrl ?? null,
            price: bundlePrice,
        }, updated.components);
    } catch (err) {
        console.warn("[createMultivariantBundle] Metafields failed:", err.message);
    }

    // ── Step 9: Publish ────────────────────────────────────────────────
    try {
        await publishBundle(shop, admin, updated.id);
        console.log("[createMultivariantBundle] Published to Online Store");
    } catch (err) {
        console.warn("[createMultivariantBundle] Publish failed:", err.message);
    }

    return updated;
}