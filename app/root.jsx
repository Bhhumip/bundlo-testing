import { useEffect, useState } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
  useRouteError,
} from "react-router";

// ── Shopify Polaris ──
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};


export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
export default function App() {
  const navigation = useNavigation();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const isRouteLoading =
    navigation.state === "loading" || navigation.state === "submitting";

  const showLoader = !hydrated || isRouteLoading;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap"
        />
        <Meta />
        <Links />
      </head>
      <body style={{ margin: 0 }}>
        <AppProvider i18n={enTranslations}>
          <div style={{ minHeight: "100vh", position: "relative" }}>
            {showLoader ? (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#ffffff",
                }}
              >
                <img
                  src="/loading.png"
                  alt="Loading"
                  style={{
                    width: "600px",
                    height: "600px",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
            ) : null}

            <div style={{ visibility: hydrated ? "visible" : "hidden" }}>
              <Outlet />
            </div>
          </div>
        </AppProvider>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}