import { WidgetPlaceholderPage } from "../shared/WidgetPlaceholderPage";

export function WishlistToCartWidget({ funnel, definition }) {
  return (
    <WidgetPlaceholderPage
      funnel={funnel}
      definition={definition}
      extraText="Placeholder for wishlist to cart widget configuration."
    />
  );
}
