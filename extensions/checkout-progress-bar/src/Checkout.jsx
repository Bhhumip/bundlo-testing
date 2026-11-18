// extensions/checkout-progress-bar/src/Checkout.jsx

import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { APP_URL } from '../../constants.js';

//const SHOP_DOMAIN = 'app-dev-92467132981.myshopify.com';
export default function extension() {
  console.log('[ProgressBar] Extension mounted');
  render(<UpsellProgressBar />, document.body);
}

function UpsellProgressBar() {
  const [tiers, setTiers] = useState([]);
  const [ready, setReady] = useState(false);

  const [theme, setTheme] = useState({
    threshold: 100,
    title: 'Free shipping progress',
    progressMessage: 'Spend more to unlock free shipping',
    unlockedMessage: 'Free shipping unlocked!',
    showAmount: true,
    showThreshold: true,
  });

  useEffect(() => {
    const appUrl = APP_URL.replace(/\/$/, '');
    console.log('[ProgressBar] appUrl:', appUrl);
    const shop = shopify.shop.myshopifyDomain;   // e.g. upsell-9570.myshopify.com
    console.log('[ProgressBar] shop:', shop);
    if (!appUrl) { setReady(true); return; }

    const fetchUrl = `${appUrl}/api/upsell-tiers?shop=${encodeURIComponent(shop)}`;
    console.log('[ProgressBar] fetching:', fetchUrl);

    fetch(fetchUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        console.log('[ProgressBar] status:', res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log('[ProgressBar] data:', data);
        setTiers(Array.isArray(data.tiers) ? data.tiers : []);

        if (data.theme) {
          setTheme((prev) => ({
            ...prev,
            ...data.theme,
          }));
        }
        setReady(true);
      })
      .catch((err) => {
        console.error('[ProgressBar] fetch error:', err);
        setReady(true);
      });
  }, []);

  // ── Shopify APIs ─────────────────────────────────────────────────────────
  const subtotal = shopify.cost.subtotalAmount.value;
  const i18n = shopify.i18n;
  const currentAmount = Number(subtotal?.amount ?? 0);
  const currencyCode = subtotal?.currencyCode ?? 'USD';
  const lineItems = shopify.lines.current ?? [];
  const totalQty = lineItems.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
  const fmt = (v) => i18n.formatCurrency(v, { currency: currencyCode });

  if (!ready) {
    return (
      <s-section>
        <s-text>Loading offers…</s-text>
      </s-section>
    );
  }

  if (!tiers.length) return null;

  // ── tiers ─────────────────────────────────────────────────────────
  const enriched = tiers.map((tier) => {
    const threshold = Number(tier.threshold ?? 0);
    const requirementType = String(tier.requirementType ?? 'subtotal');
    const requirementLabel = String(tier.requirementLabel ?? '');
    const discountType = String(tier.discountType ?? 'none');
    const discountValue = Number(tier.discountValue ?? 0);
    const title = String(tier.title ?? '');
    const type = String(tier.type ?? '');
    const icon = String(tier.icon ?? '🏷️');

    const isQty = requirementType === 'quantity';
    const isFreeShip = discountType === 'free_shipping';
    const isFreeGift = discountType === 'free_gift';

    let nodeLabel = 'Offer';

    if (isQty) {
      const reqQty = parseInt(requirementLabel, 10) || 0;
      const discountedTotal = currentAmount * (1 - discountValue / 100);
      const perItemPrice = reqQty > 0 ? discountedTotal / reqQty : 0;

      nodeLabel =
        perItemPrice > 0
          ? `Buy ${reqQty} @${fmt(perItemPrice)}`
          : `Buy ${reqQty}`;

    } else if (isFreeShip) {
      nodeLabel = 'Free Ship';

    } else if (isFreeGift) {
      nodeLabel = 'Free Gift';

    } else if (discountType === 'percentage' && discountValue > 0) {
      nodeLabel = `${discountValue}% OFF`;

    } else if (discountType === 'fixed' && discountValue > 0) {
      nodeLabel = `${fmt(discountValue)} OFF`;
    }

    // ── banner ──────────────────
    let unlocked = false;
    let nodeAmount = '';
    let bannerMsg = '';

    if (isQty) {
      const reqQty = parseInt(requirementLabel, 10) || 0;
      const needed = Math.max(0, reqQty - totalQty);
      unlocked = needed === 0;
      nodeAmount = `${reqQty} items`;

      bannerMsg = unlocked
        ? `✅ ${nodeLabel} unlocked!`
        : `Add ${needed} more item${needed !== 1 ? 's' : ''} to get ${nodeLabel}`;

    } else {
      const diff = threshold === 0 ? 0 : Math.max(0, threshold - currentAmount);
      unlocked = diff === 0;
      nodeAmount = threshold === 0 ? 'Any' : fmt(threshold);

      if (isFreeShip) {
        const remainingAmount = fmt(diff);

        const progressMessage = theme.showAmount
          ? theme.progressMessage.replace(/\{amount\}/gi, remainingAmount)
          : theme.progressMessage.replace(/\{amount\}/gi, '').replace(/\s+/g, ' ').trim();

        bannerMsg = unlocked
          ? theme.unlockedMessage
          : progressMessage;
      } else if (isFreeGift) {
        bannerMsg = unlocked
          ? `🎁 Free gift unlocked!`
          : `Spend ${fmt(diff)} more to get a FREE gift`;
      } else {
        bannerMsg = unlocked
          ? `✅ ${nodeLabel} applied!`
          : `Spend ${fmt(diff)} more to get ${nodeLabel}`;
      }
    }

    return {
      id: String(tier.id ?? ''),
      threshold,
      requirementLabel,
      requirementType,
      discountType,
      discountValue,
      type,
      title,
      icon,
      unlocked,
      nodeLabel,
      nodeAmount,
      isQty,
      isFreeShip,
      isFreeGift,
      bannerMsg,
    };
  });

  const nextLocked = enriched.find((t) => !t.unlocked);
  const highestUnlocked = [...enriched].reverse().find((t) => t.unlocked);
  const allUnlocked = enriched.every((t) => t.unlocked);

  // journeyTiers sorted ascending by their "goal" value (threshold or qty),
  // since we render them left-to-right in that order.
  const journeyTiers = enriched
    .filter((t) => (t.isQty ? (parseInt(t.requirementLabel, 10) || 0) > 0 : t.threshold > 0))
    .slice()
    .sort((a, b) => {
      const aGoal = a.isQty ? parseInt(a.requirementLabel, 10) || 0 : a.threshold;
      const bGoal = b.isQty ? parseInt(b.requirementLabel, 10) || 0 : b.threshold;
      return aGoal - bGoal;
    });

  // ── proportional layout via CSS grid (no unsupported inline positioning) ──
  // Build a gridTemplateColumns string of alternating "gap" and "marker"
  // tracks: gap0 auto gap1 auto gap2 auto ...
  // Gaps are sized in `fr` units proportional to the real distance between
  // tier goals, so markers land at roughly the right spot along the bar
  // even when tiers aren't evenly priced.
  function goalOf(t) {
    return t.isQty ? parseInt(t.requirementLabel, 10) || 0 : t.threshold;
  }

  const maxGoal = journeyTiers.length
    ? Math.max(...journeyTiers.map(goalOf))
    : 0;

  let templateColumns = '';
  let prevGoal = 0;
  journeyTiers.forEach((t) => {
    const goal = goalOf(t);
    const gapFr = Math.max(0.3, goal - prevGoal); // minimum gap so labels don't collide
    templateColumns += `${gapFr}fr auto `;
    prevGoal = goal;
  });
  templateColumns = templateColumns.trim() || '1fr';

  // Overall progress: how far current spend/qty is toward the highest goal.
  let progressPercent = 0;
  if (maxGoal > 0) {
    // Use subtotal progress by default; if the highest tier is qty-based,
    // use quantity instead.
    const highestTier = journeyTiers[journeyTiers.length - 1];
    const currentValue = highestTier?.isQty ? totalQty : currentAmount;
    progressPercent = Math.min(100, (currentValue / maxGoal) * 100);
  }

  const freeShippingTier = enriched.find((tier) => tier.isFreeShip);


  const defaultProgressMessage = 'Spend {amount} more to unlock free shipping';

  const getThemeMessage = (template, remainingAmount) =>
    String(template ?? '')
      .replace(/\{amount\}/gi, remainingAmount)
      .replace(/\{current\}/gi, shopify.i18n.formatCurrency(currentAmount))
      .replace(
        /\{goal\}/gi,
        shopify.i18n.formatCurrency(
          Number(freeShippingTier?.threshold ?? theme.threshold ?? 100)
        )
      );
  const remainingForShipping = Math.max(
    0,
    Number(freeShippingTier?.threshold ?? theme.threshold ?? 100) - currentAmount
  );

  const defaultBannerText = allUnlocked
    ? theme.unlockedMessage
    : (freeShippingTier?.bannerMsg ?? nextLocked?.bannerMsg ?? '');

  const bannerText = allUnlocked
    ? theme.unlockedMessage
    : freeShippingTier
      ? getThemeMessage(
        theme.progressMessage || defaultProgressMessage,
        shopify.i18n.formatCurrency(remainingForShipping)
      )
      : defaultBannerText;


  return (
    <s-section>
      <s-stack gap="base">

        {/* banner */}
        {bannerText ? (
          <s-banner tone={allUnlocked ? 'success' : 'warning'}>
            {bannerText}
          </s-banner>
        ) : null}

        {/* Tier icons + labels, proportionally spaced via grid */}
        <s-grid gridTemplateColumns={templateColumns} gap="none">
          {journeyTiers.map((tier) => (
            <>
              <s-box key={`${tier.id}-gap-icon`} />
              <s-stack key={`${tier.id}-icon`} gap="none" align="center">
                <s-text
                  tone={tier.unlocked ? 'success' : 'subdued'}
                  type={tier.unlocked ? 'strong' : 'auto'}
                >
                  {tier.unlocked ? '✅' : tier.icon}
                </s-text>
                <s-text
                  tone={tier.unlocked ? 'success' : 'auto'}
                  type={tier.unlocked ? 'strong' : 'auto'}
                  size="small"
                >
                  {tier.nodeLabel}
                </s-text>
              </s-stack>
            </>
          ))}
        </s-grid>

        {/* Progress bar */}
        <s-progress value={progressPercent / 100} />

        {/* Amount labels, same proportional grid */}
        {theme.showThreshold ? (
          <s-grid gridTemplateColumns={templateColumns} gap="none">
            {journeyTiers.map((tier) => (
              <>
                <s-box key={`${tier.id}-gap-label`} />
                <s-text
                  key={`${tier.id}-label`}
                  tone={tier.unlocked ? 'success' : 'subdued'}
                  size="small"
                >
                  {tier.nodeAmount}
                </s-text>
              </>
            ))}
          </s-grid>


        ) : null}

        {highestUnlocked && !allUnlocked ? (
          <s-text tone="success" size="small">
            {`✅ ${highestUnlocked.title} applied`}
          </s-text>
        ) : null}

      </s-stack>
    </s-section>
  );
}



