import { useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getUpsellFunnel } from "../models/upsell.server";
import { OneClickUpsellWidget } from "../components/checkout-widgets/OneClickUpsellWidget";
import { DownsellFunnelWidget } from "../components/checkout-widgets/DownsellFunnelWidget";
import { AutomaticDiscountsWidget } from "../components/checkout-widgets/AutomaticDiscountsWidget";
import { TargetingRulesWidget } from "../components/checkout-widgets/TargetingRulesWidget";
import { ABTestingWidget } from "../components/checkout-widgets/ABTestingWidget";
import { ShippingMethodRulesWidget } from "../components/checkout-widgets/ShippingMethodRulesWidget";
import { PaymentMethodRulesWidget } from "../components/checkout-widgets/PaymentMethodRulesWidget";
import { DonationsWidget } from "../components/checkout-widgets/DonationsWidget";
import { TestimonialsWidget } from "../components/checkout-widgets/TestimonialsWidget";
import { RewardBarWidget } from "../components/checkout-widgets/RewardBarWidget";
import { WidgetManagePage } from "../components/widget-route-utils";
import { FrequentlyBoughtTogetherWidget } from
  "../components/checkout-widgets/FrequentlyBoughtTogetherWidget";
import { CustomerPersonalizedRecommendationWidget } from
  "../components/checkout-widgets/CustomerPersonalizedRecommendationWidget";
import { getUpsellWidget } from "../models/upsell.server";
import { requireFeatureAccess } from "../featureAccess.server";
const SURFACE = "CHECKOUT";

const WIDGET_DEFINITIONS = [
  /*{
    key: "one_click_upsell_at_checkout",
    title: "One-click Upsell at Checkout",
    description: "Offer a fast one-click upsell directly in the checkout extension area.",
  },
  {
    key: "automatic_discounts",
    title: "Automatic Discounts",
    description: "Show and manage discount-driven checkout offers with automatic application messaging.",
  },
  {
    key: "downsell_funnel",
    title: "Downsell Funnel",
    description: "Offer a lower-priced fallback if the primary checkout upsell is declined.",
  },
  {
    key: "targeting_rules",
    title: "Targeting Rules",
    description: "Control widget visibility based on UTM, order subtotal, country, and similar rules.",
  },
  {
    key: "ab_testing",
    title: "A/B Testing",
    description: "Run split tests for different checkout upsell experiences and offers.",
  },
  {
    key: "shipping_method_rules",
    title: "Shipping Method Rules",
    description: "Show or hide widgets based on selected shipping methods or delivery options.",
  },
  {
    key: "payment_method_rules",
    title: "Payment Method Rules",
    description: "Trigger checkout widgets conditionally based on the selected payment method.",
  },*/
  {
    key: "donations",
    title: "Donations",
    description: "Add a donation option in checkout so shoppers can support a cause.",
  },
  {
    key: "testimonials_social_proof",
    title: "Testimonials / Social Proof",
    description: "Reinforce confidence with testimonials, ratings, or trust-focused proof in checkout.",
  },
  {
    key: "reward_bar_progress_bar",
    title: "Reward Bar / Progress Bar",
    description: "Show progress toward a reward threshold such as free shipping, discount, or gift.",
  },
  {
    key: "frequently_bought_together",
    title: "Frequently Bought Together",
    description: "Show products frequently purchased together to increase average order value.",
  },
  {
    key: "customer_personalized_recommendation",
    title: "Customer Personalized Recommendation",
    description: "Show AI-driven product recommendations tailored to each customer.",
  },
];

const WIDGET_COMPONENTS = {
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
};

const widgetKeyFromSlug = (slug) => String(slug || "").replace(/-/g, "_");

function findWidgetDefinition(widgetKey) {
  return WIDGET_DEFINITIONS.find((widget) => widget.key === widgetKey) || null;
}

export const loader = async ({ request, params }) => {
  const { session, redirect } = await authenticate.admin(request);
  const funnel = await getUpsellFunnel(session.shop, params.id);

  if (!funnel) throw new Response("Not Found", { status: 404 });
  if (funnel.surface !== SURFACE) {
    return redirect(`/app/upsell/funnels/${params.id}/widgets`);
  }

  const widgetKey = widgetKeyFromSlug(params.widget);

const FEATURE_BY_WIDGET = {
  donations: "DONATIONS",
  testimonials_social_proof: "TESTIMONIALS",
  reward_bar_progress_bar: "FREE_GIFT",
  frequently_bought_together: "FBT_CHECKOUT",
};

const featureKey = FEATURE_BY_WIDGET[widgetKey];

if (featureKey) {
  await requireFeatureAccess(session.shop, featureKey);
}
  const definition = findWidgetDefinition(widgetKey);
  if (!definition) throw new Response("Not Found", { status: 404 });

  // READ saved theme from notes JSON
  const existingWidget = await getUpsellWidget(session.shop, params.id);
  let savedTheme = null;
  if (existingWidget?.notes) {
    try {
      const parsed = JSON.parse(existingWidget.notes);
      savedTheme = parsed?.widgets?.[widgetKey]?.theme ?? null;
    } catch {
      savedTheme = null;
    }
  }

  return {
    funnel,
    definition: { ...definition, savedTheme },  // ← attach savedTheme
  };
};

export default function CheckoutWidgetManageRoute() {
  const { funnel, definition } = useLoaderData();
  const WidgetComponent = WIDGET_COMPONENTS[definition.key];

  return (
    <WidgetManagePage
      funnel={funnel}
      definition={definition}
      WidgetComponent={WidgetComponent}
      backPath={`/app/upsell/funnels/${funnel.id}/widgets/checkout`}
      surfaceName="Checkout"
      backLabel="Back to checkout widgets"
    />
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);