import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState, useCallback, useMemo } from "react";
import { authenticate } from "../shopify.server";
import { UPSELL_SURFACES } from "../models/upsell.constants";
import {
  listUpsellFunnels,
  getUpsellStats,
  deleteUpsell,
  archiveUpsell,
  activateUpsell,
} from "../models/upsell.server";

const DEFAULT_STATS = {
  totalUpsellRevenue: 0,
  activeFunnels: 0,
  totalFunnels: 0,
  totalUnitsInfluenced: 0,
};

const DEFAULT_CREATE_SURFACE = UPSELL_SURFACES.PDP;

// FIX: The dashboard IS the funnels index — "View all funnels" should go to a
// dedicated list route. If you have one at /app/upsell/funnels/list, point there.
// For now we keep the route but clarify the intent in the UI label.
const FUNNELS_INDEX_ROUTE = "/app/upsell/funnels";

const SURFACE_WIDGET_ROUTES = {
  [UPSELL_SURFACES.CHECKOUT]: "/app/Customize",
  [UPSELL_SURFACES.CART]: "/app/upsell/widgets/cart",
  [UPSELL_SURFACES.PDP]: "/app/upsell/widgets/pdp",
  [UPSELL_SURFACES.POST_PURCHASE]: "/app/upsell/widgets/post-purchase",
  [UPSELL_SURFACES.ACCOUNT]: "/app/upsell/widgets/account",
};

function buildWidgetHubRoute(surface = DEFAULT_CREATE_SURFACE) {
  return `/app/Customize?surface=${encodeURIComponent(surface)}`;
}

function buildEditFunnelRoute(id) {
  return `/app/upsell/funnels/${id}`;
}

const SURFACE_TYPES = [
  {
    type: UPSELL_SURFACES.PDP,
    title: "Product page",
    shortTitle: "PDP",
    description:
      "Present add-ons, bundles, and quantity incentives before shoppers add to cart.",
    badge: "High intent",
    badgeTone: "success",
    examples: ["Frequently bought together", "Volume discounts", "Product add-ons"],
    accent: "#0f766e",
    soft: "linear-gradient(180deg, #ecfeff 0%, #f8fafc 100%)",
    icon: (
      <svg viewBox="0 0 20 20" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M4 3.5A1.5 1.5 0 0 1 5.5 2h9A1.5 1.5 0 0 1 16 3.5v13a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 16.5v-13Zm2 1a.5.5 0 0 0-.5.5V7h9V5a.5.5 0 0 0-.5-.5H6Zm8.5 4H5.5v8a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-8Z" />
      </svg>
    ),
  },
  {
    type: UPSELL_SURFACES.CART,
    title: "Cart & drawer",
    shortTitle: "Cart",
    description:
      "Suggest complementary items and unlock free-shipping or bundle thresholds as customers review their cart.",
    badge: "Best balance",
    badgeTone: "info",
    examples: ["Free shipping bar", "In-cart upsell", "Gift wrap"],
    accent: "#1d4ed8",
    soft: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
    icon: (
      <svg viewBox="0 0 20 20" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M2.5 3A.75.75 0 0 0 2.5 4.5h1.169l1.384 7.092A2 2 0 0 0 7.017 13.2h7.964a2 2 0 0 0 1.965-1.63l.742-4.204A1.25 1.25 0 0 0 16.457 6H5.393l-.177-.907A2 2 0 0 0 3.254 3H2.5Zm5 11a1.75 1.75 0 1 0 0 3.5A1.75 1.75 0 0 0 7.5 14Zm7 0a1.75 1.75 0 1 0 0 3.5a1.75 1.75 0 0 0 0-3.5Z" />
      </svg>
    ),
  },
  {
    type: UPSELL_SURFACES.CHECKOUT,
    title: "Checkout",
    shortTitle: "Checkout",
    description:
      "Add low-friction offers like gift wrap or shipping protection without slowing checkout.",
    badge: "Plus aware",
    badgeTone: "info",
    examples: ["Gift wrap", "Priority processing", "Protection"],
    accent: "#7c3aed",
    soft: "linear-gradient(180deg, #f5f3ff 0%, #f8fafc 100%)",
    icon: (
      <svg viewBox="0 0 20 20" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M3.5 4A1.5 1.5 0 0 0 2 5.5v9A1.5 1.5 0 0 0 3.5 16h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 16.5 4h-13ZM3.75 7h12.5v7.25a.25.25 0 0 1-.25.25H4a.25.25 0 0 1-.25-.25V7Zm1-1.5a1.75 1.75 0 1 0 0 3.5a1.75 1.75 0 0 0 0-3.5Z" />
      </svg>
    ),
  },
  {
    type: UPSELL_SURFACES.POST_PURCHASE,
    title: "Post-purchase",
    shortTitle: "Post-purchase",
    description:
      "Use one-click follow-up offer after payment to lift order value without reopening checkout.",
    badge: "AOV lift",
    badgeTone: "success",
    examples: ["One-click upsell", "Cross-sell", "Thank-you coupons"],
    accent: "#be123c",
    soft: "linear-gradient(180deg, #fff1f2 0%, #f8fafc 100%)",
    icon: (
      <svg viewBox="0 0 20 20" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M10 2.5a1.5 1.5 0 0 1 1.342.829l.96 1.95 2.152.313a1.5 1.5 0 0 1 .831 2.559l-1.557 1.518.367 2.144a1.5 1.5 0 0 1-2.176 1.58L10 12.383l-1.919 1.01a1.5 1.5 0 0 1-2.176-1.58l.367-2.144-1.557-1.518a1.5 1.5 0 0 1 .831-2.559l2.152-.313.96-1.95A1.5 1.5 0 0 1 10 2.5Z" />
      </svg>
    ),
  },
  {
    type: UPSELL_SURFACES.ACCOUNT,
    title: "Customer account",
    shortTitle: "Account",
    description:
      "Turn one-time buyers into regulars with reorder and subscription offers.",
    badge: "Retention",
    badgeTone: "warning",
    examples: ["Buy again", "Subscription upgrade", "Loyalty rewards"],
    accent: "#a16207",
    soft: "linear-gradient(180deg, #fffbeb 0%, #f8fafc 100%)",
    icon: (
      <svg viewBox="0 0 20 20" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M10 10a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 10 10Zm0 1.5c-3.59 0-6.5 2.238-6.5 5a.75.75 0 0 0 .75.75h11.5a.75.75 0 0 0 .75-.75c0-2.762-2.91-5-6.5-5Z" />
      </svg>
    ),
  },
];

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

const sectionTitleRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const [rawFunnels, rawStats] = await Promise.all([
    listUpsellFunnels(session.shop, { take: 5 }),
    getUpsellStats(session.shop),
  ]);

  return {
    funnels: rawFunnels ?? [],
    stats: rawStats ?? DEFAULT_STATS,
  };
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const upsellId = formData.get("upsellId");

  if (intent === "delete") {
    await deleteUpsell(session.shop, admin, upsellId);
    return null;
  }

  if (intent === "archive") {
    await archiveUpsell(upsellId, session.shop, admin);
    return null;
  }

  if (intent === "unarchive") {
    await activateUpsell(upsellId, session.shop, admin);
    return null;
  }

  return null;
};

function statusLabel(status) {
  const map = { ACTIVE: "Active", DRAFT: "Draft", ARCHIVED: "Archived" };
  return map[status] ?? status;
}

function surfaceLabel(surface) {
  const map = {
    [UPSELL_SURFACES.PDP]: "Product page",
    [UPSELL_SURFACES.CART]: "Cart",
    [UPSELL_SURFACES.CHECKOUT]: "Checkout",
    [UPSELL_SURFACES.POST_PURCHASE]: "Post-purchase",
    [UPSELL_SURFACES.ACCOUNT]: "Customer account",
  };
  return map[surface] ?? surface;
}

function statusBadgeTone(status) {
  if (status === "ACTIVE") return "success";
  if (status === "DRAFT") return "warning";
  if (status === "ARCHIVED") return "subdued";
  return "info";
}

function offerLabel(count) {
  return `${count} offer${count === 1 ? "" : "s"}`;
}

