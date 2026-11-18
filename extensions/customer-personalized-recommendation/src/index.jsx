import "@shopify/ui-extensions/preact";
import { render, h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { LoadingSkeleton } from "./components/LoadingSkeleton.jsx";
import { RecommendationsWidget } from "./components/RecommendationsWidget.jsx";
import { BundleWidget } from "./components/BundleWidget.jsx";
import { DEFAULT_THEME } from "./config/theme.js";
import { APP_URL } from "../../constants.js";

export default function () {
  //console.log("[Rec] Extension mounted");
  render(h(Extension, null), document.body);
}

function Extension() {
  const { applyCartLinesChange, i18n, buyerIdentity } = shopify;

  const [bundles, setBundles] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showError, setShowError] = useState(false);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const latestCountryCode = useRef(null);
  const customerIdRef = useRef(null);

  useEffect(() => {
    let resolvedCustomerId = null;

    try {
      resolvedCustomerId =
        buyerIdentity?.customer?.current?.id ??
        buyerIdentity?.customer?.v?.id ??
        null;
    } catch (e) {
      resolvedCustomerId = null;
    }
    customerIdRef.current = resolvedCustomerId;

    fetchData(resolvedCustomerId);

  }, []);

  useEffect(() => {
    const unsubscribe = shopify.shippingAddress.subscribe((address) => {
      latestCountryCode.current = address?.countryCode ?? null;
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = shopify.lines.subscribe((lines) => {
      const country = latestCountryCode.current;
      if (!country) return;
      fetchData(customerIdRef.current, country);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (showError) {
      const t = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showError]);

  async function fetchData(resolvedCustomerId = null, country = "US") {
    setLoading(true);
    try {
      const cartProductIds = shopify.lines.value
        .map((line) => line.merchandise?.product?.id)
        .filter(Boolean);


      //.log("[Rec] cartLines:", shopify.lines.value?.length);
      //.log("[Rec] cartProductIds:", cartProductIds);
      if (!cartProductIds.length) { setLoading(false); return; }

      const storeDomain = shopify.shop.myshopifyDomain;
      const idsParam = encodeURIComponent(cartProductIds.join(","));

      // ── Fetch recommendations AND theme at the same time ───────────────────
      const params = new URLSearchParams({
        shop: storeDomain,
        productIds: cartProductIds.join(","),
        country
      });
      const token = await shopify.sessionToken.get();
      const [recResponse, themeResponse] = await Promise.all([
        fetch(`${APP_URL}/api/recommendations?${params}`),
        fetch(`${APP_URL}/api/widget-theme?widgetKey=customer_personalized_recommendation&surface=CHECKOUT`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ),
      ]);
      const data = await recResponse.json().catch(() => ({}));
      const themeData = await themeResponse.json().catch(() => ({}));

      //.log("[Rec] recResponse status:", recResponse.status);
      //.log("[Rec] themeResponse status:", themeResponse.status);
      //.log("[Rec] raw data:", JSON.stringify(data));
      //.log("[Rec] bundles count:", (data.bundles ?? []).length);
      //.log("[Rec] recommendations count:", (data.recommendations ?? []).length);


      // ── Apply saved theme ──────────────────────────────────────────────────
      //.log("[Rec Theme] received:", JSON.stringify(themeData));
      if (themeData.theme) {
        const merged = { ...DEFAULT_THEME, ...themeData.theme };
        //.log("[Rec Theme] applying widgetBackground:", merged.widgetBackground);
        setTheme(merged);
      } else {
        //.log("[Rec Theme] no saved theme, using default");
      }
      setThemeLoaded(true);

      const fetchedBundles = data.bundles ?? [];
      const fetchedRecs = data.recommendations ?? [];

      setBundles(fetchedBundles);
      setRecommendations(fetchedRecs);

      if (fetchedBundles.length === 0 && fetchedRecs.length === 0) {
        await fetchFallback(storeDomain, cartProductIds, resolvedCustomerId, country);
      }

    } catch (err) {
      //.error("[Bundlo] fetchData failed", err);
      setThemeLoaded(true);  // ← don't block render on error
    } finally {
      setLoading(false);
    }
  }

  async function fetchFallback(storeDomain, cartProductIds, resolvedCustomerId, country) {
    if (resolvedCustomerId) {
      await fetchOrderHistoryRecs(storeDomain, cartProductIds, country);
    } else {
      await fetchBestSellers(storeDomain, cartProductIds, country);
    }

  }
  async function fetchOrderHistoryRecs(storeDomain, cartProductIds, country) {
    try {
      const params = new URLSearchParams({
        productIds: cartProductIds.join(","),
        country,
      });
      const token = await shopify.sessionToken.get();
      const response = await fetch(
        `${APP_URL}/api/order-history-recommendations?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json().catch(() => ({}));
      const recs = data.recommendations ?? [];
      if (recs.length > 0) {
        setOrderHistory(recs);
      } else {
        await fetchBestSellers(storeDomain, cartProductIds, country);
      }
    } catch (err) {
      //.error("[Bundlo] fetchOrderHistoryRecs failed", err);
      await fetchBestSellers(storeDomain, cartProductIds, country);
    }
  }

  async function fetchBestSellers(storeDomain, cartProductIds, country) {
    try {
      const params = new URLSearchParams({
        shop: storeDomain,
        productIds: cartProductIds.join(","),
        country,
      });
      const response = await fetch(`${APP_URL}/api/bestsellers?${params}`);
      const data = await response.json().catch(() => ({}));
      console.log("ORDER HISTORY API", data);
      setBestSellers(data.bestsellers ?? []);
    } catch (err) {
      //.error("[Bundlo] fetchBestSellers failed", err);
    }
  }
  async function handleAddToCart(variantId, { onSuccess, onError } = {}) {
    if (!variantId) { onError?.(); return; }

    const result = await applyCartLinesChange({
      type: "addCartLine",
      merchandiseId: variantId,
      quantity: 1,
      attributes: [
        { key: "_upsell_widget", value: "customer_personalized_recommendation" },
        { key: "_upsell_surface", value: "CHECKOUT" },//attribute to track which surface the upsell was added from
      ],
    });
    //console.log("[UPSELL ATTR TEST - REC] applyCartLinesChange result:", JSON.stringify(result, null, 2));

    if (result.type === "error") {
      setShowError(true);
      onError?.();
    } else {
      onSuccess?.()
    }
  }


  async function handleAddBundle(bundle, { onSuccess, onError } = {}) {
    try {
      // STEP 1 — add the bundle product
      const addResult = await applyCartLinesChange({
        type: "addCartLine",
        merchandiseId: bundle.shopifyVariantId,
        quantity: 1,
      });

      if (addResult.type === "error") {
        setShowError(true);
        onError?.();
        return;
      }

      // STEP 2 — collect component product IDs AND variant IDs
      const bundleProductIds = new Set(
        bundle.components.map(c => c.productId).filter(Boolean)
      );
      const bundleVariantIds = new Set(
        bundle.components.map(c => c.variantId).filter(Boolean)
      );

      //.log("[Bundle] Component Product IDs:", [...bundleProductIds]);
      //.log("[Bundle] Component Variant IDs:", [...bundleVariantIds]);

      // STEP 3 — match by product ID OR variant ID
      const linesToRemove = shopify.lines.value.filter(line => {
        const pid = line.merchandise?.product?.id;
        const vid = line.merchandise?.id;
        return bundleProductIds.has(pid) || bundleVariantIds.has(vid);
      });

      //.log("[Bundle] Lines to remove:", linesToRemove);

      // STEP 4 — remove them
      for (const line of linesToRemove) {
        await applyCartLinesChange({
          type: "removeCartLine",
          id: line.id,
          quantity: line.quantity,
        });
      }

      onSuccess?.();
    } catch (err) {
      //.error(err);
      onError?.();
    }
  }
  const widgetProps = { showError, onAdd: handleAddToCart, theme };

  // Wait for both data and theme before rendering
  if (loading || !themeLoaded) return <LoadingSkeleton theme={DEFAULT_THEME} />;

  //.log("[Rec] rendering with widgetBackground:", theme.widgetBackground);
  //.log("[Rec] theme.title:", theme.title);
  //.log("[Rec] full theme:", JSON.stringify(theme));

  //.log("[Rec] RENDER STATE — bundles:", bundles.length,
  //"recs:", recommendations.length,
  //  "orderHistory:", orderHistory.length,
  // "bestSellers:", bestSellers.length,
  // "loading:", loading,
  //  "themeLoaded:", themeLoaded);
  if (bundles.length > 0) return (
    <BundleWidget
      bundles={bundles}
      i18n={i18n}
      showError={showError}
      onAdd={handleAddBundle}
      theme={theme}
    />
  );

  if (recommendations.length > 0) return (
    <RecommendationsWidget
      recommendations={recommendations}
      title={theme.titleRecommendations || "You may also like"}
      showError={showError}
      onAdd={handleAddToCart}
      theme={theme}
    />
  );

  if (orderHistory.length > 0) return (
    <RecommendationsWidget
      recommendations={orderHistory}
      title={theme.titleOrderHistory || "Buy again"}
      showError={showError}
      onAdd={handleAddToCart}
      theme={theme}
    />
  );

  if (bestSellers.length > 0) return (
    <RecommendationsWidget
      recommendations={bestSellers}
      title={theme.titleBestSellers || "Popular right now"}
      showError={showError}
      onAdd={handleAddToCart}
      theme={theme}
    />
  );
  return null;
}