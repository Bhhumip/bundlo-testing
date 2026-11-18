import { useLoaderData, useRouteError, isRouteErrorResponse, } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { requireFeatureAccess } from "../featureAccess.server";
import { getUpsellWidget, createOrUpdateUpsellWidget } from "../models/upsell.server";
import { UPSELL_SURFACES } from "../models/upsell.constants";
import { WIDGET_DEFINITIONS } from "../models/customize-widget-definitions";
import { WidgetManagePage } from "../components/widget-route-utils";

// Per-surface widget component maps .
import { PDP_WIDGET_COMPONENTS } from "../components/pdp-widgets";
import { CART_WIDGET_COMPONENTS } from "../components/cart-widgets";
import { POST_PURCHASE_WIDGET_COMPONENTS } from "../components/post-purchase-widgets";
import { ACCOUNT_WIDGET_COMPONENTS } from "../components/account-widgets";

// Checkout components are imported individually.
// import { OneClickUpsellWidget } from "../components/checkout-widgets/OneClickUpsellWidget";
// import { DownsellFunnelWidget } from "../components/checkout-widgets/DownsellFunnelWidget";
// import { AutomaticDiscountsWidget } from "../components/checkout-widgets/AutomaticDiscountsWidget";
// import { TargetingRulesWidget } from "../components/checkout-widgets/TargetingRulesWidget";
// import { ABTestingWidget } from "../components/checkout-widgets/ABTestingWidget";
// import { ShippingMethodRulesWidget } from "../components/checkout-widgets/ShippingMethodRulesWidget";
// import { PaymentMethodRulesWidget } from "../components/checkout-widgets/PaymentMethodRulesWidget";
import { DonationsWidget } from "../components/checkout-widgets/DonationsWidget";
import { TestimonialsWidget } from "../components/checkout-widgets/TestimonialsWidget";
import { RewardBarWidget } from "../components/checkout-widgets/RewardBarWidget";
import { FreeShippingProgressBarWidget } from "../components/checkout-widgets/FreeShippingProgressBarWidget";
import { FrequentlyBoughtTogetherWidget } from "../components/checkout-widgets/FrequentlyBoughtTogetherWidget";
import { CustomerPersonalizedRecommendationWidget } from "../components/checkout-widgets/CustomerPersonalizedRecommendationWidget";
import { syncFbtDiscount } from "./api.fbt-discounts";
import { syncCprDiscount } from "./api.cpr-discounts"; import { OrderNoteWidget } from "../components/checkout-widgets/OrderNoteWidget";
import { publishProductToOnlineStore } from "../models/bundle.server";
// Build a checkout component map in the same shape as the other surfaces.
const CHECKOUT_WIDGET_COMPONENTS = {
  /*one_click_upsell_at_checkout: OneClickUpsellWidget,
  downsell_funnel: DownsellFunnelWidget,
  automatic_discounts: AutomaticDiscountsWidget,
  targeting_rules: TargetingRulesWidget,
  ab_testing: ABTestingWidget,
  shipping_method_rules: ShippingMethodRulesWidget,
  payment_method_rules: PaymentMethodRulesWidget,*/
  donations: DonationsWidget,
  testimonials_social_proof: TestimonialsWidget,
  reward_bar_progress_bar: RewardBarWidget,
  frequently_bought_together: FrequentlyBoughtTogetherWidget,
  customer_personalized_recommendation: CustomerPersonalizedRecommendationWidget,
  order_notes: OrderNoteWidget,
  free_shipping_progress_bar: FreeShippingProgressBarWidget,
};

// Everything we need to render a surface's manage page, keyed by surface.
const SURFACE_CONFIG = {
  [UPSELL_SURFACES.PDP]: {
    components: PDP_WIDGET_COMPONENTS,
    surfaceName: "Product page",
    backLabel: "Back to Customize",
  },
  [UPSELL_SURFACES.CART]: {
    components: CART_WIDGET_COMPONENTS,
    surfaceName: "Cart & drawer",
    backLabel: "Back to Customize",
  },
  [UPSELL_SURFACES.CHECKOUT]: {
    components: CHECKOUT_WIDGET_COMPONENTS,
    surfaceName: "Checkout",
    backLabel: "Back to Customize",
  },
  [UPSELL_SURFACES.POST_PURCHASE]: {
    components: POST_PURCHASE_WIDGET_COMPONENTS,
    surfaceName: "Post-purchase",
    backLabel: "Back to Customize",
  },
  [UPSELL_SURFACES.ACCOUNT]: {
    components: ACCOUNT_WIDGET_COMPONENTS,
    surfaceName: "Customer account",
    backLabel: "Back to Customize",
  },
};