function formatMoney(value) {
  return Number(value ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatCompactNumber(value) {
  return Number(value ?? 0).toLocaleString("en-US");
}

function formatUpdatedAt(value) {
  if (!value) return "Recently updated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function surfaceAccent(surface) {
  const match = SURFACE_TYPES.find((item) => item.type === surface);
  return match?.accent ?? "#475569";
}

// FIX: keyboard handler no longer needs to receive navigate + route separately —
// the card onClick already calls goToCreateFunnel, so keyDown mirrors that.
function navigateCard(event, onActivate) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onActivate();
  }
}

export default function UpsellDashboard() {
  const data = useLoaderData();
  const funnels = data?.funnels ?? [];
  const stats = data?.stats ?? DEFAULT_STATS;

  const navigate = useNavigate();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [pendingStatus, setPendingStatus] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [archiveId, setArchiveId] = useState(null);
  const [archiveTitle, setArchiveTitle] = useState("");
  const [unarchiveId, setUnarchiveId] = useState(null);
  const [unarchiveTitle, setUnarchiveTitle] = useState("");

  const isSubmitting = fetcher.state !== "idle";

  // FIX: navigate to the new funnel creation route, not back to this same index
  const goToWidgetHub = useCallback(
    (surface = DEFAULT_CREATE_SURFACE) => {
      navigate(buildWidgetHubRoute(surface));
    }, [navigate],
  );

  const goToEditFunnel = useCallback(
    (id) => {
      if (!id) return;
      navigate(buildEditFunnelRoute(id));
    },
    [navigate],
  );

  const revenueDisplay = useMemo(
    () => formatMoney(stats.totalUpsellRevenue),
    [stats.totalUpsellRevenue],
  );

  const statCards = useMemo(
    () => [
      {
        label: "Upsell revenue",
        value: revenueDisplay,
        helper: "Total tracked revenue from accepted offers",
        accent: "#047857",
        bg: "linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)",
      },
      {
        label: "Orders influenced",
        value: formatCompactNumber(stats.totalUnitsInfluenced),
        helper: "Upsell offers accepted by shoppers so far",
        accent: "#1d4ed8",
        bg: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
      },
      {
        label: "Active widgets",
        value: formatCompactNumber(stats.activeFunnels),
        helper: "Enabled widgets running on your surfaces",
        accent: "#7c3aed",
        bg: "linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)",
      },
      {
        label: "Total widgets",
        value: formatCompactNumber(stats.totalFunnels),
        helper: "All widgets set up in this store",
        accent: "#b45309",
        bg: "linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)",
      },
    ],
    [revenueDisplay, stats],
  );

  const handleDeleteClick = useCallback(
    (id) => {
      setDeleteId(id);
      shopify.modal.show("delete-upsell-modal");
    },
    [shopify],
  );

  const handleArchiveClick = useCallback(
    (id, title) => {
      setArchiveId(id);
      setArchiveTitle(title);
      shopify.modal.show("archive-upsell-modal");
    },
    [shopify],
  );

  const handleUnarchiveClick = useCallback(
    (id, title) => {
      setUnarchiveId(id);
      setUnarchiveTitle(title);
      shopify.modal.show("unarchive-upsell-modal");
    },
    [shopify],
  );

  const closeDelete = useCallback(() => {
    setDeleteId(null);
    shopify.modal.hide("delete-upsell-modal");
  }, [shopify]);

  const closeArchive = useCallback(() => {
    setArchiveId(null);
    setArchiveTitle("");
    shopify.modal.hide("archive-upsell-modal");
  }, [shopify]);

  const closeUnarchive = useCallback(() => {
    setUnarchiveId(null);
    setUnarchiveTitle("");
    shopify.modal.hide("unarchive-upsell-modal");
  }, [shopify]);

  const confirmDelete = useCallback(() => {
    if (!deleteId) return;
    fetcher.submit({ intent: "delete", upsellId: deleteId }, { method: "POST" });
    closeDelete();
  }, [fetcher, deleteId, closeDelete]);

  const confirmArchive = useCallback(() => {
    if (!archiveId) return;
    setPendingStatus((prev) => ({ ...prev, [archiveId]: "ARCHIVED" }));
    fetcher.submit({ intent: "archive", upsellId: archiveId }, { method: "POST" });
    closeArchive();
  }, [fetcher, archiveId, closeArchive]);

  const confirmUnarchive = useCallback(() => {
    if (!unarchiveId) return;
    setPendingStatus((prev) => ({ ...prev, [unarchiveId]: "ACTIVE" }));
    fetcher.submit({ intent: "unarchive", upsellId: unarchiveId }, { method: "POST" });
    closeUnarchive();
  }, [fetcher, unarchiveId, closeUnarchive]);

  return (
    <s-page heading="Upsell dashboard">
      <s-section>
        <div
          style={{
            ...shellCardStyle,
            padding: 24,
            background:
              "radial-gradient(circle at top right, rgba(37, 99, 235, 0.10), transparent 30%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.8fr) minmax(280px, 1fr)",
              gap: 20,
              alignItems: "stretch",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ marginBottom: 10 }}>
                <s-badge tone="success">Revenue workspace</s-badge>
              </div>
              <div style={{ marginBottom: 8 }}>
                <s-heading>Build upsells that feel intentional, not intrusive</s-heading>
              </div>
              <s-paragraph tone="subdued">
                Set up the right offers for each stage of the buying journey, see what's
                live across your store, and track where upsells are lifting revenue.
              </s-paragraph>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                <s-button
                  variant="primary"
                  onClick={() => navigate("/app/Customize")}
                >
                  Open widget builder
                </s-button>
              </div>
            </div>

            <div
              style={{
                ...shellCardStyle,
                padding: 18,
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <s-text tone="subdued">Quick focus</s-text>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <s-text>Active widgets</s-text>
                  <s-badge tone="success">{stats.activeFunnels}</s-badge>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <s-text>Revenue tracked</s-text>
                  <s-text>{revenueDisplay}</s-text>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <s-text>Orders influenced</s-text>
                  <s-text>{formatCompactNumber(stats.totalUnitsInfluenced)}</s-text>
                </div>
              </div>
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #e5e7eb" }}>
                <s-text tone="subdued">Start with PDP or Cart for the easiest early wins.</s-text>
              </div>
            </div>
          </div>
        </div>
      </s-section>

      <s-section>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {statCards.map((item) => (
            <div key={item.label} style={{ ...statCardStyle, background: item.bg }}>
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 999,
                  background: item.accent,
                  marginBottom: 14,
                }}
              />
              <div style={{ marginBottom: 8 }}>
                <s-text tone="subdued">{item.label}</s-text>
              </div>
              <div style={{ marginBottom: 6 }}>
                <s-heading>{item.value}</s-heading>
              </div>
              <s-text tone="subdued">{item.helper}</s-text>
            </div>
          ))}
        </div>
      </s-section>

      <s-section heading="Create by surface">
        <div style={{ marginBottom: 14 }}>
          <s-paragraph tone="subdued">
            Each surface supports a different moment in the buying journey. Choose the placement
            that best matches customer intent.
          </s-paragraph>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
            gap: 16,
          }}
        >
          {SURFACE_TYPES.map((surface) => (
            <div
              key={surface.type}
              role="button"
              tabIndex={0}
              // FIX: goToWidgetHub navigates to the widget hub for the selected surface
              onClick={() => goToWidgetHub(surface.type)}
              onKeyDown={(event) => navigateCard(event, () => goToWidgetHub(surface.type))}
              style={{
                ...shellCardStyle,
                padding: 18,
                background: surface.soft,
                cursor: "pointer",
                transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                minHeight: 244,
                display: "flex",
                flexDirection: "column",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = "translateY(-2px)";
                event.currentTarget.style.boxShadow = "0 10px 26px rgba(15, 23, 42, 0.08)";
                event.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = "translateY(0)";
                event.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
                event.currentTarget.style.borderColor = "#e5e7eb";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    color: surface.accent,
                    background: "#ffffff",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                  }}
                >
                  {surface.icon}
                </div>
                <s-badge tone={surface.badgeTone}>{surface.badge}</s-badge>
              </div>

              <div style={{ marginBottom: 8 }}>
                <s-heading>{surface.title}</s-heading>
              </div>

              <div style={{ marginBottom: 12 }}>
                <s-paragraph tone="subdued">{surface.description}</s-paragraph>
              </div>

              <div style={{ marginTop: "auto" }}>
                <div
                  style={{
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.78)",
                    border: "1px solid rgba(148, 163, 184, 0.18)",
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                >
                  <s-text tone="subdued">{surface.examples.join(" · ")}</s-text>
                </div>

                {/* FIX: stopPropagation prevents double-fire from parent div onClick */}
                <s-button variant="primary" onClick={(event) => {
                  event.stopPropagation();
                  goToWidgetHub(surface.type);
                }}>
                  Manage {surface.shortTitle} widgets
                </s-button>
              </div>
            </div>
          ))}
        </div>
      </s-section>

      <s-section slot="aside" heading="Launch playbook">
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ ...shellCardStyle, padding: 18 }}>
            <div style={{ marginBottom: 10 }}>
              <s-badge tone="success">Recommended first moves</s-badge>
            </div>
            <s-heading>Start where intent is strongest</s-heading>
            <div style={{ marginTop: 8 }}>
              <s-paragraph tone="subdued">
                Begin with product page and cart widgets — these are where buying intent runs highest. Starting here usually brings the quickest early wins.
              </s-paragraph>
            </div>
          </div>

          <div style={{ ...shellCardStyle, padding: 18 }}>
            <div style={{ marginBottom: 12 }}>
              <s-text tone="subdued">Surface guides</s-text>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <s-text>PDP</s-text>
                <div style={{ marginTop: 4 }}>
                  <s-text tone="subdued">Showcase bundles and add-ons while shoppers explore a product.</s-text>
                </div>
              </div>
              <div>
                <s-text>Cart</s-text>
                <div style={{ marginTop: 4 }}>
                  <s-text tone="subdued">Encourage bigger carts with free-shipping goals and bundle completions.</s-text>
                </div>
              </div>
              <div>
                <s-text>Checkout</s-text>
                <div style={{ marginTop: 4 }}>
                  <s-text tone="subdued">Add quick, low-friction extras like protection or gift wrap before payment.</s-text>
                </div>
              </div>
              <div>
                <s-text>Post-purchase</s-text>
                <div style={{ marginTop: 4 }}>
                  <s-text tone="subdued">Lift order value with a one-click offer right after checkout.</s-text>
                </div>
              </div>
              <div>
                <s-text>Accounts</s-text>
                <div style={{ marginTop: 4 }}>
                  <s-text tone="subdued">Win repeat orders with reorder, refill, and subscription offers.</s-text>
                </div>
              </div>
            </div>
          </div>
        </div>
      </s-section>

      <ui-modal id="delete-upsell-modal" variant="small">
        <div style={{ padding: 16 }}>
          <p style={{ margin: 0 }}>
            This will permanently delete the funnel and all connected configuration.
          </p>
        </div>
        <ui-title-bar title="Delete funnel?">
          <button variant="primary" tone="critical" onClick={confirmDelete} disabled={isSubmitting}>
            Delete
          </button>
          <button onClick={closeDelete}>Cancel</button>
        </ui-title-bar>
      </ui-modal>

      <ui-modal id="archive-upsell-modal" variant="small">
        <div style={{ padding: 16 }}>
          <p style={{ margin: 0 }}>
            This will pause <strong>{archiveTitle || "this funnel"}</strong> and stop its offers
            from showing until you reactivate it.
          </p>
        </div>
        <ui-title-bar title="Archive funnel?">
          <button variant="primary" onClick={confirmArchive} disabled={isSubmitting}>
            Archive
          </button>
          <button onClick={closeArchive}>Cancel</button>
        </ui-title-bar>
      </ui-modal>

      <ui-modal id="unarchive-upsell-modal" variant="small">
        <div style={{ padding: 16 }}>
          <p style={{ margin: 0 }}>
            This will reactivate <strong>{unarchiveTitle || "this funnel"}</strong> and make its
            offers eligible to show again.
          </p>
        </div>
        <ui-title-bar title="Unarchive funnel?">
          <button variant="primary" onClick={confirmUnarchive} disabled={isSubmitting}>
            Unarchive
          </button>
          <button onClick={closeUnarchive}>Cancel</button>
        </ui-title-bar>
      </ui-modal>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);