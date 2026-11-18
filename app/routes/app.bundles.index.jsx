// Bundle list page — all bundles with stats, search, filter, pagination.
import { useLoaderData, useNavigate, useFetcher, useNavigation, useSearchParams } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState, useCallback, useMemo } from "react";
import { authenticate } from "../shopify.server";

import { useAppBridge } from "@shopify/app-bridge-react";
import { BackArrow, ForwardArrow } from "../components/NavArrows.jsx";
import { requireFeatureAccess } from "../featureAccess.server";


const PAGE_SIZE = 10;

// -----------------------------------------------------------------------
// Loader
// -----------------------------------------------------------------------
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  const {
    listBundles,
    getBundleStats,
  } = await import("../models/bundle.server.js");

  const url = new URL(request.url);

  const status = url.searchParams.get("status") ?? undefined;
  const query = url.searchParams.get("q") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));

  const skip = (page - 1) * PAGE_SIZE;

  const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
  const dateTo = url.searchParams.get("dateTo") ?? undefined;

  const [{ bundles, total }, stats] = await Promise.all([
    listBundles(session.shop, {
      skip,
      take: PAGE_SIZE,
      status,
      query,
      dateFrom,
      dateTo,
    }),
    getBundleStats(session.shop),
  ]);
  const currencyResponse = await admin.graphql(
    `query GetShopCurrency{
    shop{currencyCode
    }}`
  )

  const currencyData = await currencyResponse.json();
  const shopCurrency = currencyData.data.shop.currencyCode;

  return {
    bundles,
    total,
    stats,
    shopCurrency,
    page,
    status: status ?? "all",
    query,
    dateFrom: dateFrom ?? "",
    dateTo: dateTo ?? "",
  };
};

// -----------------------------------------------------------------------
// Action — handles archive AND delete
// -----------------------------------------------------------------------
export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  const {
    archiveBundle,
    deleteBundle,
    activateBundle,
    getBundle,
  } = await import("../models/bundle.server.js");

  const formData = await request.formData();

  const intent = formData.get("intent");
  const bundleId = formData.get("bundleId");

  if (intent === "archive") {
    await archiveBundle(bundleId, session.shop, admin);
    return { success: true };
  }

  if (intent === "unarchive") {
    const bundle = await getBundle(bundleId, session.shop);

    if (!bundle) {
        throw new Response("Bundle not found", { status: 404 });
    }

    if (bundle.type === "MIX_MATCH") {
        await requireFeatureAccess(session.shop, "MIX_MATCH");
    }

    if (bundle.type === "MULTIVARIANT") {
        await requireFeatureAccess(session.shop, "MULTIVARIANT");
    }

    await activateBundle(bundleId, session.shop, admin);
    return { success: true };
}

  if (intent === "delete") {
    await deleteBundle(session.shop, admin, bundleId);
    return { success: true };
  }

  return { error: "Unknown intent" };
};

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
function discountLabel(bundle) {
  if (bundle.discountType === "PERCENTAGE") return `${bundle.discountValue}% off`;
  if (bundle.discountType === "FIXED_AMOUNT") return `$${bundle.discountValue} off`;
  if (bundle.discountType === "FIXED_PRICE" && bundle.fixedPrice != null)
    return `$${bundle.fixedPrice} fixed price`;
  return "No discount";
}

function statusLabel(status) {
  if (status === "ACTIVE") return "Active";
  if (status === "DRAFT") return "Draft";
  if (status === "ARCHIVED") return "Archived";
  return status;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------
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
        padding: "2px 10px",
        fontSize: "13px",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
      }}
    >
      {icons[type]} {value}
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
  if (delta == null) return { text: "New", tone: "warning", icon: "" };
  if (delta > 0) return { text: `${Math.abs(delta)}%`, tone: "success", icon: "↑" };
  if (delta < 0) return { text: `${Math.abs(delta)}%`, tone: "critical", icon: "↓" };
  return { text: "0%", tone: "warning", icon: "" };
}

