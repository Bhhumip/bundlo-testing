import { useEffect, useState } from "react";
import {
  Link,
  Outlet,
  useLoaderData,
  useNavigation,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { shopPlans } from "../models/shopPlans.server";
import { enforceRevenueGracePeriod } from "../models/bundle.server";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  await enforceRevenueGracePeriod(session.shop, admin);

  await shopPlans.notifyPlanExpiry(session.shop);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
}

function GlobalLoadingOverlay() {
  return (
    <>
      <style>
        {`
          @keyframes global-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(1.5px)",
          WebkitBackdropFilter: "blur(1.5px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              border: "3px solid #e5e7eb",
              borderTop: "3px solid #111827",
              borderRadius: "999px",
              animation: "global-spin 0.8s linear infinite",
            }}
          />

          <span
            style={{
              fontSize: "14px",
              color: "#4b5563",
              fontWeight: 500,
              letterSpacing: "0.2px",
            }}
          >
            Loading...
          </span>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const { apiKey } = useLoaderData();
  const navigation = useNavigation();

  const [showSpinner, setShowSpinner] = useState(false);

  const isNavigating =
    navigation.state === "loading" ||
    navigation.state === "submitting";

  useEffect(() => {
    let timer;

    if (isNavigating) {
      timer = setTimeout(() => {
        setShowSpinner(true);
      }, 250);
    } else {
      setShowSpinner(false);
    }

    return () => clearTimeout(timer);
  }, [isNavigating]);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <NavMenu>
        <Link to="/app/dashboard">Dashboard</Link>

        <Link to="/app/analytics">Analytics</Link>

        <Link to="/app/bundles/index">
          Bundles
        </Link>

        <Link to="/app/upsell/funnels">
          Upsell
        </Link>
        <Link to="/app/Customize">
          Customize
        </Link>

        <Link to="/app/Billing">
          Billing
        </Link>

        <Link to="/app/support">
          Support
        </Link>

      </NavMenu>

      {showSpinner && <GlobalLoadingOverlay />}

      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};