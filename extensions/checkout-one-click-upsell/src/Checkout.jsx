import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {OneClickUpsell} from './components/OneClickUpsell.jsx';

// 1. Export the extension entry for purchase.checkout.block.render
export default function extension() {
  render(<Extension />, document.body);
}

function Extension() {
  // For now, use hard-coded defaults. You can later replace these
  // with values loaded from appMetafields, your backend, or another
  // configuration mechanism.
  const defaultSettings = {
    upsellTitle: 'Special offer: add this item to your order',
    upsellDescription:
      'Offer a one-click product add-on before the customer completes checkout.',
    upsellButtonLabel: 'Add this offer',
    // TODO: replace with a real variant GID or configuration-driven value
    offerVariantId: 'gid://shopify/ProductVariant/1234567890',
    discountText: 'Save 20% when you add this item now.',
  };

  return (
    <OneClickUpsell
      title={defaultSettings.upsellTitle}
      description={defaultSettings.upsellDescription}
      buttonLabel={defaultSettings.upsellButtonLabel}
      offerVariantId={defaultSettings.offerVariantId}
      discountText={defaultSettings.discountText}
      // Pass the global shopify object down so the component can call APIs
      shopify={shopify}
    />
  );
}