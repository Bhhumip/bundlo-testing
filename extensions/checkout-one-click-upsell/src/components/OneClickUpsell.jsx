import {useState, useCallback} from 'preact/hooks';

/**
 * OneClickUpsell - A one-click upsell component for checkout
 * Displays a product offer with acceptance/rejection in a banner
 *
 * @param {Object} props
 * @param {string} props.title - Banner heading
 * @param {string} props.description - Offer description text
 * @param {string} props.buttonLabel - Call-to-action button text
 * @param {string} props.offerVariantId - Product variant ID to upsell
 * @param {string} [props.discountText] - Optional discount/promotion text
 * @param {any}    props.shopify - Checkout API object (injected by your entry)
 */
export function OneClickUpsell({
  title,
  description,
  buttonLabel,
  offerVariantId,
  discountText,
  shopify,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUpsellAccepted, setIsUpsellAccepted] = useState(false);
  const [error, setError] = useState('');

  const variantId = offerVariantId?.trim();

  // Read capability from cart instructions so we don't call a forbidden API
  const canSetCartMetafields =
    shopify.instructions?.value?.metafields?.canSetCartMetafields ?? true;

  const isDisabled =
    !variantId || isLoading || isUpsellAccepted || !canSetCartMetafields;

  const handleAccept = useCallback(async () => {
    setError('');

    if (!variantId) {
      setError(shopify.i18n.translate('oneClickUpsell.noOfferConfigured'));
      return;
    }

    if (!canSetCartMetafields) {
      setError(shopify.i18n.translate('oneClickUpsell.metafieldsNotAllowed'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await shopify.applyMetafieldChange({
        type: 'updateCartMetafield',
        metafield: {
          namespace: '$app',
          key: 'checkoutUpsellAccepted',
          value: 'true',
          type: 'boolean',
        },
      });

      if (result.type === 'success') {
        setIsUpsellAccepted(true);
      } else {
        console.error('OneClickUpsell metafield error:', result);
        setError(
          shopify.i18n.translate('oneClickUpsell.checkoutUpsellError'),
        );
      }
    } catch (caughtError) {
      console.error('OneClickUpsell error:', caughtError);
      setError(shopify.i18n.translate('oneClickUpsell.checkoutUpsellError'));
    } finally {
      setIsLoading(false);
    }
  }, [variantId, canSetCartMetafields, shopify]);

  return (
    <s-banner heading={title} tone={isUpsellAccepted ? 'success' : 'info'}>
      <s-stack gap="base">
        <s-text>{description}</s-text>

        {discountText && <s-text>{discountText}</s-text>}

        <s-button onClick={handleAccept} disabled={isDisabled}>
          {isUpsellAccepted
            ? shopify.i18n.translate('oneClickUpsell.upsellAdded')
            : buttonLabel}
        </s-button>

        {error && <s-text tone="critical">{error}</s-text>}

        {!canSetCartMetafields && !error && (
          <s-text>
            {shopify.i18n.translate('oneClickUpsell.metafieldsUnavailable')}
          </s-text>
        )}
      </s-stack>
    </s-banner>
  );
}