export default function BundlesIndex() {
  const {
    bundles,
    total,
    stats,
    shopCurrency,
    page,
    status,
    query,
    dateFrom: loaderDateFrom,
    dateTo: loaderDateTo,
  } = useLoaderData();

  const navigate = useNavigate();
  const fetcher = useFetcher();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const [deletingId, setDeletingId] = useState(null);
  const isLoading = navigation.state !== "idle";
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const [searchValue, setSearchValue] = useState(query);
  const [statusFilter, setStatusFilter] = useState(status);

  const [archivingId, setArchivingId] = useState(null);
  const [archivingTitle, setArchivingTitle] = useState(null);

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

  const [, setSearchParams] = useSearchParams();

  const [unarchivingId, setUnarchivingId] = useState(null);
  const [unarchivingTitle, setUnarchivingTitle] = useState(null);

  const [dateFrom, setDateFrom] = useState(loaderDateFrom);
  const [dateTo, setDateTo] = useState(loaderDateTo);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
    setUnarchivingTitle(null);
  }, [fetcher, unarchivingId, shopify]);

  const applyQuickFilter = useCallback(
    (days) => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));

      const fromStr = from.toISOString().split("T")[0];
      const toStr = to.toISOString().split("T")[0];

      setDateFrom(fromStr);
      setDateTo(toStr);

      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (searchValue) params.set("q", searchValue);
      params.set("dateFrom", fromStr);
      params.set("dateTo", toStr);
      setSearchParams(params);
    },
    [statusFilter, searchValue, setSearchParams],
  );

  const applyDateRange = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    if (searchValue) params.set("q", searchValue);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    setSearchParams(params);
  }, [dateFrom, dateTo, statusFilter, searchValue, setSearchParams]);

  const clearDateFilter = useCallback(() => {
    setDateFrom("");
    setDateTo("");

    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    if (searchValue) params.set("q", searchValue);
    setSearchParams(params);
  }, [statusFilter, searchValue, setSearchParams]);

  const handleSearch = useCallback(
    (e) => {
      if (e.key === "Enter") {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (e.target.value) params.set("q", e.target.value);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        setSearchParams(params);
      }
    },
    [statusFilter, dateFrom, dateTo, setSearchParams],
  );

  const handleStatusFilter = useCallback(
    (value) => {
      setStatusFilter(value);
      const params = new URLSearchParams();
      if (value && value !== "all") params.set("status", value);
      if (searchValue) params.set("q", searchValue);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      setSearchParams(params);
    },
    [searchValue, dateFrom, dateTo, setSearchParams],
  );

  const handleDeleteClick = useCallback(
    (bundleId) => {
      setDeletingId(bundleId);
      shopify.modal.show("delete-bundle-modal");
    },
    [shopify],
  );

  const confirmDelete = useCallback(() => {
    fetcher.submit({ intent: "delete", bundleId: deletingId }, { method: "POST" });
    shopify.modal.hide("delete-bundle-modal");
    setDeletingId(null);
  }, [fetcher, deletingId, shopify]);

  const revenueDisplay = stats.totalRevenue.toLocaleString("en-US", {
    style: "currency",
    currency: shopCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

  const paginationLabel =
    total === 0
      ? "0 bundles"
      : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`;

  return (
    <s-page heading="Bundles">
      <s-stack direction="inline" gap="loose" align="center" slot="nav">
        <BackArrow />
        <s-box padding-inline-start="loose" />
      </s-stack>

      <div style={{ marginBlockStart: "20px" }}>
        {/* Stats */}
        <s-section heading="Overview">
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
      </div>

      {/* Search + filter */}
      <div style={{ marginBlockStart: "10px" }}></div>
      <s-section heading="All bundles">
        <div
          style={{
            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid #e5e7eb",
            borderRadius: "18px",
            padding: "18px",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            marginBottom: "16px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.6fr) minmax(220px, 0.7fr)",
              gap: "12px",
              alignItems: "end",
            }}
          >
            <div>
              <div style={{ marginBottom: "8px" }}>
                <s-text tone="subdued">Search bundles</s-text>
              </div>
              <s-text-field
                label="Search"
                label-hidden
                placeholder="Search bundles by name…"
                value={searchValue}
                onInput={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>

            <div>
              <div style={{ marginBottom: "8px" }}>
                <s-text tone="subdued">Status</s-text>
              </div>
              <s-select
                label="Product Status"
                label-hidden
                value={statusFilter}
                placeholder="ALL"
                gap="base"
                onChange={(e) => {
                  const value = e.target.value || e.detail?.value || "all";
                  handleStatusFilter(value);
                }}
              >
                <s-option value="all">All</s-option>
                <s-option value="ACTIVE">Active</s-option>
                <s-option value="DRAFT">Draft</s-option>
                <s-option value="ARCHIVED">Archived</s-option>
              </s-select>
            </div>
          </div>

          <div
            style={{
              marginTop: "14px",
              paddingTop: "14px",
              borderTop: "1px solid #e5e7eb",
              display: "grid",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <s-button variant="tertiary" onClick={() => applyQuickFilter(1)}>
                  Today
                </s-button>
                <s-button variant="tertiary" onClick={() => applyQuickFilter(3)}>
                  Last 3 days
                </s-button>
                <s-button variant="tertiary" onClick={() => applyQuickFilter(7)}>
                  Last 7 days
                </s-button>
                <s-button
                  variant={showDatePicker ? "primary" : "tertiary"}
                  onClick={() => setShowDatePicker((prev) => !prev)}
                >
                  {showDatePicker ? "Hide custom range" : "Custom range"}
                </s-button>
                {(loaderDateFrom || loaderDateTo) && (
                  <s-button variant="tertiary" onClick={clearDateFilter}>
                    Clear dates
                  </s-button>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <s-badge tone="info">{total} total</s-badge>
                {statusFilter !== "all" && <s-badge>{statusFilter}</s-badge>}
                {searchValue && <s-badge tone="info">Search: {searchValue}</s-badge>}
              </div>
            </div>

            {(loaderDateFrom || loaderDateTo) && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  width: "fit-content",
                  maxWidth: "100%",
                }}
              >
                <s-text tone="subdued">Active date range</s-text>
                <s-text>
                  {loaderDateFrom || "..."} → {loaderDateTo || "..."}
                </s-text>
              </div>
            )}
          </div>

          {showDatePicker && (
            <>
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 99,
                }}
                onClick={() => setShowDatePicker(false)}
              />

              <div
                style={{
                  position: "absolute",
                  top: "calc(100% - 6px)",
                  left: "18px",
                  zIndex: 100,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "16px",
                  boxShadow: "0 18px 48px rgba(15, 23, 42, 0.16)",
                  padding: "16px",
                  minWidth: "320px",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ marginBottom: "10px" }}>
                  <s-text tone="subdued">Choose a custom date range</s-text>
                </div>

                <s-date-picker
                  type="range"
                  name="bundle-date-filter"
                  id="bundle-date-picker"
                  value={dateFrom && dateTo ? `${dateFrom}--${dateTo}` : undefined}
                  onChange={(e) => {
                    const val = e.currentTarget?.value || e.target?.value;
                    if (!val || !val.includes("--")) return;
                    const [from, to] = val.split("--");
                    if (!from || !to) return;
                    setDateFrom(from);
                    setDateTo(to);
                    const params = new URLSearchParams();
                    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
                    if (searchValue) params.set("q", searchValue);
                    params.set("dateFrom", from);
                    params.set("dateTo", to);
                    setSearchParams(params);
                    setShowDatePicker(false);
                  }}
                />
              </div>
            </>
          )}
        </div>

        {isLoading ? (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              padding: "28px",
              background: "#ffffff",
              display: "grid",
              placeItems: "center",
            }}
          >
            <s-spinner />
          </div>
        ) : bundles.length === 0 ? (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              padding: "28px",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: "8px" }}>
              <s-heading>No bundles found</s-heading>
            </div>
            <s-paragraph tone="subdued">
              {statusFilter !== "all" || searchValue || loaderDateFrom || loaderDateTo
                ? "No bundles match your current filters."
                : "No bundles yet. Create your first one to get started."}
            </s-paragraph>
            {!statusFilter && !searchValue && !loaderDateFrom && !loaderDateTo && (
              <div style={{ marginTop: "16px" }}>
                <s-button onClick={() => navigate("/app/bundles/new")}>Create bundle</s-button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {bundles.map((bundle) => {
              const effectiveStatus = pendingStatus[bundle.id] || bundle.status;

              return (
                <div
                  key={bundle.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "18px",
                    padding: "18px",
                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: "16px",
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginBottom: "8px",
                      }}
                    >
                      <s-text>{bundle.title}</s-text>
                      <s-badge
                        tone={
                          effectiveStatus === "ACTIVE"
                            ? "success"
                            : effectiveStatus === "DRAFT"
                              ? "warning"
                              : effectiveStatus === "ARCHIVED"
                                ? "subdued"
                                : "info"
                        }
                      >
                        {statusLabel(effectiveStatus)}
                      </s-badge>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px 14px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <s-text tone="subdued">{typeLabel(bundle.type)}</s-text>
                      <s-text tone="subdued">{bundle.components?.length ?? 0} products</s-text>
                      <s-text tone="subdued">{discountLabel(bundle)}</s-text>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    <s-button
                      variant="tertiary"
                      onClick={() => navigate(`/app/bundles/${bundle.id}`)}
                    >
                      <s-icon type="edit" color="base"></s-icon>
                    </s-button>

                    <s-button
                      variant="tertiary"
                      tone="critical"
                      onClick={() => handleDeleteClick(bundle.id)}
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
                        onClick={() => handleArchiveClick(bundle.id, bundle.title)}
                      >
                        <s-icon type="archive" color="base"></s-icon>
                      </s-button>
                    )}
                  </div>
                </div>
              );
            })}

            {totalPages > 1 && (
              <div
                style={{
                  marginTop: "4px",
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "16px",
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <s-text tone="subdued">{paginationLabel}</s-text>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <s-button
                    variant="tertiary"
                    disabled={page <= 1 ? true : undefined}
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
                      if (searchValue) params.set("q", searchValue);
                      if (loaderDateFrom) params.set("dateFrom", loaderDateFrom);
                      if (loaderDateTo) params.set("dateTo", loaderDateTo);
                      params.set("page", String(page - 1));
                      setSearchParams(params);
                    }}
                  >
                    Previous
                  </s-button>

                  <s-button
                    variant="tertiary"
                    disabled={page >= totalPages ? true : undefined}
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
                      if (searchValue) params.set("q", searchValue);
                      if (loaderDateFrom) params.set("dateFrom", loaderDateFrom);
                      if (loaderDateTo) params.set("dateTo", loaderDateTo);
                      params.set("page", String(page + 1));
                      setSearchParams(params);
                    }}
                  >
                    Next
                  </s-button>
                </div>
              </div>
            )}
          </div>
        )}
      </s-section>

      {/* Delete confirmation modal */}
      <ui-modal id="delete-bundle-modal" variant="small">
        <p style={{ padding: "16px" }}>
          This will permanently delete the bundle and remove it from Shopify. This cannot be undone.
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

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};