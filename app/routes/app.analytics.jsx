import React from "react";
import { useLoaderData, useLocation, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import {
  getCurrentAppPlan,
  canShopAccessFeature,
} from "../featureAccess.server";
import {
  getBundleAnalyticsDaily,
  getBundleAnalyticsPerformance,
  getBundleAnalyticsByType,
  getBundleOrderComparison,
  getBundleAnalyticsSummary,
} from "../models/bundle.server";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
  Pie,
  PieChart,
} from "recharts";

/* ---------------------------------------------------------
   LOADER
--------------------------------------------------------- */

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const appPlan = await getCurrentAppPlan(session.shop);

const hasBasicAnalytics = await canShopAccessFeature(
  session.shop,
  "BASIC_ANALYTICS"
);

const hasFullAnalytics = await canShopAccessFeature(
  session.shop,
  "FULL_ANALYTICS"
);

if (!hasBasicAnalytics && !hasFullAnalytics) {
  return {
    locked: true,
    hasBasicAnalytics: false,
    hasFullAnalytics: false,
  };
}

  const url = new URL(request.url);

  const compare = url.searchParams.get("compare") || "previous";
  const preset = url.searchParams.get("preset") || "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (value) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) return null;

    return date;
  };

  let startDate;
  let endDate;

  if (preset === "today") {
    startDate = new Date(today);
    endDate = new Date(today);
  } else if (preset === "custom") {
    startDate = parseDate(url.searchParams.get("startDate"));
    endDate = parseDate(url.searchParams.get("endDate"));

    if (!startDate || !endDate || startDate > endDate) {
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);
      endDate = new Date(today);
    }
  } else {
    const days = Number(url.searchParams.get("days")) || 30;
    const validDays = [7, 30].includes(days) ? days : 30;

    endDate = new Date(today);
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (validDays - 1));
  }

  const days = Math.round(
    (endDate - startDate) / (24 * 60 * 60 * 1000)
  ) + 1;

  endDate.setHours(23, 59, 59, 999);

  const comparisonStartDate = new Date(startDate);
  comparisonStartDate.setDate(comparisonStartDate.getDate() - days);

  const comparisonEndDate = new Date(startDate);
  comparisonEndDate.setDate(comparisonEndDate.getDate() - 1);
  comparisonEndDate.setHours(23, 59, 59, 999);

 const [
  stats,
  daily,
  performance,
  byType,
  comparisonDaily,
  orderComparison,
  previousPerformance,
  previousByType,
  previousOrderComparison,
] = await Promise.all([
  hasBasicAnalytics
    ? getBundleAnalyticsSummary(
        session.shop,
        startDate,
        endDate
      )
    : Promise.resolve(null),

  hasBasicAnalytics
    ? getBundleAnalyticsDaily(
        session.shop,
        startDate,
        endDate
      )
    : Promise.resolve([]),

  hasFullAnalytics
    ? getBundleAnalyticsPerformance(
        session.shop,
        startDate,
        endDate
      )
    : Promise.resolve([]),

  hasFullAnalytics
    ? getBundleAnalyticsByType(
        session.shop,
        startDate,
        endDate
      )
    : Promise.resolve([]),

  hasBasicAnalytics && compare === "previous"
    ? getBundleAnalyticsDaily(
        session.shop,
        comparisonStartDate,
        comparisonEndDate
      )
    : Promise.resolve([]),

  hasFullAnalytics
    ? getBundleOrderComparison(
        session.shop,
        admin,
        startDate,
        endDate
      )
    : Promise.resolve(null),

  hasFullAnalytics && compare === "previous"
    ? getBundleAnalyticsPerformance(
        session.shop,
        comparisonStartDate,
        comparisonEndDate
      )
    : Promise.resolve([]),

  hasFullAnalytics && compare === "previous"
    ? getBundleAnalyticsByType(
        session.shop,
        comparisonStartDate,
        comparisonEndDate
      )
    : Promise.resolve([]),

  hasFullAnalytics && compare === "previous"
    ? getBundleOrderComparison(
        session.shop,
        admin,
        comparisonStartDate,
        comparisonEndDate
      )
    : Promise.resolve(null),
]);

  return {
  stats,
daily,
performance,
byType,
comparisonDaily,
orderComparison,
previousPerformance,
previousByType,
previousOrderComparison,
hasBasicAnalytics,
hasFullAnalytics,
};
};

/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */

const formatMoney = (value) =>
  `$${Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  function getPercentageChange(current, previous) {
  if (!previous || previous === 0) return null;

  return ((current - previous) / previous) * 100;
}

const formatNumber = (value) =>
  Number(value ?? 0).toLocaleString("en-US");

const formatDate = (date) => {
  const d = new Date(date);

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const typeLabel = (type) => {
  const labels = {
    FIXED: "Fixed",
    MIX_MATCH: "Mix & Match",
    VOLUME: "Volume",
    BYOB: "Build Your Own",
    MULTIVARIANT: "Multi-variant",
  };

  return labels[type] || type;
};

const changePercent = (current, previous) => {
  if (!previous) return null;

  return ((current - previous) / previous) * 100;
};

/* ---------------------------------------------------------
   SIMPLE TOOLTIP
--------------------------------------------------------- */

function ChartTooltip({ active, payload, label, money = false }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #dfe3e8",
        borderRadius: "8px",
        padding: "10px 12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "#6d7175",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>

      {payload.map((entry, index) => (
        <div
          key={`${entry.dataKey}-${index}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            fontSize: "13px",
            marginTop: index === 0 ? "0" : "6px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#6d7175",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: entry.color,
              }}
            />

            {entry.name === "previousRevenue"
              ? "Previous period"
              : entry.name || entry.dataKey === "revenue"
              ? entry.name || "Current period"
              : entry.dataKey}
          </div>

          <strong style={{ color: "#202223" }}>
            {money
              ? formatMoney(entry.value)
              : formatNumber(entry.value)}
          </strong>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------
   DROPDOWN
--------------------------------------------------------- */

