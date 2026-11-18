// app/routes/app._index.jsx
// Dashboard — bundle type selector + stats + recent bundles.
// Volume and Mix & Match are now enabled.

import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getCurrentAppPlan } from "../featureAccess.server";
import { canAccessFeature, FEATURE_MIN_PLAN } from "../plans";
import { canShopAccessFeature } from "../featureAccess.server";
import { listBundles, getBundleStats, deleteBundle, archiveBundle, activateBundle } from "../models/bundle.server";
import { useState, useCallback, useMemo } from "react";

import fixedBundleImg from "../assets/fixed-bundle.png";
import mixMatchImg from "../assets/mix-match.png";
import volumeBundleImg from "../assets/volume-bundle.png";
import byobImg from "../assets/byob.png";
import multivariantImg from "../assets/multivariant.png";


export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const featureAccess = {
    FIXED_BUNDLE: await canShopAccessFeature(session.shop, "FIXED_BUNDLE"),
    VOLUME_BUNDLE: await canShopAccessFeature(session.shop, "VOLUME_BUNDLE"),
  MIX_MATCH: await canShopAccessFeature(session.shop, "MIX_MATCH"),
  BYOB: await canShopAccessFeature(session.shop, "BYOB"),
  MULTIVARIANT: await canShopAccessFeature(session.shop, "MULTIVARIANT"),
};

  const [{ bundles }, stats] = await Promise.all([
    listBundles(session.shop, { take: 5 }),
    getBundleStats(session.shop),
  ]);
  const currencyResponse = await admin.graphql(
    `query GetShopCurrency{
    shop{currencyCode
    }}`
  )

  const currencyData = await currencyResponse.json();
  const shopCurrency = currencyData.data.shop.currencyCode;
  const paidAppPlan = await getCurrentAppPlan(session.shop);
  return { bundles, stats, shopCurrency, paidAppPlan, featureAccess };
};

export const action = async ({ request }) => {

  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const bundleId = formData.get("bundleId");


  if (intent === "delete") {
    const bundleId = formData.get("bundleId");
    await deleteBundle(session.shop, admin, bundleId);
    return null;
  }

  if (intent === "archive") {
    await archiveBundle(bundleId, session.shop, admin);
    return null;
  }

  if (intent === "unarchive") {
    await activateBundle(bundleId, session.shop, admin);
    return null;
  }

  return null;
};

const BUNDLE_TYPES = [
  {
    type: "FIXED",
    feature: "FIXED_BUNDLE",
    title: "Fixed bundle",
    image: fixedBundleImg,
    description:
      "Group specific products together at a set discount.Perfect for starter kits, gift sets, and carefully curated combinations.",
    badge: "Available",
    badgeTone: "success",
    route: "/app/bundles/new",
    available: true,
    examples: ["Examples:", "Skincare starter kit", "Coffee + mug combo", "Tool set"],
  },
  {
    type: "MIX_MATCH",
    feature: "MIX_MATCH",
    title: "Mix & match",
    image: mixMatchImg,
    description:
      "Give customers the freedom to build their own bundle by choosing N products from a curated collection.Perfect for subscription boxes, sample kits, and personalized gifting.",
    badge: "Available",
    badgeTone: "success",
    route: "/app/bundles/new/mix-match",
    available: true,
    examples: ["Pick any 3 fragrances", "Build your snack box", "Choose 5 supplements"],
  },
  {
    type: "VOLUME",
    feature: "VOLUME_BUNDLE",
    title: "Volume Bundle",
    image: volumeBundleImg,
    description:
      "Set quantity breaks like buy 2 save 5%, buy 3 save 10%, or buy 5 save 15%",
    badge: "Available",
    badgeTone: "success",
    route: "/app/bundles/new/volume",
    available: true,
    examples: ["Buy 3 get 10% off", "Bulk pricing tiers", "Quantity breaks"],
  },
  {
    type: "BYOB",
    feature: "BYOB",
    title: "Build a box",
    image: byobImg,
    description:
      "Perfect for custom gift boxes, subscription boxes, and DIY care packages. Ideal for driving higher average order value.",
    badge: "Available",
    badgeTone: "success",
    route: "/app/byob/new",
    available: true,
    examples: ["Custom gift box", "Monthly subscription box", "DIY care package"],
  },
  {
    type: "MULTIVARIANT",
    feature: "MULTIVARIANT",
    title: "Multivariant bundle",
    image: multivariantImg,
    description:
      "Bundle a single product's variants or combine multiple products with shared options like colour and size.",
    badge: "New",
    badgeTone: "info",
    route: "/app/bundles/multivariant",
    available: true,
    examples: ["Examples:", "Colour matched sets", "Size-run packs", "Single product variants"],
  },
];