const DEFAULT_SURFACE = UPSELL_SURFACES.CHECKOUT;
const SURFACES_COMING_SOON = new Set([
  UPSELL_SURFACES.POST_PURCHASE,
  UPSELL_SURFACES.ACCOUNT,
]);
// Resolve the surface coming from the URL (?surface=PDP) into a known one.
function resolveSurface(value) {
  return SURFACE_CONFIG[value] ? value : DEFAULT_SURFACE;
}

const widgetKeyFromSlug = (slug) => String(slug || "").replace(/-/g, "_");

// Find a widget definition that matches BOTH the key and the surface.
// Matching on surface too is what keeps shared keys (e.g. FBT on PDP and
// Checkout) from colliding.
function findWidgetDefinition(widgetKey, surface) {
  return (
    WIDGET_DEFINITIONS.find(
      (widget) => widget.key === widgetKey && widget.surface === surface,
    ) || null
  );
}

// Keep the back link pointing at the right surface tab.
function buildBackPath(surface) {
  return `/app/Customize?surface=${surface}`;
}

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const surface = resolveSurface(url.searchParams.get("surface"));

  if (SURFACES_COMING_SOON.has(surface)) {
    throw new Response("Not Found", { status: 404 });
  }

  const widgetKey = widgetKeyFromSlug(params.widget);
  const definition = findWidgetDefinition(widgetKey, surface);
  if (widgetKey === "frequently_bought_together" && surface === UPSELL_SURFACES.CHECKOUT) {
    await requireFeatureAccess(session.shop, "FBT_CHECKOUT");
  }

  if (widgetKey === "order_notes" && surface === UPSELL_SURFACES.CART) {
    await requireFeatureAccess(session.shop, "ORDER_NOTES_CART");
  }

  if (widgetKey === "countdown_timer_urgency" && surface === UPSELL_SURFACES.CART) {
    await requireFeatureAccess(session.shop, "CART_COUNTDOWN");
  }

  if (widgetKey === "testimonials_social_proof") {
    await requireFeatureAccess(session.shop, "TESTIMONIALS");
  }

  if (widgetKey === "donations") {
    await requireFeatureAccess(session.shop, "DONATIONS");
  }

  if (widgetKey === "order_notes") {
    if (surface === UPSELL_SURFACES.CART) {
      await requireFeatureAccess(session.shop, "ORDER_NOTES_CART");
    }

    if (surface === UPSELL_SURFACES.CHECKOUT) {
      await requireFeatureAccess(session.shop, "ORDER_NOTES_CHECKOUT");
    }
  }

  if (widgetKey === "reward_bar_progress_bar") {
    await requireFeatureAccess(session.shop, "FREE_GIFT");
  }
  if (!definition) throw new Response("Not Found", { status: 404 });

  // Checkout uses a surface-scoped key (e.g. CHECKOUT:fbt); other surfaces use the plain key.
  const scopedKey = surface === "CHECKOUT" ? `${surface}:${widgetKey}` : widgetKey;

  // READ saved theme from the widget's notes JSON.
  const existingWidget = await getUpsellWidget(session.shop, scopedKey);
  let savedTheme = null;
  if (existingWidget?.notes) {
    try {
      const parsed = JSON.parse(existingWidget.notes);
      savedTheme = parsed?.theme ?? null;
    } catch {
      savedTheme = null;
    }
  }
  if (
    widgetKey === "frequently_bought_together" ||
    widgetKey === "customer_personalized_recommendation"
  ) {
    const discountTitle =
      widgetKey === "frequently_bought_together"
        ? "FBT Discount"
        : "CPR Discount";

    try {
      const response = await admin.graphql(
        `
        query GetDiscountConfig($query: String!) {
          discountNodes(first: 1, query: $query) {
            edges {
              node {
                discount {
                  __typename

                  ... on DiscountAutomaticApp {
                    title
                    metafields(
                      first: 1
                      namespace: "$app"
                      keys: ["function-configuration"]
                    ) {
                      nodes {
                        value
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
          variables: {
            query: `title:"${discountTitle}"`,
          },
        },
      );

      const json = await response.json();

      const raw =
        json.data?.discountNodes?.edges?.[0]?.node?.discount?.metafields?.nodes?.[0]?.value;

      if (raw) {
        const config = JSON.parse(raw);

        savedTheme = {
          ...(savedTheme || {}),
          discountValue: Number(config?.percentage ?? 0),
        };
      }

      console.log(
        `[CUSTOMIZE] ${discountTitle} discount config:`,
        savedTheme?.discountValue,
      );
    } catch (error) {
      console.error(
        `[CUSTOMIZE] Failed to read ${discountTitle} config:`,
        error,
      );
    }
  }

  return {
    shop: session.shop,
    surface,
    definition: { ...definition, savedTheme },
  };
};

export default function CustomizeWidgetManageRoute() {
  const { shop, surface, definition } = useLoaderData();
  const config = SURFACE_CONFIG[surface] || SURFACE_CONFIG[DEFAULT_SURFACE];
  const WidgetComponent = config.components[definition.key];

  return (
    <WidgetManagePage
      shop={shop}
      definition={definition}
      WidgetComponent={WidgetComponent}
      backPath={buildBackPath(surface)}
      surfaceName={config.surfaceName}
      backLabel={config.backLabel}
    />
  );
}
export function ErrorBoundary() {
  const error = useRouteError();

  let message = "Something went wrong.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 403) {
      try {
        const data =
          typeof error.data === "string"
            ? JSON.parse(error.data)
            : error.data;

        if (data?.error === "FEATURE_NOT_AVAILABLE") {
          message = `This feature is not available on your current ${data.currentPlan}. Please upgrade your plan to use it.`;
        } else {
          message = "You don't have access to this feature.";
        }
      } catch {
        message = "You don't have access to this feature.";
      }
    } else {
      message = error.statusText || `Request failed (${error.status}).`;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <s-page heading="Feature unavailable">
      <s-section>
        <s-banner tone="warning">
          <s-text>{message}</s-text>
        </s-banner>

        <div style={{ marginTop: "16px" }}>
          <s-button
            variant="primary"
            onClick={() => window.history.back()}
          >
            Back
          </s-button>
        </div>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);

export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const surface = resolveSurface(url.searchParams.get("surface"));

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save-widget-theme") {
    const widgetKey = widgetKeyFromSlug(params.widget);
    const definition = findWidgetDefinition(widgetKey, surface);
    const WIDGET_FEATURE_REQUIREMENTS = {
      mix_match_bundle_builder: "MIX_MATCH",
      countdown_timer_urgency: "CART_COUNTDOWN",
      testimonials_social_proof: "TESTIMONIALS",
      reward_bar_progress_bar: "FREE_GIFT",
      donations: "DONATIONS",
      frequently_bought_together: "FBT_CHECKOUT",
    };

    const requiredFeature = WIDGET_FEATURE_REQUIREMENTS[widgetKey];

    if (requiredFeature) {
      if (
        widgetKey === "frequently_bought_together" &&
        surface !== UPSELL_SURFACES.CHECKOUT
      ) {
        // no checkout FBT gating on other surfaces
      } else {
        await requireFeatureAccess(session.shop, requiredFeature);
      }
    }

    if (widgetKey === "order_notes") {
      if (surface === UPSELL_SURFACES.CART) {
        await requireFeatureAccess(session.shop, "ORDER_NOTES_CART");
      }

      if (surface === UPSELL_SURFACES.CHECKOUT) {
        await requireFeatureAccess(session.shop, "ORDER_NOTES_CHECKOUT");
      }
    }

    if (!definition) throw new Response("Not Found", { status: 404 });
    if (!definition) {
      return { ok: false, error: "Unknown widget" };
    }

    const scopedKey = surface === "CHECKOUT" ? `${surface}:${widgetKey}` : widgetKey;
    const theme = JSON.parse(formData.get("theme") || "{}");


    const existing = await getUpsellWidget(session.shop, scopedKey);
    let parsed = {};
    try {
      parsed = existing?.notes ? JSON.parse(existing.notes) : {};
    } catch {
      parsed = {};
    }

    await createOrUpdateUpsellWidget(session.shop, scopedKey, {
      widgetType: definition.key,
      placement: "checkout",
      displayMode: "inline",
      headline: definition.title,
      ctaLabel: "Save",
      internalName: definition.title,
      notes: JSON.stringify({
        ...parsed,
        theme: theme,
      }),
    });
    if (
      widgetKey === "frequently_bought_together" &&
      typeof theme.discountValue === "number"
    ) {
      await syncFbtDiscount(admin, theme.discountValue);
    }
    if (
      widgetKey === "customer_personalized_recommendation" &&
      typeof theme.discountValue === "number"
    ) {
      await syncCprDiscount(admin, theme.discountValue);
    }

    // NEW — sync the pricing-relevant subset to the shop metafield the Function reads
    if (widgetKey === "donations") {
      const { admin } = await authenticate.admin(request);
      const shopRes = await admin.graphql(`#graphql
        query GetShopId { shop { id } }
      `);
      const shopData = await shopRes.json();
      const shopId = shopData?.data?.shop?.id;

      if (shopId) {
        await admin.graphql(`#graphql
          mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields { id namespace key value }
              userErrors { field message code }
            }
          }
        `, {
          variables: {
            metafields: [{
              ownerId: shopId,
              namespace: "$app",
              key: "donations_config",
              type: "json",
              value: JSON.stringify({
                donationTiers: theme.donationTiers ?? [],
                customMinAmount: theme.customMinAmount ?? 1,
                customMaxAmount: theme.customMaxAmount ?? 100000,
              }),
            }],
          },
        });
      }
    }
    // Sync the countdown timer theme to a shop metafield so the Function can read it.
    if (widgetKey === "countdown_timer_urgency") {
      const shopRes = await admin.graphql(`#graphql
    query GetShopId { shop { id } }
  `);
      const shopData = await shopRes.json();
      const shopId = shopData?.data?.shop?.id;

      if (shopId) {
        await admin.graphql(`#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id namespace key value }
          userErrors { field message code }
        }
      }
    `, {
          variables: {
            metafields: [{
              ownerId: shopId,
              namespace: "custom",
              key: "urgency_timer_widget",
              type: "json",
              value: JSON.stringify({
                enabled: theme.enabled ?? true,
                mainMessage: theme.mainMessage,
                itemCartMessage: theme.itemCartMessage,
                countdownDuration: theme.countdownDuration,
                extendedTimeHeading: theme.extendedTimeHeading,
                extendedTimeMessage: theme.extendedTimeMessage,
                extendedTime: theme.extendedTime,
                expirationBehavior: theme.expirationBehavior,
                messageTextColor: theme.messageTextColor,
                backgroundColor: theme.backgroundColor,
                timerColor: theme.timerColor,
                fontSize: theme.fontSize,
                fontBold: theme.fontBold,
                borderStyle: theme.borderStyle,
                borderWidth: theme.borderWidth,
                borderRadius: theme.borderRadius,
                borderColor: theme.borderColor,
                padding: theme.padding,
                margin: theme.margin,
                cartPageTopPosition: theme.cartPageTopPosition,
                cartPageLeftPosition: theme.cartPageLeftPosition,
                customCSS: theme.customCSS,
              }),
            }],
          },
        });
      }
    }
    if (widgetKey === "discount_code_field") {
      const shopRes = await admin.graphql(`#graphql
    query GetShopId { shop { id } }
  `);
      const shopData = await shopRes.json();
      const shopId = shopData?.data?.shop?.id;

      if (shopId) {
        await admin.graphql(`#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id namespace key value }
          userErrors { field message code }
        }
      }
    `, {
          variables: {
            metafields: [{
              ownerId: shopId,
              namespace: "custom",
              key: "discount_code_field_widget",
              type: "json",
              value: JSON.stringify({
                enabled: theme.enabled,
                heading: theme.heading,
                placeholder: theme.placeholder,
                buttonLabel: theme.buttonLabel,
                successMessage: theme.successMessage,
                errorMessage: theme.errorMessage,
                insertPosition: theme.insertPosition,
                inputBorderColor: theme.inputBorderColor,
                inputBorderRadius: theme.inputBorderRadius,
                inputHeight: theme.inputHeight,
                buttonBackground: theme.buttonBackground,
                buttonTextColor: theme.buttonTextColor,
                buttonRadius: theme.buttonRadius,
                fontSize: theme.fontSize,
                gap: theme.gap,
                successColor: theme.successColor,
                errorColor: theme.errorColor,
                showOnCartPage: theme.showOnCartPage,
                showInCartDrawer: theme.showInCartDrawer,
              }),
            }],
          },
        });
      }
    }
    if (widgetKey === "sticky_cart") {
      const shopRes = await admin.graphql(`#graphql
    query GetShopId { shop { id } }
  `);
      const shopData = await shopRes.json();
      const shopId = shopData?.data?.shop?.id;

      if (shopId) {
        await admin.graphql(`#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id namespace key value }
          userErrors { field message code }
        }
      }
    `, {
          variables: {
            metafields: [{
              ownerId: shopId,
              namespace: "custom",
              key: "sticky_cart_widget",
              type: "json",
              value: JSON.stringify({
                bgColor: theme.bgColor,
                buttonBg: theme.buttonBg,
                buttonText: theme.buttonText,
              }),
            }],
          },
        });
      }
    }
    // Sync the order notes theme to a shop metafield so the Function can read it.
    if (widgetKey === "announcement_bar_in_cart") {
      const shopRes = await admin.graphql(`#graphql
        query GetShopId { shop { id } }
      `);
      const shopData = await shopRes.json();
      const shopId = shopData?.data?.shop?.id;

      if (shopId) {
        await admin.graphql(`#graphql
          mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields { id namespace key value }
              userErrors { field message code }
            }
          }
        `, {
          variables: {
            metafields: [{
              ownerId: shopId,
              namespace: "custom",
              key: "announcement_bar_widget",
              type: "json",
              value: JSON.stringify({
                enableBar: theme.enableBar,
                messageCount: theme.messageCount,
                text1: theme.text1,
                text2: theme.text2,
                text3: theme.text3,
                text4: theme.text4,
                text5: theme.text5,
                enableScroll: theme.enableScroll,
                showHome: theme.showHome,
                showCart: theme.showCart,
                showCartDrawer: theme.showCartDrawer,
                bgColor: theme.bgColor,
                textColor: theme.textColor,
                margin: theme.margin,
                padding: theme.padding,
                homePosition: theme.homePosition,
                cartPosition: theme.cartPosition,
              }),
            }],
          },
        });
      }
    }
    if (widgetKey === "order_notes" && surface === UPSELL_SURFACES.CART) {
      const shopRes = await admin.graphql(`#graphql
    query GetShopId { shop { id } }
  `);
      const shopData = await shopRes.json();
      const shopId = shopData?.data?.shop?.id;

      if (shopId) {
        await admin.graphql(`#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id namespace key value }
          userErrors { field message code }
        }
      }
    `, {
          variables: {
            metafields: [{
              ownerId: shopId,
              namespace: "custom",
              key: "order_note_widget",
              type: "json",
              value: JSON.stringify({
                label: theme.label,
                placeholder: theme.placeholder,
                maxLength: theme.maxLength,
                required: theme.required,
                borderRadius: theme.borderRadius,
                gap: theme.gap,
                padding: theme.padding,
                showOnCartPage: theme.showOnCartPage,
                showInCartDrawer: theme.showInCartDrawer,
              }),
            }],
          },
        });
      }
    }

    return { ok: true };
  }

  // NEW — demo donation product creation
  if (intent === "create-demo-donation-product") {
    await requireFeatureAccess(session.shop, "DONATIONS");

    const { admin } = await authenticate.admin(request);

    const createRes = await admin.graphql(`#graphql
      mutation CreateDonationProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            featuredImage { url }
            variants(first: 1) { nodes { id } }
          }
          userErrors { field message }
        }
      }
    `, {
      variables: {
        product: {
          title: "Donation",
          productType: "Donation",
          status: "ACTIVE",
        },
      },
    });

    const createData = await createRes.json();
    const errors = createData?.data?.productCreate?.userErrors;
    if (errors?.length) {
      return { ok: false, error: errors.map((e) => e.message).join(", ") };
    }

    const product = createData?.data?.productCreate?.product;
    const variantId = product?.variants?.nodes?.[0]?.id;
    if (!product?.id || !variantId) {
      return { ok: false, error: "Product creation failed unexpectedly" };
    }

    // Step 2: configure the default variant — no shipping, not taxable, nominal price
    const updateRes = await admin.graphql(`#graphql
      mutation UpdateDonationVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants { id price taxable }
          userErrors { field message }
        }
      }
    `, {
      variables: {
        productId: product.id,
        variants: [{
          id: variantId,
          price: "1.00",
          taxable: false,
          inventoryItem: { requiresShipping: false, tracked: false },
        }],
      },
    });

    const updateData = await updateRes.json();
    const updateErrors = updateData?.data?.productVariantsBulkUpdate?.userErrors;
    if (updateErrors?.length) {
      return { ok: false, error: updateErrors.map((e) => e.message).join(", ") };
    }

    // NEW: publish so the product can be added to a checkout cart
    try {
      await publishProductToOnlineStore(admin, product.id);
    } catch (err) {
      console.warn("[donation] Could not publish donation product:", err.message);
    }




    return {
      ok: true,
      donationProduct: {
        productId: product.id,
        variantId,
        title: product.title,
        image: product.featuredImage?.url || null,
      },
    };
  }

  if (intent === "publish-donation-product") {
    await requireFeatureAccess(session.shop, "DONATIONS");
    const productId = String(formData.get("productId") || "");
    if (!productId) return { ok: false, error: "Missing productId" };

    try {
      await publishProductToOnlineStore(admin, productId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  return { ok: false, error: "Unknown intent" };
};