function ToolbarDropdown({
  label,
  icon,
  open,
  setOpen,
  options,
  value,
  onChange,
  title,
}) {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        title={title}
        onClick={() => setOpen(!open)}
        style={{
          height: "40px",
          padding: "0 13px",
          background: "#fff",
          border: "1px solid #c9cdd2",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "14px",
          fontWeight: 500,
          color: "#202223",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: "15px" }}>{icon}</span>
        {label}
        <span
          style={{
            fontSize: "12px",
            marginLeft: "3px",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "46px",
            left: 0,
            minWidth: "180px",
            background: "#fff",
            border: "1px solid #dfe3e8",
            borderRadius: "8px",
            padding: "5px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 20,
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                border: "0",
                background:
                  value === option.value
                    ? "#f1f2f3"
                    : "transparent",
                borderRadius: "6px",
                padding: "9px 10px",
                fontSize: "14px",
                color: "#202223",
                cursor: "pointer",
              }}
            >
              {value === option.value ? "✓ " : ""}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   KPI CARD
--------------------------------------------------------- */

function KpiCard({
  title,
  value,
  subtitle,
  change,
  comparison,
  tone = "blue",
}) {
  const tones = {
    yellow: {
      background: "linear-gradient(180deg, #fffbed 0%, #ffffff 100%)",
      accent: "#c45a00",
    },
    purple: {
      background: "linear-gradient(180deg, #f6f1ff 0%, #ffffff 100%)",
      accent: "#7c3aed",
    },
    green: {
      background: "linear-gradient(180deg, #edfff7 0%, #ffffff 100%)",
      accent: "#087f5b",
    },
    blue: {
      background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
      accent: "#2563eb",
    },
  };

  const selectedTone = tones[tone] || tones.blue;

  return (
    <div
      style={{
        border: "1px solid #dfe3e8",
        borderRadius: "22px",
        padding: "24px",
        background: selectedTone.background,
        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.04)",
        minHeight: "150px",
      }}
    >
      <div
        style={{
          width: "50px",
          height: "5px",
          borderRadius: "999px",
          background: selectedTone.accent,
          marginBottom: "22px",
        }}
      />

      <div
        style={{
          fontSize: "16px",
          color: "#202223",
          marginBottom: "14px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "25px",
          fontWeight: 700,
          color: "#202223",
          marginBottom: "12px",
        }}
      >
        {value}
      </div>

      {change !== null && change !== undefined && (
  <div
    style={{
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: "999px",
      background: change >= 0 ? "#d1fae5" : "#fee2e2",
      color: change >= 0 ? "#008060" : "#d72c0d",
      fontSize: "13px",
      fontWeight: 600,
      marginBottom: "10px",
    }}
  >
    {change >= 0 ? "↑" : "↓"}{" "}
    {Math.abs(change).toFixed(1)}%
  </div>
)}
      <div
        style={{
          fontSize: "15px",
          lineHeight: 1.5,
          color: "#202223",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}
/* ---------------------------------------------------------
   SECTION CARD
--------------------------------------------------------- */

function SectionCard({
  title,
  description,
  children,
  style = {},
}) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #dfe3e8",
        borderRadius: "12px",
        padding: "22px",
        ...style,
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "18px",
            lineHeight: 1.35,
            fontWeight: 650,
            color: "#202223",
          }}
        >
          {title}
        </h2>

        {description && (
          <p
            style={{
              margin: "5px 0 0",
              fontSize: "13px",
              color: "#6d7175",
            }}
          >
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

/* ---------------------------------------------------------
   EMPTY STATE
--------------------------------------------------------- */

function EmptyState({ text }) {
  return (
    <div
      style={{
        height: "260px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6d7175",
        fontSize: "14px",
      }}
    >
      {text}
    </div>
  );
}

function LockedAnalyticsCard({ title, description }) {
  return (
    <SectionCard
      title={title}
      description={description}
      style={{ marginBottom: "16px" }}
    >
      <div
        style={{
          minHeight: "220px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "30px 20px",
          background: "#f9fafb",
          borderRadius: "10px",
        }}
      >
        <div style={{ fontSize: "28px", marginBottom: "12px" }}>
          Locked
        </div>

        <div
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#202223",
            marginBottom: "8px",
          }}
        >
          This feature is locked
        </div>

        <div
          style={{
            fontSize: "14px",
            color: "#6d7175",
            marginBottom: "18px",
          }}
        >
          Subscribe to this plan to access this feature.
        </div>

        <button
          type="button"
          onClick={() => window.location.href = "/app/billing"}
          style={{
            padding: "9px 16px",
            border: "1px solid #202223",
            borderRadius: "7px",
            background: "#202223",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          View plans
        </button>
      </div>
    </SectionCard>
  );
}

/* ---------------------------------------------------------
   ANALYTICS
--------------------------------------------------------- */

export default function Analytics() {
  const data = useLoaderData();
  const location = useLocation();
  const navigate = useNavigate();

  const [compareOpen, setCompareOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const initialDateParams = new URLSearchParams(location.search);
  const todayDate = new Date().toLocaleDateString("en-CA");

  const [customOpen, setCustomOpen] = React.useState(false);
  const [dateMode, setDateMode] = React.useState(
    initialDateParams.get("dateMode") || "range"
  );
  const [customStartDate, setCustomStartDate] = React.useState(
    initialDateParams.get("startDate") || todayDate
  );
  const [customEndDate, setCustomEndDate] = React.useState(
    initialDateParams.get("endDate") || todayDate
  );


  if (data.locked) {
    return (
      <s-page heading="Analytics">
        <div
          style={{
            minHeight: "70vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#fff",
              border: "1px solid #e1e3e5",
              borderRadius: "12px",
              padding: "48px 40px",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                margin: "0 auto 20px",
                borderRadius: "50%",
                background: "#f1f1f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
              }}
            >
              🔒
            </div>

            <h2
              style={{
                margin: "0 0 10px",
                fontSize: "24px",
                fontWeight: 600,
              }}
            >
              Analytics is locked
            </h2>

            <p
              style={{
                margin: "0 auto 24px",
                maxWidth: "420px",
                color: "#616161",
                fontSize: "15px",
                lineHeight: 1.5,
              }}
            >
              Analytics is available on the Starter plan and above.
              Upgrade your plan to access bundle analytics and performance
              insights.
            </p>

            <s-button
              variant="primary"
              onClick={() => {
                window.location.href = "/app/billing";
              }}
            >
              Upgrade plan
            </s-button>
          </div>
        </div>
      </s-page>
    );
  }

  const {
    stats,
    daily,
    performance,
    byType,
    comparisonDaily,
    orderComparison,
    previousPerformance,
    previousByType,
    previousOrderComparison,
    hasBasicAnalytics,
    hasFullAnalytics,
  } = data;
  const params = new URLSearchParams(location.search);

  const days =
    Number(params.get("days") || params.get("range")) || 30;

  const compare =
   params.get("compare") || "previous";

const formatDateLabel = (value) => {
  if (!value) return "";

  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const periodLabel =
  params.get("preset") === "today"
    ? "Today"
    : params.get("preset") === "custom"
      ? params.get("dateMode") === "single"
        ? formatDateLabel(params.get("startDate"))
        : `${formatDateLabel(params.get("startDate"))} – ${formatDateLabel(params.get("endDate"))}`
      : days === 7
        ? "Last 7 days"
        : days === 90
          ? "Last 90 days"
          : "Last 30 days";
          
  /* -------------------------------------------------------
     PERIOD DATA
  ------------------------------------------------------- */

  const currentRevenue = daily.reduce(
    (sum, item) =>
      sum + Number(item.revenue ?? 0),
    0
  );

  const previousRevenue = comparisonDaily.reduce(
    (sum, item) =>
      sum + Number(item.revenue ?? 0),
    0
  );

  const currentUnits = daily.reduce(
    (sum, item) =>
      sum + Number(item.quantity ?? 0),
    0
  );

  const previousUnits = comparisonDaily.reduce(
    (sum, item) =>
      sum + Number(item.quantity ?? 0),
    0
  );

  const currentOrders = daily.reduce(
    (sum, item) =>
      sum + Number(item.orders ?? 0),
    0
  );

  const currentAOV = currentOrders > 0 ? currentRevenue / currentOrders : 0;

  const previousOrders = comparisonDaily.reduce(
    (sum, item) =>
      sum + Number(item.orders ?? 0),
    0
  );

  const previousAOV =
  previousOrders > 0
    ? previousRevenue / previousOrders
    : 0;

  const revenueChange =  compare === "previous"  ? changePercent(currentRevenue, previousRevenue): null;

  const unitsChange =  compare === "previous"  ? changePercent(currentUnits, previousUnits)  : null;

  const ordersChange =  compare === "previous"  ? changePercent(currentOrders, previousOrders)  : null;

  const aovChange =
  compare === "previous"
    ? getPercentageChange(currentAOV, previousAOV)
    : null;
  /* -------------------------------------------------------
     CHART DATA
  ------------------------------------------------------- */

  const dailyByDate = daily.reduce((map, item) => {
  const dateKey = new Date(item.date)
    .toISOString()
    .slice(0, 10);

  if (!map[dateKey]) {
    map[dateKey] = {
      date: dateKey,
      revenue: 0,
      units: 0,
      orders: 0,
    };
  }

  map[dateKey].revenue += Number(
    item.revenue ?? 0
  );

  map[dateKey].units += Number(
    item.quantity ?? 0
  );

  map[dateKey].orders += Number(
    item.orders ?? 0
  );

  return map;
}, {});

const aggregatedDaily = Object.values(
  dailyByDate
).sort(
  (a, b) =>
    new Date(a.date) - new Date(b.date)
);

const previousDailyByDate = comparisonDaily.reduce(
  (map, item) => {
    const dateKey = new Date(item.date)
      .toISOString()
      .slice(0, 10);

    if (!map[dateKey]) {
      map[dateKey] = {
        date: dateKey,
        revenue: 0,
        units: 0,
        orders: 0,
      };
    }

    map[dateKey].revenue += Number(item.revenue ?? 0);
    map[dateKey].units += Number(item.quantity ?? 0);
    map[dateKey].orders += Number(item.orders ?? 0);

    return map;
  },
  {}
);

const aggregatedPreviousDaily = Object.values(
  previousDailyByDate
).sort(
  (a, b) => new Date(a.date) - new Date(b.date)
);

const revenueChartData = aggregatedDaily.map(
  (item, index) => ({
    date: formatDate(item.date),
    revenue: item.revenue,
    previousRevenue:
      compare === "previous"
        ? aggregatedPreviousDaily[index]?.revenue ?? 0
        : undefined,
  })
);

const unitsChartData = aggregatedDaily.map(
  (item, index) => ({
    date: formatDate(item.date),
    units: item.units,
    previousUnits:
      compare === "previous"
        ? aggregatedPreviousDaily[index]?.units ?? 0
        : undefined,
  })
);

  const typeChartData = byType.map((item) => {
  const previousItem = previousByType?.find(
    (previous) =>
      previous.type === item.type
  );

  return {
    name: typeLabel(item.type),
    type: item.type,
    revenue: Number(item.revenue ?? 0),
    previousRevenue: Number(
      previousItem?.revenue ?? 0
    ),
  };
});

  const topBundles = performance
    .slice()
    .sort(
      (a, b) =>
        Number(b.totalRevenue ?? 0) -
        Number(a.totalRevenue ?? 0)
    )
    .slice(0, 5)
    .map((item) => ({
       bundleId: item.bundleId,
      name: item.bundle?.title ?? "Unknown bundle",
      revenue: Number(item.totalRevenue ?? 0),
    }));

  const revenueByBundle = performance
  .slice()
  .sort(
    (a, b) =>
      Number(b.totalRevenue ?? 0) -
      Number(a.totalRevenue ?? 0)
  )
  .map((item) => {
    const previousItem = previousPerformance.find(
      (previous) =>
        previous.bundleId === item.bundleId
    );

    const previousRevenue = Number(
  previousItem?.totalRevenue ?? 0
);

    return {
      bundleId: item.bundleId,
      name: item.bundle?.title ?? "Unknown",
      revenue: Number(item.totalRevenue ?? 0),
      previousRevenue: Number(
        previousItem?.totalRevenue ?? 0
      ),
    };
  });

  /* -------------------------------------------------------
     NAVIGATION
  ------------------------------------------------------- */

  const changePreset = (preset, rangeDays) => {
    const next = new URLSearchParams(location.search);

    next.delete("startDate");
    next.delete("endDate");

    if (preset === "today") {
      next.set("preset", "today");
      next.delete("days");
    } else {
      next.delete("preset");
      next.set("days", String(rangeDays));
    }

    navigate(`?${next.toString()}`);
  };

  const applyCustomDates = (mode, startDate, endDate) => {
    const next = new URLSearchParams(location.search);

    next.set("preset", "custom");
    next.set("dateMode", mode);
    next.set("startDate", startDate);
    next.set("endDate", mode === "single" ? startDate : endDate);
    next.delete("days");

    navigate(`?${next.toString()}`);
  };
  const changeComparison = (value) => {
    const next = new URLSearchParams(location.search);

    if (value === "none") {
      next.set("compare", "none");
    } else {
      next.set("compare", "previous");
    }

    navigate(`?${next.toString()}`);
  };

  /* -------------------------------------------------------
     EXPORT
  ------------------------------------------------------- */

  const exportCsv = () => {
    const rows = [
      [
        "Bundle",
        "Type",
        "Revenue",
        "Units",
        "Orders",
        "AOV",
      ],
      ...performance.map((item) => {
        const revenue =
          Number(item.totalRevenue ?? 0);

        const orders =
          Number(item.totalOrders ?? 0);

        return [
          item.bundle?.title ?? "Unknown bundle",
          item.bundle?.type ?? "-",
          revenue.toFixed(2),
          item.totalQuantity ?? 0,
          orders,
          orders > 0
            ? (revenue / orders).toFixed(2)
            : "0.00",
        ];
      }),
    ];

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "bundle-analytics.csv";
    link.click();

    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const rangeLabel =
    params.get("preset") === "today"
      ? "Today"
      : params.get("preset") === "custom"
        ? "Custom"
        : days === 7
          ? "Last 7 days"
          : "Last 30 days";

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <s-page heading="Analytics">
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "24px 20px 60px",
        }}
      >
        {/* -------------------------------------------------
            TOOLBAR
        ------------------------------------------------- */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            marginBottom: "28px",
          }}
        >
                    <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setCustomOpen(!customOpen)}
              style={{
                height: "40px",
                padding: "0 13px",
                background: "#fff",
                border: "1px solid #c9cdd2",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#202223",
                cursor: "pointer",
              }}
            >
              ◷ {rangeLabel} <span>▾</span>
            </button>

            {customOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "46px",
                  left: 0,
                  width: "280px",
                  background: "#fff",
                  border: "1px solid #dfe3e8",
                  borderRadius: "8px",
                  padding: "12px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  zIndex: 30,
                }}
              >
                {[
                  { label: "Today", action: () => changePreset("today") },
                  { label: "Last 7 days", action: () => changePreset("7", 7) },
                  { label: "Last 30 days", action: () => changePreset("30", 30) },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      item.action();
                      setCustomOpen(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "9px",
                      border: 0,
                      borderRadius: "5px",
                      background: "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    {item.label}
                  </button>
                ))}

                <div
                  style={{
                    borderTop: "1px solid #e5e7eb",
                    margin: "8px 0",
                    paddingTop: "10px",
                  }}
                >
                  <strong style={{ fontSize: "14px" }}>Custom</strong>

                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button
                      type="button"
                      onClick={() => setDateMode("single")}
                      style={{
                        flex: 1,
                        padding: "7px",
                        border: "1px solid #c9cdd2",
                        borderRadius: "5px",
                        background: dateMode === "single" ? "#f1f2f3" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Single Date
                    </button>

                    <button
                      type="button"
                      onClick={() => setDateMode("range")}
                      style={{
                        flex: 1,
                        padding: "7px",
                        border: "1px solid #c9cdd2",
                        borderRadius: "5px",
                        background: dateMode === "range" ? "#f1f2f3" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Date Range
                    </button>
                  </div>

                  <label style={{ display: "block", marginTop: "12px", fontSize: "13px" }}>
                    {dateMode === "single" ? "Select date" : "Start date"}
                    <input
                      type="date"
                      value={customStartDate}
                      max={todayDate}
                      onChange={(event) => setCustomStartDate(event.target.value)}
                      style={{
                        display: "block",
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "8px",
                        marginTop: "5px",
                        border: "1px solid #c9cdd2",
                        borderRadius: "5px",
                      }}
                    />
                  </label>

                  {dateMode === "range" && (
                    <label style={{ display: "block", marginTop: "10px", fontSize: "13px" }}>
                      End date
                      <input
                        type="date"
                        value={customEndDate}
                        min={customStartDate}
                        max={todayDate}
                        onChange={(event) => setCustomEndDate(event.target.value)}
                        style={{
                          display: "block",
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "8px",
                          marginTop: "5px",
                          border: "1px solid #c9cdd2",
                          borderRadius: "5px",
                        }}
                      />
                    </label>
                  )}

                  <button
                    type="button"
                    disabled={
                      !customStartDate ||
                      (dateMode === "range" &&
                        (!customEndDate || customStartDate > customEndDate))
                    }
                    onClick={() => {
                      applyCustomDates(dateMode, customStartDate, customEndDate);
                      setCustomOpen(false);
                    }}
                    style={{
                      width: "100%",
                      marginTop: "14px",
                      padding: "10px",
                      border: 0,
                      borderRadius: "6px",
                      background: "#303030",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
<ToolbarDropdown
            icon="↔"
            label={
              compare === "previous"
                ? "Previous period"
                : "No comparison"
            }
            value={compare}
            title="Compares your selected date range with the previous period."
            open={compareOpen}
            setOpen={setCompareOpen}
            options={[
              {
                label: "No comparison",
                value: "none",
              },
              {
                label: "Previous period",
                value: "previous",
              },
            ]}
            onChange={changeComparison}
          />

          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() =>
                setExportOpen(!exportOpen)
              }
              style={{
                height: "40px",
                padding: "0 13px",
                background: "#fff",
                border: "1px solid #c9cdd2",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#202223",
                cursor: "pointer",
              }}
            >
              ↓
              <span>Export</span>
              <span>▾</span>
            </button>

            {exportOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "46px",
                  left: 0,
                  width: "170px",
                  background: "#fff",
                  border: "1px solid #dfe3e8",
                  borderRadius: "8px",
                  padding: "5px",
                  boxShadow:
                    "0 4px 16px rgba(0,0,0,0.12)",
                  zIndex: 20,
                }}
              >
                <button
                  type="button"
                  onClick={exportCsv}
                  style={{
                    width: "100%",
                    border: 0,
                    background: "transparent",
                    textAlign: "left",
                    padding: "9px 10px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Export CSV
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    setExportOpen(false);
                  }}
                  style={{
                    width: "100%",
                    border: 0,
                    background: "transparent",
                    textAlign: "left",
                    padding: "9px 10px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Print / Save PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* -------------------------------------------------
            COMPARISON SUMMARY
        ------------------------------------------------- */}

        {compare === "previous" &&
          revenueChange !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "24px",
                padding: "12px 0",
                marginBottom: "20px",
                fontSize: "13px",
                color: "#5c5f62",
              }}
            >
              <span>
                Revenue{" "}
                <strong
                  style={{
                    color:
                      revenueChange >= 0
                        ? "#008060"
                        : "#d72c0d",
                  }}
                >
                  {revenueChange >= 0
                    ? "↑"
                    : "↓"}{" "}
                  {Math.abs(
                    revenueChange
                  ).toFixed(1)}
                  %
                </strong>
              </span>

              <span>
                Orders{" "}
                <strong
                  style={{
                    color:
                      ordersChange >= 0
                        ? "#008060"
                        : "#d72c0d",
                  }}
                >
                  {ordersChange >= 0
                    ? "↑"
                    : "↓"}{" "}
                  {Math.abs(
                    ordersChange ?? 0
                  ).toFixed(1)}
                  %
                </strong>
              </span>

              <span>
                Units{" "}
                <strong
                  style={{
                    color:
                      unitsChange >= 0
                        ? "#008060"
                        : "#d72c0d",
                  }}
                >
                  {unitsChange >= 0
                    ? "↑"
                    : "↓"}{" "}
                  {Math.abs(
                    unitsChange ?? 0
                  ).toFixed(1)}
                  %
                </strong>
              </span>
            </div>
          )}

        {/* -------------------------------------------------
            BASIC ANALYTICS
        ------------------------------------------------- */}

        <div style={{ position: "relative" }}>
          <div
            style={{
              filter: !hasBasicAnalytics ? "blur(6px)" : "none",
              pointerEvents: !hasBasicAnalytics ? "none" : "auto",
              userSelect: !hasBasicAnalytics ? "none" : "auto",
            }}
          >
        
        <div
          style={{
            fontSize: "16px",
            fontWeight: 650,
            marginBottom: "12px",
            color: "#202223",
          }}
        >
          Bundle performance
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: "14px",
            marginBottom: "16px",
          }}
        >
          <KpiCard
            title="Total bundle sales"
            value={formatMoney(
              stats.totalRevenue
            )}
            subtitle={periodLabel}
            change={revenueChange}
            tone="yellow"
          />

          <KpiCard
            title="Bundles sold"
            value={formatNumber(
              stats.totalUnitsSold
            )}
            subtitle={periodLabel}
            change={unitsChange}
            tone="purple"
          />

          <KpiCard
            title="Bundle orders"
            value={formatNumber(
              stats.totalOrders
            )}
            subtitle={periodLabel}
            change={ordersChange}
            tone="green"
          />

          <KpiCard
            title="Average order value"
            value={formatMoney(currentAOV)}
            subtitle={periodLabel}
            change={aovChange}
            tone="blue"
          />
        </div>

        {/* -------------------------------------------------
            REVENUE OVER TIME
        ------------------------------------------------- */}

        <SectionCard
          title="Bundle revenue"
          description="Revenue generated from bundles during the selected period."
          style={{ marginBottom: "16px" }}
        >
          {revenueChartData.length === 0 ? (
            <EmptyState text="No revenue data for this date range." />
          ) : (
            <div style={{ width: "100%", height: 310 }}>
              <ResponsiveContainer>
                <AreaChart
                  data={revenueChartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="revenueFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#5c6ac4"
                        stopOpacity={0.14}
                      />
                      <stop
                        offset="100%"
                        stopColor="#5c6ac4"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="#e6e8eb"
                    strokeDasharray="3 4"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 12,
                      fill: "#6d7175",
                    }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    tick={{
                      fontSize: 12,
                      fill: "#6d7175",
                    }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      `$${value}`
                    }
                    width={55}
                  />

                  <Tooltip
                    content={
                      <ChartTooltip money />
                    }
                  />

                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Current period"
                    stroke="#5c6ac4"
                    strokeWidth={2}
                    fill="url(#revenueFill)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      strokeWidth: 2,
                    }}
                  />

                  {compare === "previous" && (
                    <Area
                      type="monotone"
                      dataKey="previousRevenue"
                      name="Previous period"
                      stroke="#a6abb2"
                      fill="transparent"
                      strokeWidth={2}
                      strokeDasharray="6 6"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {/* -------------------------------------------------
            SOLD OVER TIME + TYPE
        ------------------------------------------------- */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.35fr) minmax(0, 0.65fr)",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          <SectionCard
            title="Bundles sold"
            description="Bundle units sold during the selected period."
          >
            {unitsChartData.length === 0 ? (
              <EmptyState text="No sales data for this date range." />
            ) : (
              <div style={{ width: "100%", height: 290 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={unitsChartData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      stroke="#e6e8eb"
                      strokeDasharray="3 4"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 12,
                        fill: "#6d7175",
                      }}
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      tick={{
                        fontSize: 12,
                        fill: "#6d7175",
                      }}
                      tickLine={false}
                      axisLine={false}
                      width={35}
                    />

                    <Tooltip
                      content={
                        <ChartTooltip />
                      }
                    />

                    <Bar
                      dataKey="units"
                      fill="#5c6ac4"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={22}
                    />
                    {compare === "previous" && (
                      <Bar
                        dataKey="previousUnits"
                        name="Previous period"
                        fill="#a6abb2"
                        radius={[4, 4, 0, 0]}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>

          {hasFullAnalytics ? (
          <SectionCard
            title="Revenue Distribution"
            description="Which bundle types generate the most revenue."
          >
            {typeChartData.length === 0 ? (
              <EmptyState text="No data available." />
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {typeChartData.map(
                  (item, index) => {
                    const total =
                      typeChartData.reduce(
                        (sum, x) =>
                          sum +
                          Number(
                            x.revenue
                          ),
                        0
                      );

                    const percentage =
                      total > 0
                        ? (item.revenue /
                            total) *
                          100
                        : 0;

                    return (
                      <div
                        key={item.name}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "center",
                            marginBottom:
                              "7px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              gap: "8px",
                              fontSize:
                                "14px",
                              color:
                                "#202223",
                            }}
                          >
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius:
                                  "50%",
                                background:
                                  index === 0
                                    ? "#5c6ac4"
                                    : "#95a0d6",
                              }}
                            />

                            {item.name}
                          </div>

                          <span
                            style={{
                              fontSize:
                                "14px",
                              fontWeight: 600,
                            }}
                          >
                            <div
                              style={{
                                textAlign: "right",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "14px",
                                  fontWeight: 600,
                                }}
                              >
                                {formatMoney(item.revenue)}
                              </div>

                              {compare === "previous" && (
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#8c9196",
                                    marginTop: "3px",
                                  }}
                                >
                                  Prev: {formatMoney(item.previousRevenue)}
                                </div>
                              )}
                            </div>
                          </span>
                        </div>

                        <div
                          style={{
                            height: "7px",
                            background:
                              "#f1f2f3",
                            borderRadius:
                              "4px",
                            overflow:
                              "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${percentage}%`,
                              background:
                                index === 0
                                  ? "#5c6ac4"
                                  : "#95a0d6",
                              borderRadius:
                                "4px",
                            }}
                          />
                        </div>

                        <div
                          style={{
                            marginTop:
                              "4px",
                            fontSize:
                              "12px",
                            color:
                              "#8c9196",
                          }}
                        >
                          {percentage.toFixed(
                            1
                          )}
                          %
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </SectionCard>
        ) : (
  <LockedAnalyticsCard
      title="Full Analytics Dashboard"
      description="Available on the Growth plan."
   />
)}
  </div>
  </div>

  {!hasBasicAnalytics && (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.25)",
        zIndex: 10,
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "24px 32px",
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ fontSize: "20px", fontWeight: 600 }}>
          Unlock Basic Analytics
        </div>

        <div
          style={{
            marginTop: "8px",
            marginBottom: "16px",
            color: "#6d7175",
          }}
        >
          Available on Starter plan and above.
        </div>

        <s-button onClick={() => navigate("/app/billing")}>
          Upgrade to Starter
        </s-button>
      </div>
    </div>
  )}

</div>
        

        {/* -------------------------------------------------
            TOP BUNDLES + REVENUE BY BUNDLE
        ------------------------------------------------- */}
       {hasFullAnalytics && (

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          <SectionCard
            title="Top performing bundles"
            description="Your best-performing bundles by revenue."
          >
            {topBundles.length === 0 ? (
              <EmptyState text="No bundle data available." />
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "17px",
                }}
              >
                {topBundles.map(
                  (item, index) => {
                    const max =
                      topBundles[0]
                        ?.revenue || 1;

                    const percentage =
                      (item.revenue /
                        max) *
                      100;

                      const previousItem =
                        previousPerformance?.find(
                          (previous) =>
                            previous.bundleId === item.bundleId
                        );

                      const previousRevenue = Number(
                        previousItem?.totalRevenue ?? 0
                      );

                    return (
                      <div
                        key={item.name}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "28px 1fr auto",
                            gap: "10px",
                            alignItems:
                              "center",
                            marginBottom:
                              "7px",
                          }}
                        >
                          <span
                            style={{
                              fontSize:
                                "13px",
                              color:
                                "#8c9196",
                            }}
                          >
                            {index + 1}
                          </span>

                          <span
                            style={{
                              fontSize:
                                "14px",
                              color:
                                "#202223",
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {item.name}
                          </span>

                          <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 600,
                            }}
                          >
                            {formatMoney(item.revenue)}
                          </div>

                          {compare === "previous" && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#8c9196",
                                marginTop: "3px",
                              }}
                            >
                              Prev: {formatMoney(previousRevenue)}
                            </div>
                          )}
                        </div>
                        </div>

                        <div
                          style={{
                            marginLeft:
                              "38px",
                            height: "6px",
                            background:
                              "#f1f2f3",
                            borderRadius:
                              "3px",
                            overflow:
                              "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${percentage}%`,
                              height: "100%",
                              background:
                                "#5c6ac4",
                              borderRadius:
                                "3px",
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Revenue by bundle"
            description="Revenue generated by individual bundles."
          >
            {revenueByBundle.length === 0 ? (
              <EmptyState text="No bundle data available." />
            ) : (
              <div
                style={{
                  height: 300,
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                <div
                  style={{
                    height: Math.max(300, revenueByBundle.length * 55),
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={revenueByBundle}
                    layout="vertical"
                    margin={{
                      top: 0,
                      right: 15,
                      left: 5,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      stroke="#e6e8eb"
                      horizontal={false}
                    />

                    <XAxis
                      type="number"
                      tick={{
                        fontSize: 11,
                        fill: "#6d7175",
                      }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) =>
                        `$${value}`
                      }
                    />

                    <YAxis
                      type="category"
                      dataKey="name"
                      width={105}
                      tick={{
                        fontSize: 11,
                        fill: "#5c5f62",
                      }}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip
                      content={
                        <ChartTooltip money />
                      }
                    />

                    <Bar
                      dataKey="revenue"
                      fill="#5c6ac4"
                      radius={[
                        0, 3, 3, 0,
                      ]}
                      maxBarSize={20}
                    />
                    {compare === "previous" && (
                      <Bar
                        dataKey="previousRevenue"
                        name="Previous period"
                        fill="#a6abb2"
                        radius={[4, 4, 0, 0]}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
  </div>
</div>
            )}
          </SectionCard>
        </div>
       )}

        {/* -------------------------------------------------
            WITH / WITHOUT BUNDLES
        ------------------------------------------------- */}
{hasFullAnalytics ? (
        <SectionCard
  title="With bundles vs without bundles"
  description="See how bundle orders compare with orders that do not include bundles."
  style={{ marginBottom: "16px" }}
>
  {(() => {
    const withBundles =
      orderComparison?.withBundles ?? {};

    const withoutBundles =
      orderComparison?.withoutBundles ?? {};

      const previousWithBundles =
  previousOrderComparison?.withBundles ?? {};

const previousWithoutBundles =
  previousOrderComparison?.withoutBundles ?? {};

  const previousBundleOrders = Number(
  previousWithBundles.orders ?? 0
);

const previousNonBundleOrders = Number(
  previousWithoutBundles.orders ?? 0
);

const previousBundleRevenue = Number(
  previousWithBundles.revenue ?? 0
);

const previousNonBundleRevenue = Number(
  previousWithoutBundles.revenue ?? 0
);

    const bundleOrders = Number(
      withBundles.orders ?? 0
    );

    const nonBundleOrders = Number(
      withoutBundles.orders ?? 0
    );

    const totalOrders =
      bundleOrders + nonBundleOrders;

    const bundleRevenue = Number(
      withBundles.revenue ?? 0
    );

    const nonBundleRevenue = Number(
      withoutBundles.revenue ?? 0
    );

    const totalRevenue =
      bundleRevenue + nonBundleRevenue;

    const bundleOrderPercent =
      totalOrders > 0
        ? (bundleOrders / totalOrders) * 100
        : 0;

    const bundleRevenuePercent =
      totalRevenue > 0
        ? (bundleRevenue / totalRevenue) * 100
        : 0;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: "24px",
        }}
      >
        {/* Orders */}
        <div
          style={{
            border: "1px solid #e6e8eb",
            borderRadius: "10px",
            padding: "20px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "18px",
            }}
          >
            Orders
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <div
              style={{
                width: "115px",
                height: "115px",
                borderRadius: "50%",
                background: `conic-gradient(
                  #5c6ac4 0 ${bundleOrderPercent}%,
                  #8c9198 ${bundleOrderPercent}% 100%
                )`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <strong
                  style={{
                    fontSize: "20px",
                    color: "#202223",
                  }}
                >
                  {bundleOrderPercent.toFixed(0)}%
                </strong>

                <span
                  style={{
                    fontSize: "11px",
                    color: "#6d7175",
                  }}
                >
                  bundles
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "13px",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    color: "#6d7175",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#5c6ac4",
                    }}
                  />
                  With bundles
                </div>

                <div>
                <strong
                  style={{
                    display: "block",
                    marginTop: "3px",
                    fontSize: "20px",
                  }}
                >
                  {formatNumber(bundleOrders)}
                </strong>

                {compare === "previous" && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#8c9198",
                      marginTop: "3px",
                    }}
                  >
                    Prev: {formatNumber(previousBundleOrders)}
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    color: "#6d7175",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#8c9198",
                    }}
                  />
                  Without bundles
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: "3px",
                    fontSize: "20px",
                  }}
                >
                  {formatNumber(
                    nonBundleOrders
                  )}
                  {compare === "previous" && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#8c9196",
                        marginTop: "3px",
                      }}
                    >
                      Prev: {formatNumber(previousNonBundleOrders)}
                    </div>
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Revenue */}
        <div
          style={{
            border: "1px solid #e6e8eb",
            borderRadius: "10px",
            padding: "20px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "18px",
            }}
          >
            Revenue
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <div
              style={{
                width: "115px",
                height: "115px",
                borderRadius: "50%",
                background: `conic-gradient(
                  #5c6ac4 0 ${bundleRevenuePercent}%,
                  #8c9198 ${bundleRevenuePercent}% 100%
                )`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <strong
                  style={{
                    fontSize: "20px",
                    color: "#202223",
                  }}
                >
                  {bundleRevenuePercent.toFixed(
                    0
                  )}%
                </strong>

                <span
                  style={{
                    fontSize: "11px",
                    color: "#6d7175",
                  }}
                >
                  bundles
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "13px",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    color: "#6d7175",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#5c6ac4",
                    }}
                  />
                  With bundles
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: "3px",
                    fontSize: "18px",
                  }}
                >
                  {formatMoney(bundleRevenue)}
                </strong>

                {compare === "previous" && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#8c9198",
                      marginTop: "3px",
                    }}
                  >
                    Prev: {formatMoney(previousBundleRevenue)}
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    color: "#6d7175",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#8c9198",
                    }}
                  />
                  Without bundles
                  </div>

                  <div>
                    <strong
                      style={{
                        display: "block",
                        marginTop: "3px",
                        fontSize: "18px",
                      }}
                    >
                      {formatMoney(nonBundleRevenue)}
                    </strong>

                    {compare === "previous" && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#8c9198",
                          marginTop: "3px",
                        }}
                      >
                        Prev: {formatMoney(previousNonBundleRevenue)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    );
  })()}
</SectionCard>
) : (
  <LockedAnalyticsCard
    title="With bundles vs without bundles"
    description="Compare orders and revenue with and without bundles."
  />
)}
{/* -------------------------------------------------
    AOV
------------------------------------------------- */}
{hasFullAnalytics ? (
<SectionCard
  title="Average order value"
  description="Compare the average order value of orders with and without bundles."
  style={{ marginBottom: "16px" }}
>
  {(() => {
    const bundleAov = Number(
      orderComparison?.withBundles?.aov ?? 0
    );

    const nonBundleAov = Number(
      orderComparison?.withoutBundles?.aov ?? 0
    );

    const previousBundleAov = Number(
      previousOrderComparison?.withBundles?.aov ?? 0
    );

    const previousNonBundleAov = Number(
      previousOrderComparison?.withoutBundles?.aov ?? 0
    );

    const difference = bundleAov - nonBundleAov;

    const percentageHigher =
      nonBundleAov > 0
        ? (difference / nonBundleAov) * 100
        : 0;

    const aovData = [
      {
        name: "With bundles",
        value: bundleAov,
      },
      {
        name: "Without bundles",
        value: nonBundleAov,
      },
    ];

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(280px, 1fr) minmax(0, 1fr)",
          gap: "24px",
          alignItems: "center",
        }}
      >
        {/* Pie chart */}
        <div style={{ width: "100%", height: "280px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={aovData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                <Cell fill="#5c6ac4" />
                <Cell fill="#8c9198" />
              </Pie>

              <Tooltip
                formatter={(value) => formatMoney(value)}
              />

              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison details */}
        <div>
          {/* With bundles */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "14px 0",
              borderBottom: "1px solid #e1e3e5",
            }}
          >
            <span>With bundles</span>

            <div style={{ textAlign: "right" }}>
              <strong>{formatMoney(bundleAov)}</strong>

              {compare === "previous" && (
                <div
                  style={{
                    fontSize: "11px",
                    color: "#8c9198",
                    marginTop: "3px",
                  }}
                >
                  Prev: {formatMoney(previousBundleAov)}
                </div>
              )}
            </div>
          </div>

          {/* Without bundles */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "14px 0",
              borderBottom: "1px solid #e1e3e5",
            }}
          >
            <span>Without bundles</span>

            <div style={{ textAlign: "right" }}>
              <strong>{formatMoney(nonBundleAov)}</strong>

              {compare === "previous" && (
                <div
                  style={{
                    fontSize: "11px",
                    color: "#8c9198",
                    marginTop: "3px",
                  }}
                >
                  Prev: {formatMoney(previousNonBundleAov)}
                </div>
              )}
            </div>
          </div>

          {/* Current-period comparison */}
          {nonBundleAov > 0 && (
            <div
              style={{
                marginTop: "16px",
                padding: "13px 16px",
                background:
                  difference >= 0
                    ? "#f1f8f5"
                    : "#fff4f4",
                borderRadius: "8px",
                fontSize: "14px",
                color:
                  difference >= 0
                    ? "#008060"
                    : "#d72c0d",
              }}
            >
              <strong>
                {difference >= 0 ? "↑" : "↓"}{" "}
                {Math.abs(percentageHigher).toFixed(1)}%
              </strong>{" "}
              {difference >= 0
                ? "higher average order value with bundles"
                : "lower average order value with bundles"}
            </div>
          )}
        </div>
      </div>
    );
  })()}
