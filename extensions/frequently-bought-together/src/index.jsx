import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { FbtWidget } from "./components/FbtWidget.jsx";
import { LoadingSkeleton } from "./components/LoadingSkeleton.jsx";
import { DEFAULT_THEME } from "./config/theme.js";
import { APP_URL } from "../../constants.js";



function convertSavedThemeToExtensionTheme(savedTheme) {
  if (!savedTheme) return DEFAULT_THEME;

  const buttonVariantMap = {
    filled: "primary",
    outline: "secondary",
    plain: "plain",
  };

  const borderRadiusMap = {
    0: "none",
    6: "base",
    12: "large",
    20: "large",
    9999: "fullyRounded",
  };

  return {
    ...DEFAULT_THEME,
    titleFbt: savedTheme.titleFbt ?? DEFAULT_THEME.titleFbt,
    buttonVariant: buttonVariantMap[savedTheme.buttonVariant] ?? DEFAULT_THEME.buttonVariant,
    borderRadius: typeof savedTheme.borderRadius === "number"
      ? (borderRadiusMap[savedTheme.borderRadius] ?? DEFAULT_THEME.borderRadius)
      : DEFAULT_THEME.borderRadius,
    showPrice: savedTheme.showPrice !== undefined ? savedTheme.showPrice : DEFAULT_THEME.showPrice,
    showDivider: savedTheme.showDivider !== undefined ? savedTheme.showDivider : DEFAULT_THEME.showDivider,
    showBadge: savedTheme.showBadge !== undefined ? savedTheme.showBadge : DEFAULT_THEME.showBadge,
    layoutDirection: savedTheme.layoutDirection ?? "vertical",
    itemsPerRow: savedTheme.itemsPerRow ?? 2,
    gap: savedTheme.gap ?? "normal",
    padding: savedTheme.padding ?? 12,
    imageRatio: savedTheme.imageRatio ?? "1:1",
    cardAlignment: savedTheme.cardAlignment ?? "top",
    textAlignment: savedTheme.textAlignment ?? "left",
    //mobileLayout: savedTheme.mobileLayout ?? "stack",
    imageSize: savedTheme.imageSize ?? 52,
    imageRadius: savedTheme.imageRadius ?? 10,
    titleSize: savedTheme.titleSize ?? 13,
    // Widget-level positioning — outer align + max width (Position tab)
    alignment: savedTheme.alignment ?? "left",
    widgetMaxWidth: savedTheme.widgetMaxWidth ?? "100%",
    discountValue: savedTheme.discountValue ?? DEFAULT_THEME.discountValue,
  };
}

export default function () {
  render(<Extension />, document.body);
}