function StatBadge({ value, type }) {
  const styles = {
    up: { background: "#dcfce7", color: "#16a34a" },
    down: { background: "#fee2e2", color: "#dc2626" },
    neutral: { background: "#fef9c3", color: "#ca8a04" },
  };
  const icons = { up: "↑", down: "↓", neutral: "" };
  const s = styles[type] ?? styles.neutral;

  return (
    <span
      style={{
        ...s,
        borderRadius: "999px",
        padding: "2px 8px",
        fontSize: "11px",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {icons[type] ? <span>{icons[type]}</span> : null}
      <span>{value}</span>
    </span>
  );
}

const shellCardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

const statCardStyle = {
  ...shellCardStyle,
  padding: 18,
  minHeight: 118,
};

function getBadgeMeta(delta) {
  if (delta == null) return null;
  if (delta > 0) return { text: `${Math.abs(delta)}%`, tone: "success", icon: "↑" };
  if (delta < 0) return { text: `${Math.abs(delta)}%`, tone: "critical", icon: "↓" };
  return { text: "0%", tone: "warning", icon: "" };
}

export default function AppIndex() {
  const { bundles, stats, shopCurrency, paidAppPlan, featureAccess } = useLoaderData();


  const navigate = useNavigate();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteClick = (bundleId) => {
    setDeletingId(bundleId);
    shopify.modal.show("delete-bundle-modal");
  };

  /* Archieve State*/
  const [archivingId, setArchivingId] = useState(null);
  const [archivingTitle, setArchivingTitle] = useState("");

  /*Pending status state to disable buttons while action is processing*/
  const [pendingStatus, setPendingStatus] = useState({});

  const handleArchiveClick = useCallback(
    (bundleId, bundleTitle) => {
      setArchivingId(bundleId);
      setArchivingTitle(bundleTitle);
      shopify.modal.show("archive-bundle-modal");
    },
    [shopify],
  );

  const confirmArchive = useCallback(() => {
    setPendingStatus((prev) => ({ ...prev, [archivingId]: "ARCHIVED" }));

    fetcher.submit({ intent: "archive", bundleId: archivingId }, { method: "POST" });
    shopify.modal.hide("archive-bundle-modal");
    setArchivingId(null);
    setArchivingTitle(null);
  }, [fetcher, archivingId, shopify]);

  /*Unarchieve State*/
  const [unarchivingId, setUnarchivingId] = useState(null);
  const [unarchivingTitle, setUnarchivingTitle] = useState("");

  const handleUnarchiveClick = useCallback(
    (bundleId, bundleTitle) => {
      setUnarchivingId(bundleId);
      setUnarchivingTitle(bundleTitle);
      shopify.modal.show("unarchive-bundle-modal");
    },
    [shopify],
  );

  const confirmUnarchive = useCallback(() => {
    setPendingStatus((prev) => ({ ...prev, [unarchivingId]: "ACTIVE" }));
    fetcher.submit({ intent: "unarchive", bundleId: unarchivingId }, { method: "POST" });
    shopify.modal.hide("unarchive-bundle-modal");
    setUnarchivingId(null);
    setUnarchivingTitle("");
  }, [fetcher, unarchivingId, shopify]);

  /* Delete Confirmation */
  const confirmDelete = () => {
    fetcher.submit({ intent: "delete", bundleId: deletingId }, { method: "POST" });
    shopify.modal.hide("delete-bundle-modal");
    setDeletingId(null);
  };

  const revenueDisplay = stats.totalRevenue.toLocaleString("en-US", {
    style: "currency",
    currency: shopCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function discountLabel(bundle) {
    if (bundle.type === "VOLUME") return "Volume discount";
    if (bundle.discountType === "PERCENTAGE") return `${bundle.discountValue}% off`;
    if (bundle.discountType === "FIXED_AMOUNT") return `$${bundle.discountValue} off`;
    if (bundle.fixedPrice != null) return `$${bundle.fixedPrice} fixed`;
    return "No discount";
  }

  function statusLabel(status) {
    if (status === "ACTIVE") return "Active";
    if (status === "DRAFT") return "Draft";
    if (status === "ARCHIVED") return "Archived";
    return status;
  }

  function typeLabel(type) {
    if (type === "FIXED") return "Fixed";
    if (type === "MIX_MATCH") return "Mix & match";
    if (type === "VOLUME") return "Volume";
    return type;
  }

  const overviewStats = useMemo(
    () => [
      {
        label: "Total bundles",
        value: stats.totalBundles,
        helper: "All bundles created in this shop",
        accent: "#b45309",
        bg: "linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)",
        badgeMeta: getBadgeMeta(stats.deltas.totalBundles),
      },
      {
        label: "Active bundles",
        value: stats.activeBundles,
        helper: "Bundles currently visible and available",
        accent: "#7c3aed",
        bg: "linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)",
        badgeMeta: getBadgeMeta(stats.deltas.activeBundles),
      },
      {
        label: "Bundle revenue",
        value: revenueDisplay,
        helper: "Total tracked revenue from bundle sales",
        accent: "#047857",
        bg: "linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)",
        badgeMeta: null,
      },
      {
        label: "Units sold",
        value: stats.totalUnitsSold,
        helper: "Total bundle units purchased",
        accent: "#1d4ed8",
        bg: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
        badgeMeta: null,
      },
    ],
    [stats, revenueDisplay],
  );

  return (
    <s-page heading="Dashboard">
      {/* Bundle type selector */}
      <s-section fontSize="100px" heading="Create a bundle">
        <s-paragraph tone="auto">
          Choose the bundle type that fits your goal. Each type works differently
          to help you increase average order value.
        </s-paragraph>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "16px",
            marginTop: "16px",
          }}
        >

          {BUNDLE_TYPES.map((bt) => {
           const hasAccess =
              !bt.feature || featureAccess[bt.feature] === true;

            const requiredPlan = bt.feature
              ? FEATURE_MIN_PLAN[bt.feature]
              : null;

            return (
              <div
                key={bt.type}
                style={{
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "22px",
                  padding: "22px",
                  cursor: hasAccess ? "pointer" : "default",
                  opacity: hasAccess ? 1 : 0.72,
                  transition: "all 0.18s ease",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "320px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}

                onMouseEnter={(e) => {
                  if (hasAccess) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 10px 30px rgba(0,0,0,0.08)";
                  }
                }}

                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0px)";
                  e.currentTarget.style.boxShadow =
                    "0 1px 2px rgba(0,0,0,0.04)";
                }}

                onClick={() =>
  hasAccess
    ? navigate(bt.route)
    : navigate("/app/billing")
}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "-10px",
                    right: "18px",
                    zIndex: 20,
                  }}
                >
                  <s-badge tone={hasAccess ? "success" : "info"}>
                    {hasAccess ? "Available" : `${requiredPlan}  and above`}
                  </s-badge>
                </div>

                <s-stack direction="block" gap="base" style={{ flex: 1 }}>
                  <div
                    style={{
                      width: "100%",
                      height: "260px",
                      borderRadius: "18px",
                      overflow: "hidden",
                      background: "#f8fafc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0",
                      marginTop: "12px",
                      marginBottom: "20px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <img
                      src={bt.image}
                      alt={bt.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        objectPosition: "center",
                        imageRendering: "auto",
                        display: "block",
                      }}
                    />
                  </div>
                </s-stack>

                <div style={{ marginTop: "auto" }}>
                  {hasAccess ? (
                    <s-button
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(bt.route);
                      }}
                    >
                      Create {bt.title.toLowerCase()}
                    </s-button>
                  ) : (
                    <s-button
  onClick={(e) => {
    e.stopPropagation();
    navigate("/app/billing");
  }}
>
  Upgrade to {requiredPlan}
</s-button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </s-section>

      {/* Recent active bundles */}
      <s-section heading="Recent active bundles">
        {bundles.length === 0 ? (
          <s-paragraph tone="subdued">
            No active bundles yet. Choose a bundle type above to get started.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {bundles.map((bundle) => {
              const effectiveStatus = pendingStatus[bundle.id] ?? bundle.status;

              return (
                <s-box
                  key={bundle.id}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <s-text>{bundle.title}</s-text>
                      <br />
                      <s-text tone="subdued">
                        {typeLabel(bundle.type)} · {statusLabel(effectiveStatus)} ·{" "}
                        {bundle.components?.length ?? 0} products · {discountLabel(bundle)}
                      </s-text>
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <s-button
                        variant="tertiary"
                        onClick={() => navigate(`/app/bundles/${bundle.id}`)}
                      >
                        <s-icon type="edit" color="base"></s-icon>
                      </s-button>

                      <s-button
                        variant="tertiary"
                        tone="critical"
                        onClick={() => handleDeleteClick(bundle.id, bundle.title)}
                      >
                        <s-icon type="delete" color="base"></s-icon>
                      </s-button>

                      {effectiveStatus === "ARCHIVED" ? (
                        <s-button
                          variant="tertiary"
                          onClick={() => handleUnarchiveClick(bundle.id, bundle.title)}
                        >
                          Unarchive
                        </s-button>
                      ) : (
                        <s-button
                          variant="tertiary"
                          tone="critical"
                          onClick={() => handleArchiveClick(bundle.id, bundle.title)}
                        >
                          <s-icon type="archive" color="base"></s-icon>
                        </s-button>
                      )}
                    </div>
                  </div>
                </s-box>
              );
            })}

            <s-button
              justifyContent="center"
              alignItems="center"
              variant="primary"
              onClick={() => navigate("/app/bundles/index")}
            >
              View all bundles
            </s-button>
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="Stats Overview">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {overviewStats.map(({ label, value, helper, accent, bg, badgeMeta }) => (
            <div key={label} style={{ ...statCardStyle, background: bg }}>
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 999,
                  background: accent,
                  marginBottom: 14,
                }}
              />

              <div style={{ marginBottom: 8 }}>
                <s-text tone="subdued">{label}</s-text>
              </div>

              <div
                style={{
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <s-heading>{value}</s-heading>

                {badgeMeta ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: 1,
                      background:
                        badgeMeta.tone === "success"
                          ? "#dcfce7"
                          : badgeMeta.tone === "critical"
                            ? "#fee2e2"
                            : "#fef3c7",
                      color:
                        badgeMeta.tone === "success"
                          ? "#15803d"
                          : badgeMeta.tone === "critical"
                            ? "#b91c1c"
                            : "#a16207",
                    }}
                  >
                    {badgeMeta.icon ? <span>{badgeMeta.icon}</span> : null}
                    <span>{badgeMeta.text}</span>
                  </span>
                ) : null}
              </div>

              <s-text tone="subdued">{helper}</s-text>
            </div>
          ))}
        </div>
      </s-section>

      {/* Aside — bundle type guide */}
      <s-section slot="aside" heading="About bundle types">
        <s-stack direction="block" gap="base">
          <s-paragraph tone="subdued">
            <strong>Fixed bundle</strong> — best for gift sets and starter kits
            where the products are always the same.
          </s-paragraph>
          <s-paragraph tone="subdued">
            <strong>Mix &amp; match</strong> — best when customers want to
            choose their own combination from a list you curate.
          </s-paragraph>
          <s-paragraph tone="subdued">
            <strong>Volume discount</strong> — best for driving larger order
            quantities of the same product.
          </s-paragraph>
        </s-stack>
      </s-section>

      {/* Delete confirmation modal — uses AppBridge id-based control */}
      <ui-modal id="delete-bundle-modal" variant="small">
        <p style={{ padding: "16px" }}>
          This will permanently delete the bundle and cannot be undone.
        </p>
        <ui-title-bar title="Delete bundle?">
          <button variant="primary" tone="critical" onClick={confirmDelete}>
            Delete bundle
          </button>
          <button onClick={() => shopify.modal.hide("delete-bundle-modal")}>
            Cancel
          </button>
        </ui-title-bar>
      </ui-modal>

      <ui-modal id="archive-bundle-modal" variant="small">
        <p style={{ padding: "16px" }}>
          This will hide the bundle from your storefront. You can reactivate it any time.
        </p>
        <ui-title-bar title={`Archive "${archivingTitle}"?`}>
          <button variant="primary" tone="critical" onClick={confirmArchive}>
            Archive bundle
          </button>
          <button onClick={() => shopify.modal.hide("archive-bundle-modal")}>
            Cancel
          </button>
        </ui-title-bar>
      </ui-modal>

      <ui-modal id="unarchive-bundle-modal" variant="small">
        <p style={{ padding: "16px" }}>
          This will reactivate the bundle and make it visible on your storefront again.
        </p>
        <ui-title-bar title={`Unarchive "${unarchivingTitle}"?`}>
          <button variant="primary" onClick={confirmUnarchive}>
            Unarchive bundle
          </button>
          <button onClick={() => shopify.modal.hide("unarchive-bundle-modal")}>
            Cancel
          </button>
        </ui-title-bar>
      </ui-modal>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);


