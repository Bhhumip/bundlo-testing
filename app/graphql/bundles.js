// -----------------------------------------------------------------------
// CREATE
// Called when a merchant saves a new fixed bundle.
// Shopify creates the bundle product in the background (async).
// -----------------------------------------------------------------------
export const CREATE_PRODUCT_MUTATION = `#graphql
mutation ProductCreate($input: ProductInput!) {
  productCreate(input: $input) {
    product {
      id
      title
      handle
      status
      tags
      vendor
      descriptionHtml
      variants(first: 1) {      
      edges {
         node {
            id
          }
       }
     }
      images(first: 1) {
        edges {
          node {
            url
            altText
          }
        }
      }

    }
    userErrors {
      field
      message
    }
  }
}
`;
export const PRODUCT_VARIANT_UPDATE = `#graphql
mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants {
      id
      price
    }
    userErrors {
      field
      message
    }
  }
}
`;


export const CREATE_PRODUCT_MEDIA_MUTATION = `
  mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media {
        ... on MediaImage {
          id
          image { url }
        }
      }
      mediaUserErrors { field message }
    }
  }
`;

export const GET_BUNDLE_OPERATION = `#graphql
  query GetBundleOperation($id: ID!) {
    productOperation(id: $id) {
      ... on ProductBundleOperation {
        id
        status
        product {
          id
          title
          handle
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  }
`;

