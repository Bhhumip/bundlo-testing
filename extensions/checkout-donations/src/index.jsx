import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect, useMemo } from "preact/hooks";
import { DonationWidget } from "./components/DonationWidget.jsx";
import { LoadingSkeleton } from "./components/LoadingSkeleton.jsx";
import { DEFAULT_THEME } from "./config/theme.js";
import { APP_URL } from "../../constants.js";

const DONATION_LINE_ATTR = "_donation_widget";
const DONATION_AMOUNT_ATTR = "_donation_amount";

function convertSavedThemeToExtensionTheme(savedTheme) {
  if (!savedTheme) return DEFAULT_THEME;

  const buttonVariantMap = { filled: "primary", outline: "secondary", plain: "plain" };

  return {
    ...DEFAULT_THEME,
    charityName: savedTheme.charityName || "",
    headline: savedTheme.headline || DEFAULT_THEME.headline,
    subheading: savedTheme.subheading || DEFAULT_THEME.subheading,
    ctaLabel: savedTheme.ctaLabel || DEFAULT_THEME.ctaLabel,
    impactMessage: savedTheme.impactMessage || "",
    learnMoreUrl: savedTheme.learnMoreUrl || "",
    donationTiers: Array.isArray(savedTheme.donationTiers) && savedTheme.donationTiers.length
      ? savedTheme.donationTiers
      : DEFAULT_THEME.donationTiers,
    allowCustomAmount: savedTheme.allowCustomAmount !== undefined
      ? savedTheme.allowCustomAmount : DEFAULT_THEME.allowCustomAmount,
    customMinAmount: savedTheme.customMinAmount ?? DEFAULT_THEME.customMinAmount,
    customMaxAmount: savedTheme.customMaxAmount ?? DEFAULT_THEME.customMaxAmount,
    allowRoundUp: savedTheme.allowRoundUp ?? DEFAULT_THEME.allowRoundUp,
    donationVariantId: savedTheme.donationVariantId || null, // see note below
    buttonVariant: buttonVariantMap[savedTheme.buttonVariant] ?? DEFAULT_THEME.buttonVariant,
    borderRadius: savedTheme.borderRadius || DEFAULT_THEME.borderRadius,
    gap: savedTheme.gap || DEFAULT_THEME.gap,
    padding: savedTheme.padding || DEFAULT_THEME.padding,
  };
}
console.log("[Donations] Extension mounted")
export default function () {
  render(<Extension />, document.body);
}

function Extension() {
  const { applyCartLinesChange } = shopify;

  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [showError, setShowError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetchTheme(); }, []);

  useEffect(() => {
    if (showError) {
      const t = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showError]);

  async function fetchTheme() {
    try {
      const token = await shopify.sessionToken.get();
      console.log("token present:", !!token, token?.length);

      const res = await fetch(
        `${APP_URL}/api/widget-theme?widgetKey=donations&surface=CHECKOUT`,
        { headers: { Authorization: `Bearer ${token}` } }   // backticks, not ' or "
      );

      const data = await res.json().catch(() => ({}));
      setTheme(convertSavedThemeToExtensionTheme(data.theme));
      console.log("[Donations] theme loaded:", data.theme)
    } catch (err) {
      // keep DEFAULT_THEME on failure
    } finally {
      setThemeLoaded(true);
    }
  }


  // Find an existing donation line, if the customer already added one
  const existingDonationLine = useMemo(() => {
    return shopify.lines.current.find((line) =>
      line.attributes?.some((a) => a.key === DONATION_LINE_ATTR && a.value === "donations")
    );
  }, [shopify.lines.current]);

  async function handleDonate(amount) {
    if (!theme.donationVariantId) {
      setShowError(true);
      return;
    }
    setBusy(true);
    try {
      const result = existingDonationLine
        ? await applyCartLinesChange({
          type: "updateCartLine",
          id: existingDonationLine.id,
          attributes: [
            { key: DONATION_LINE_ATTR, value: "donations" },
            { key: DONATION_AMOUNT_ATTR, value: amount.toFixed(2) },
          ],
        })
        : await applyCartLinesChange({
          type: "addCartLine",
          merchandiseId: theme.donationVariantId,
          quantity: 1,
          attributes: [
            { key: DONATION_LINE_ATTR, value: "donations" },
            { key: DONATION_AMOUNT_ATTR, value: amount.toFixed(2) },
          ],
        });

      if (result.type === "error") setShowError(true);
    } catch (err) {
      setShowError(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!existingDonationLine) return;
    setBusy(true);
    try {
      await applyCartLinesChange({ type: "removeCartLine", id: existingDonationLine.id, quantity: 1 });
    } catch (err) {
      setShowError(true);
    } finally {
      setBusy(false);
    }
  }

  if (!themeLoaded) return <LoadingSkeleton theme={DEFAULT_THEME} />;
  if (!theme.donationVariantId) return null; // not configured yet — fail closed, don't show a broken widget

  return (
    <DonationWidget
      theme={theme}
      busy={busy}
      showError={showError}
      existingAmount={
        existingDonationLine?.attributes?.find((a) => a.key === DONATION_AMOUNT_ATTR)?.value
      }
      onDonate={handleDonate}
      onRemove={handleRemove}
    />
  );
}