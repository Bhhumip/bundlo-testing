import { BuyAgainWidget } from "./BuyAgainWidget";
import { PersonalizedRecommendationsWidget } from "./PersonalizedRecommendationsWidget";
import { ReplenishmentReminderWidget } from "./ReplenishmentReminderWidget";
import { SubscriptionUpgradeWidget } from "./SubscriptionUpgradeWidget";
import { LoyaltyRewardsReminderWidget } from "./LoyaltyRewardsReminderWidget";
import { WishlistToCartWidget } from "./WishlistToCartWidget";
import { ReorderWithDiscountWidget } from "./ReorderWithDiscountWidget";

export const ACCOUNT_WIDGET_COMPONENTS = {
  buy_again: BuyAgainWidget,
  personalized_recommendations: PersonalizedRecommendationsWidget,
  replenishment_reminder: ReplenishmentReminderWidget,
  subscription_upgrade: SubscriptionUpgradeWidget,
  loyalty_rewards_reminder: LoyaltyRewardsReminderWidget,
  wishlist_to_cart: WishlistToCartWidget,
  reorder_with_discount: ReorderWithDiscountWidget,
};