</SectionCard>
) : (
  <LockedAnalyticsCard
    title="Average order value"
    description="Compare average order value for orders with and without bundles."
  />
)}

        {/* -------------------------------------------------
            DETAILS TABLE
        ------------------------------------------------- */}
{hasFullAnalytics ? (
<SectionCard
  title="Bundle performance details"
  description="Detailed performance of each bundle."
>
  {performance.length === 0 ? (
    <EmptyState text="No bundle data available." />
  ) : (
    <div
  style={{
    maxHeight: "420px",
    overflowY: "auto",
    overflowX: "auto",
  }}
>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "14px",
        }}
      >
        <thead
  style={{
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 2,
  }}
>
          <tr
            style={{
              borderBottom: "1px solid #dfe3e8",
            }}
          >
            <th
              style={{
                textAlign: "left",
                padding: "10px 12px",
                color: "#6d7175",
                fontWeight: 500,
              }}
            >
              Bundle
            </th>

            <th
              style={{
                textAlign: "left",
                padding: "10px 12px",
                color: "#6d7175",
                fontWeight: 500,
              }}
            >
              Type
            </th>

            <th
              style={{
                textAlign: "right",
                padding: "10px 12px",
                color: "#6d7175",
                fontWeight: 500,
              }}
            >
              Revenue
            </th>

            {compare === "previous" && (
              <th
                style={{
                  textAlign: "right",
                  padding: "10px 12px",
                  color: "#6d7175",
                  fontWeight: 500,
                }}
              >
                Previous revenue
              </th>
            )}

            <th
              style={{
                textAlign: "right",
                padding: "10px 12px",
                color: "#6d7175",
                fontWeight: 500,
              }}
            >
              Units sold
            </th>

            <th
              style={{
                textAlign: "right",
                padding: "10px 12px",
                color: "#6d7175",
                fontWeight: 500,
              }}
            >
              Orders
            </th>

            <th
              style={{
                textAlign: "right",
                padding: "10px 12px",
                color: "#6d7175",
                fontWeight: 500,
              }}
            >
              Average order value
            </th>
          </tr>
        </thead>

        <tbody>
          {performance.map((item) => {
            const revenue = Number(
              item.totalRevenue ?? 0
            );

            const orders = Number(
              item.totalOrders ?? 0
            );

            const previousItem =
              previousPerformance?.find(
                (previous) =>
                  previous.bundleId === item.bundleId
              );

            const previousRevenue = Number(
              previousItem?.totalRevenue ?? 0
            );

            return (
              <tr
                key={item.bundleId}
                style={{
                  borderBottom:
                    "1px solid #f1f2f3",
                }}
              >
                <td
                  style={{
                    padding: "13px 12px",
                    fontWeight: 500,
                    color: "#202223",
                  }}
                >
                  {item.bundle?.title ??
                    "Unknown bundle"}
                </td>

                <td
                  style={{
                    padding: "13px 12px",
                    color: "#5c5f62",
                  }}
                >
                  {typeLabel(item.bundle?.type)}
                </td>

                <td
                  style={{
                    padding: "13px 12px",
                    textAlign: "right",
                  }}
                >
                  {formatMoney(revenue)}
                </td>

                {compare === "previous" && (
                  <td
                    style={{
                      padding: "13px 12px",
                      textAlign: "right",
                      color: "#8c9196",
                    }}
                  >
                    {formatMoney(previousRevenue)}
                  </td>
                )}

                <td
                  style={{
                    padding: "13px 12px",
                    textAlign: "right",
                  }}
                >
                  {formatNumber(
                    item.totalQuantity
                  )}
                </td>

                <td
                  style={{
                    padding: "13px 12px",
                    textAlign: "right",
                  }}
                >
                  {formatNumber(orders)}
                </td>

                <td
                  style={{
                    padding: "13px 12px",
                    textAlign: "right",
                    fontWeight: 600,
                  }}
                >
                  {formatMoney(
                    orders > 0
                      ? revenue / orders
                      : 0
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}
</SectionCard>
) : (
  <LockedAnalyticsCard
    title="Bundle performance details"
    description="Unlock detailed performance data for individual bundles."
  />
)}
      </div>
    </s-page>
  );
}