// -----------------------------------------------------------------------
// UPDATE TITLE / STATUS
// Called when a merchant edits a bundle title or activates/archives it.
// Also used to sync the Shopify product status when you archive a bundle.
// -----------------------------------------------------------------------
export const UPDATE_PRODUCT_MUTATION = `#graphql
  mutation ProductUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        handle
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// -----------------------------------------------------------------------
// UPDATE COMPONENTS
// Called when a merchant adds/removes products from an existing bundle.
// This is also async — poll GET_BUNDLE_OPERATION after calling it.
// operationType: REPLACE (swap all components) | ADD | REMOVE
// -----------------------------------------------------------------------
export const UPDATE_BUNDLE_COMPONENTS_MUTATION = `#graphql
  mutation ProductVariantRelationshipBulkUpdate(
    $input: [ProductVariantRelationshipUpdateInput!]!
    $parentProductId: ID!
    $operationType: ProductVariantRelationshipUpdateOperationType!
  ) {
    productVariantRelationshipBulkUpdate(
      input: $input
      parentProductId: $parentProductId
      operationType: $operationType
    ) {
      productBundleOperation {
        id
        status
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

// -----------------------------------------------------------------------
// GET PRODUCT
// Used to verify a product still exists on Shopify before bundle creation.
// Also used to fetch fresh prices if needed.
// -----------------------------------------------------------------------
export const GET_PRODUCT_QUERY = `#graphql
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      status
      featuredImage {
        url
        altText
      }
      variants(first: 100) {
        edges {
          node {
            id
            title
            price
            sku
            availableForSale
            inventoryQuantity
          }
        }
      }
    }
  }
`;

// -----------------------------------------------------------------------
// GET MULTIPLE PRODUCTS
// Used when loading the create/edit form to show fresh product data.
// Pass IDs as a comma-joined string in the query param:
//   query: "id:123 OR id:456"
// -----------------------------------------------------------------------
export const GET_PRODUCTS_QUERY = `#graphql
  query GetProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          status
          featuredImage {
            url
            altText
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                sku
                availableForSale
                inventoryQuantity
              }
            }
          }
        }
      }
    }
  }
`;


// -----------------------------------------------------------------------
// GET PUBLICATIONS
// Used to fetch the list of publications for the "Publish to Publication" feature.
// -----------------------------------------------------------------------
export const GET_PUBLICATIONS_QUERY = `
  query GetPublications {
    publications(first: 10) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;
//Publish a product to a publication
export const PUBLISH_PRODUCT_MUTATION = `
  mutation PublishProductToPublication($productId: ID!, $publicationId: ID!) {
    publishablePublish(id: $productId, input: [{ publicationId: $publicationId }]) {
      publishable {
        ... on Product {
          id
          title
          status
          publishedOnPublication(publicationId: $publicationId)
        }
      }
      shop {
        publicationCount
      }
      userErrors {
        field
        message
      }
    }
  }
`;
//------------------------------------------------------------------------
// METAFIELD DEFINITIONS & SETTING METAFIELDS
// We need to create metafield definitions for our bundle data (components, discounts, image URL).
// Then we set the metafields on the Shopify product whenever a bundle is created/updated.
// -----------------------------------------------------------------------
export const CREATE_METAFIELD_DEFINITION_MUTATION = `
    mutation createMetafieldDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
            createdDefinition { 
                id 
                name 
            }
            userErrors { 
                field 
                message 
                code 
            }
        }
    }
`;
// MetafieldsSet mutation to set metafields for a product bundle
export const METAFIELDS_SET_MUTATION = `
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        namespace
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;
//------------------------------------------------------------------------
// STAGED UPLOADS
// Used to get signed URLs for direct image uploads to Shopify's CDN.
// This is used in the bundle edit form when a merchant wants to change the bundle image.
// -----------------------------------------------------------------------
export const STAGED_UPLOADS_MUTATION = `
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

//------------------------------------------------------------------------
// GET ORDERS WITH LINE ITEMS
// Used to fetch orders containing bundled products, along with their line items and product IDs.
// This allows us to identify which orders include bundles and what components were in those bundles at the time of purchase.
// -----------------------------------------------------------------------
export const GET_ORDERS_WITH_LINE_ITEMS = `
  query getOrders($cursor: String) {
    orders(
      first: 250
      after: $cursor
      query: "financial_status:paid"
      sortKey: CREATED_AT
      reverse: true
    ) {
      edges {
        node {
          id
          name
          createdAt
          totalPriceSet {
            shopMoney { amount currencyCode }
          }
          lineItems(first: 50) {
            edges {
              node {
                quantity
                originalTotalSet {
                  shopMoney { amount }
                }
                product { id }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
//------------------------------------------------------------------------
// CREATE PRODUCT OPTIONS
// Used to create options on the Shopify product for each bundle component.
//-------------------------------------------------------------------------
export const CREATE_PRODUCT_OPTIONS_MUTATION = `#graphql
mutation productOptionsCreate($productId: ID!, $options: [OptionCreateInput!]!) {
  productOptionsCreate(productId: $productId, options: $options) {
    userErrors {
      field
      message
      code
    }
    product {
      id
      options {
        id
        name
        values
      }
    }
  }
}
`;
//------------------------------------------------------------------------
// CREATE PRODUCT VARIANTS IN BULK
// Used to create multiple product variants at once when creating/updating bundle components.
// This is also async — poll GET_BUNDLE_OPERATION after calling it.
// -----------------------------------------------------------------------
export const CREATE_PRODUCT_VARIANTS_BULK_MUTATION = `#graphql
mutation productVariantsBulkCreate(
  $productId: ID!
  $variants: [ProductVariantsBulkInput!]!
) {
  productVariantsBulkCreate(productId: $productId, variants: $variants) {
    productVariants {
      id
      title
      price
      selectedOptions {
        name
        value
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;
//------------------------------------------------------------------------
// DELETE PRODUCT VARIANTS IN BULK
// Used to delete multiple product variants at once when updating bundle components.
// This is also async — poll GET_BUNDLE_OPERATION after calling it.
// -----------------------------------------------------------------------
export const DELETE_PRODUCT_VARIANTS_BULK_MUTATION = `#graphql
mutation productVariantsBulkDelete($productId: ID!, $variantsIds: [ID!]!) {
  productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
    product {
      id
    }
    userErrors {
      field
      message
    }
  }
}
`;
//------------------------------------------------------------------------
// CREATE PRODUCT BUNDLE
// This is a wrapper mutation that creates the product, options, variants, and metafields for a bundle all at once. 
//-------------------------------------------------------------------------

export const CREATE_PRODUCT_BUNDLE_MUTATION = `#graphql
mutation productBundleCreate($input: ProductBundleCreateInput!) {
  productBundleCreate(input: $input) {
    productBundleOperation {
      id
      status
      product {
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
      userErrors {
        field
        message
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;
//------------------------------------------------------------------------
// UPDATE PRODUCT BUNDLE
// This is a wrapper mutation that updates the product title/status, options, variants, and metafields for a bundle all at once. 
// This is also async — poll GET_BUNDLE_OPERATION after calling it.
//-------------------------------------------------------------------------
export const UPDATE_PRODUCT_BUNDLE_MUTATION = `#graphql
mutation productBundleUpdate($input: ProductBundleUpdateInput!) {
  productBundleUpdate(input: $input) {
    productBundleOperation {
      id
      status
      product {
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
      userErrors {
        field
        message
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;
//------------------------------------------------------------------------
// POLL BUNDLE OPERATION
// Used to poll the status of async operations like creating a bundle or updating its components.
// Call this repeatedly after triggering an async mutation until the status is "COMPLETED" or "FAILED".
// -----------------------------------------------------------------------
export const POLL_BUNDLE_OPERATION_QUERY = `#graphql
query pollBundleOperation($id: ID!) {
  productOperation(id: $id) {
    ... on ProductBundleOperation {
      id
      status
      product {
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
      userErrors {
        field
        message
        code
      }
    }
  }
}
`;


