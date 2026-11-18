// app/utils/widgets.js

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
import { FrequentlyBoughtTogetherWidget } from "../components/checkout-widgets/FrequentlyBoughtTogetherWidget";
import { CustomerPersonalizedRecommendationWidget } from "../components/checkout-widgets/CustomerPersonalizedRecommendationWidget";

export const WIDGET_DEFINITIONS = [
    {
        key: "one_click_upsell_at_checkout",
        legacyType: "BUNDLE",
        title: "One-click Upsell at Checkout",
        icon: "🛍️",
        description: "Offer a fast one-click upsell directly in the checkout extension area.",
        tone: "success",
        defaults: { displayMode: "INLINE", placement: "CHECKOUT_EXTENSION" },
    },
    {
        key: "automatic_discounts",
        legacyType: "OFFER",
        title: "Automatic Discounts",
        icon: "🏷️",
        description: "Show and manage discount-driven offers with automatic application messaging.",
        tone: "success",
        defaults: { displayMode: "BANNER", placement: "CHECKOUT_EXTENSION" },
    },
    {
        key: "downsell_funnel",
        legacyType: "OFFER",
        title: "Downsell Funnel",
        icon: "↘️",
        description: "Offer a lower-priced fallback if the primary upsell is declined.",
        tone: "warning",
        defaults: { displayMode: "INLINE", placement: "CHECKOUT_EXTENSION" },
    },
    {
        key: "targeting_rules",
        legacyType: "RULE",
        title: "Targeting Rules",
        icon: "🎯",
        description: "Control widget visibility based on UTM, order subtotal, country, and similar rules.",
        tone: "info",
        defaults: { displayMode: "BANNER", placement: "CHECKOUT_EXTENSION" },
    },
    {
        key: "ab_testing",
        legacyType: "RULE",
        title: "A/B Testing",
        icon: "🧪",
        description: "Run split tests for different upsell experiences and offers.",
        tone: "info",
        defaults: { displayMode: "BANNER", placement: "CHECKOUT_EXTENSION" },
    },
    {
        key: "shipping_method_rules",
        legacyType: "RULE",
        title: "Shipping Method Rules",
        icon: "🚚",
        description: "Show or hide widgets based on selected shipping methods.",
        tone: "info",
        defaults: { displayMode: "BANNER", placement: "CHECKOUT_EXTENSION" },
    },
    {
        key: "payment_method_rules",
        legacyType: "RULE",
        title: "Payment Method Rules",
        icon: "💳",
        description: "Trigger widgets conditionally based on the selected payment method.",
        tone: "info",
        defaults: { displayMode: "BANNER", placement: "CHECKOUT_EXTENSION" },
    },
    {
        key: "donations",
        legacyType: "ADDON",
        title: "Donations",
        icon: "❤️",
        description: "Add a donation option so shoppers can support a cause.",
        tone: "success",
        defaults: { displayMode: "INLINE", placement: "CHECKOUT_EXTENSION" },
    },
    {
        key: "testimonials_social_proof",
        legacyType: "BADGE",
        title: "Testimonials / Social Proof",
        icon: "⭐",
        description: "Reinforce confidence with testimonials and trust signals.",
        tone: "info",
        defaults: { displayMode: "BANNER", placement: "CHECKOUT_EXTENSION" },
    },
    {
        key: "reward_bar_progress_bar",
        legacyType: "GOAL",
        title: "Reward Bar / Progress Bar",
        icon: "📈",
        description: "Show progress toward a reward threshold like free shipping.",
        tone: "success",
        defaults: { displayMode: "BANNER", placement: "CHECKOUT_EXTENSION" },
    },
    {
        key: "frequently_bought_together",
        legacyType: "BUNDLE",
        title: "Frequently Bought Together",
        icon: "🔗",
        description: "Show products frequently purchased together.",
        tone: "success",
        defaults: { displayMode: "INLINE", placement: "CHECKOUT_EXTENSION" },
    },
    {
        key: "customer_personalized_recommendation",
        legacyType: "OFFER",
        title: "Customer Personalized Recommendation",
        icon: "🧠",
        description: "Show recommendations tailored to each customer's history.",
        tone: "info",
        defaults: { displayMode: "INLINE", placement: "CHECKOUT_EXTENSION" },
    },
];

export const WIDGET_COMPONENTS = {
    one_click_upsell_at_checkout: OneClickUpsellWidget,
    automatic_discounts: AutomaticDiscountsWidget,
    downsell_funnel: DownsellFunnelWidget,
    targeting_rules: TargetingRulesWidget,
    ab_testing: ABTestingWidget,
    shipping_method_rules: ShippingMethodRulesWidget,
    payment_method_rules: PaymentMethodRulesWidget,
    donations: DonationsWidget,
    testimonials_social_proof: TestimonialsWidget,
    reward_bar_progress_bar: RewardBarWidget,
    frequently_bought_together: FrequentlyBoughtTogetherWidget,
    customer_personalized_recommendation: CustomerPersonalizedRecommendationWidget,
};

// Helper used by both the hub and manage routes
export function findWidgetDefinition(widgetKey) {
    return WIDGET_DEFINITIONS.find((w) => w.key === widgetKey) ?? null;
}