function Extension() {
  const { applyCartLinesChange } = shopify;

  console.log("Extension target:", shopify.extension?.target);
  console.log("API Version:", shopify.extension?.apiVersion);

  console.log("Shipping Address API:", shopify.shippingAddress);
  console.dir(shopify.shippingAddress);

  console.log("shopify.lines", shopify.lines);
  console.log("shopify.lines.subscribe", shopify.lines?.subscribe);

  useEffect(() => {
    console.log("Localization:", shopify.localization);
    console.dir(shopify.localization);

    console.log("Buyer Identity:", shopify.buyerIdentity);
    console.dir(shopify.buyerIdentity);

    if (shopify.lines.value.length > 0) {
      console.log("First line cost:", shopify.lines.value[0].cost);
      console.dir(shopify.lines.value[0].cost);

      console.log("Total Amount:", shopify.lines.value[0].cost?.totalAmount);
      console.dir(shopify.lines.value[0].cost?.totalAmount);
    }
  }, []);


  // fbtSections is the array of {anchorProductId, recommendations}
  const [fbtSections, setFbtSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showError, setShowError] = useState(false);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [cartProductsMap, setCartProductsMap] = useState({});
  const latestCountryCode = useRef(null);
  const lastContextKey = useRef(null);

  useEffect(() => {
    fetchFbt();
  }, []);

  useEffect(() => {
    if (!shopify.shippingAddress) return;

    console.log("Subscribing to shippingAddress...");

    const unsubscribe = shopify.shippingAddress.subscribe((address) => {
      latestCountryCode.current = address?.countryCode ?? null;

      console.log("Shipping address changed:", address);
      console.dir(address);

      console.log("Address countryCode:", latestCountryCode.current);

      console.log(
        "Localization country:",
        shopify.localization.country.value.isoCode
      );

      console.log(
        "Line currency after address change:",
        shopify.lines.value[0]?.cost?.totalAmount?.currencyCode
      );

      console.log(
        "Line amount after address change:",
        shopify.lines.value[0]?.cost?.totalAmount?.amount
      );
    });

    return unsubscribe;
  }, []);


  useEffect(() => {
    const unsubscribe = shopify.lines.subscribe((lines) => {
      console.log("Lines updated:", lines);

      const currency =
        lines[0]?.cost?.totalAmount?.currencyCode;

      const country = latestCountryCode.current;

      if (!country || !currency) return;

      const contextKey = `${country}:${currency}`;

      if (lastContextKey.current === contextKey) return;

      lastContextKey.current = contextKey;

      fetchFbt(country);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (showError) {
      const t = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showError]);

  async function fetchFbt(countryOverride) {
    console.log("🔥 fetchFbt called");

    console.log(
      "Country:",
      shopify.localization.country.value.isoCode
    );

    // 👇 YAHAN ADD KARO
    console.log(
      "Current line currency:",
      shopify.lines.value[0]?.cost?.totalAmount?.currencyCode
    );

    console.log(
      "Current line amount:",
      shopify.lines.value[0]?.cost?.totalAmount?.amount
    );

    setLoading(true);
    try {
      const currentLines = shopify.lines.value;
      const cartProductIds = currentLines
        .map((line) => line.merchandise?.product?.id)
        .filter(Boolean);


      if (!cartProductIds.length) {
        setThemeLoaded(true);
        setLoading(false);
        return;
      }
      // Build a map of cart productId → {title, image, price} for easy lookup later
      const map = {};
      for (const line of currentLines) {
        const productId = line.merchandise?.product?.id;
        if (productId) {
          map[productId] = {
            title: line.merchandise?.product?.title ?? "Your item",
            image:
              line.merchandise?.product?.featuredImage?.url ??
              line.merchandise?.image?.url ??
              null,
            price: line.cost?.totalAmount?.amount ?? null,
            currencyCode: line.cost?.totalAmount?.currencyCode ?? "USD",
            productId,
          };
        }
      }
      console.log("Cart Products Map:", map);
      setCartProductsMap(map);

      const storeDomain = shopify.shop.myshopifyDomain;
      const country =
        countryOverride ??
        shopify.localization.country.value.isoCode;

      console.log("Country being sent:", country);
      const params = new URLSearchParams({
        shop: storeDomain,
        productIds: cartProductIds.join(","),
        country,
      });
      const token = await shopify.sessionToken.get();
      console.log('[FBT] token present', !!token);
      const [fbtResponse, themeResponse] = await Promise.all([
        fetch(`${APP_URL}/api/frequently-bought-together?${params}`),
        fetch(`${APP_URL}/api/widget-theme?widgetKey=frequently_bought_together&surface=CHECKOUT`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ),
      ]);

      const fbtData = await fbtResponse.json().catch(() => ({}));
      console.log("FBT API Response:", fbtData);
      console.log(JSON.stringify(fbtData.fbt?.[0]?.recommendations?.[0], null, 2));
      const themeData = await themeResponse.json().catch(() => ({}));

      console.log("[THEME RESPONSE STATUS]", themeResponse.status);
      console.log("[THEME RESPONSE RAW]", themeData);
      console.log("[THEME RESPONSE THEME]", themeData?.theme);

      // console.log("[FBT] raw fbt data:", JSON.stringify(fbtData));
      //console.log("[FBT] theme data:", JSON.stringify(themeData));

      const convertedTheme = convertSavedThemeToExtensionTheme(themeData.theme);

      console.log(
        "[THEME API JSON]",
        JSON.stringify(themeData.theme, null, 2)
      );

      console.log(
        "[CONVERTED JSON]",
        JSON.stringify(convertedTheme, null, 2)
      );

      const fbtDiscount =
        fbtData?.fbt?.[0]?.recommendations?.[0]?.discountValue;

      console.log("[FBT API DISCOUNT]", fbtDiscount);

      const finalFbtTheme = {
        ...convertedTheme,
        ...(fbtDiscount != null ? { discountValue: fbtDiscount } : {}),
      };

      console.log(
        "[FINAL FBT THEME]",
        JSON.stringify(finalFbtTheme, null, 2)
      );

      setTheme(finalFbtTheme);
      setThemeLoaded(true);

      // fbtData.fbt is [{anchorProductId, recommendations}]
      setFbtSections(fbtData.fbt ?? []);

    } catch (err) {
      console.error("[FBT Extension] fetchFbt failed", err);
      setThemeLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToCart(variantIds, { onSuccess, onError } = {}) {
    try {
      const results = await Promise.all(
        variantIds.map((variantId) =>
          shopify.applyCartLinesChange({
            type: "addCartLine",
            merchandiseId: variantId,
            quantity: 1,
            attributes: [
              { key: "_upsell_widget", value: "frequently_bought_together" },
              { key: "_upsell_surface", value: "CHECKOUT" },
            ],
          })
        )
      );

      console.log("[UPSELL ATTR TEST] applyCartLinesChange results:", JSON.stringify(results, null, 2));
      const hasError = results.some((r) => r.type === "error");
      if (hasError) {
        setShowError(true);
        onError?.();
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setShowError(true);
      onError?.();
    }
  }



  if (loading || !themeLoaded) return <LoadingSkeleton theme={DEFAULT_THEME} />;
  if (fbtSections.length === 0) return null;

  return (
    <FbtWidget
      // fbtSections = [{anchorProductId, recommendations:[{variantId,title,image,price}]}]
      fbtSections={fbtSections}
      // cartProductsMap = {productId: {title, image, price, productId}}
      cartProductsMap={cartProductsMap}
      showError={showError}
      onAdd={handleAddToCart}
      theme={theme}
    />
  );
}