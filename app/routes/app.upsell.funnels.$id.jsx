import {
  useActionData,
  useLoaderData,
  useNavigation,
  useNavigate,
  useRouteError,
  useSubmit,
} from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { authenticate } from "../shopify.server";
import { UPSELL_SURFACES } from "../models/upsell.constants";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  getUpsellFunnel,
  updateUpsellFunnel,
} from "../models/upsell.server";
import { requireFeatureAccess } from "../featureAccess.server";

const FUNNELS_INDEX_ROUTE = "/app/upsell/funnels";
const DEFAULT_SURFACE = UPSELL_SURFACES.PDP;

const STATUS_OPTIONS = [
  { label: "Draft", value: "DRAFT" },
  { label: "Active", value: "ACTIVE" },
  { label: "Archived", value: "ARCHIVED" },
];

const SURFACE_OPTIONS = [
  { label: "Product page", value: UPSELL_SURFACES.PDP },
  { label: "Cart", value: UPSELL_SURFACES.CART },
  { label: "Checkout", value: UPSELL_SURFACES.CHECKOUT },
  { label: "Post-purchase", value: UPSELL_SURFACES.POST_PURCHASE },
  { label: "Customer account", value: UPSELL_SURFACES.ACCOUNT },
];

/**
 * Shared card styles – still using your existing primitives
 */
const CARD_RADIUS = 16;
const CARD_BORDER = "1px solid #e5e7eb";
const CARD_SHADOW = "0 1px 2px rgba(15, 23, 42, 0.04)";
const CARD_BG = "#ffffff";

const cardBase = {
  background: CARD_BG,
  border: CARD_BORDER,
  borderRadius: CARD_RADIUS,
  boxShadow: CARD_SHADOW,
};

const card = (padding = 20) => ({
  ...cardBase,
  padding,
});

/**
 * Route helpers
 */
function buildWidgetsRoute(id, surface) {
  switch (normalizeSurface(surface)) {
    case UPSELL_SURFACES.CART:
      return `/app/upsell/funnels/${id}/widgets/cart`;
    case UPSELL_SURFACES.CHECKOUT:
      return `/app/upsell/funnels/${id}/widgets/checkout`;
    case UPSELL_SURFACES.POST_PURCHASE:
      return `/app/upsell/funnels/${id}/widgets/post-purchase`;
    case UPSELL_SURFACES.ACCOUNT:
      return `/app/upsell/funnels/${id}/widgets/account`;
    case UPSELL_SURFACES.PDP:
    default:
      return `/app/upsell/funnels/${id}/widgets/pdp`;
  }
}

function normalizeSurface(surface) {
  const value = String(surface || "").trim();
  const aliases = {
    PRODUCT_PAGE: UPSELL_SURFACES.PDP,
    PRODUCT: UPSELL_SURFACES.PDP,
    POST_PURCHASE_PAGE: UPSELL_SURFACES.POST_PURCHASE,
    CUSTOMER_ACCOUNT: UPSELL_SURFACES.ACCOUNT,
  };
  const normalized = aliases[value] || value;

  return isValidSurface(normalized) ? normalized : DEFAULT_SURFACE;
}

function parseSubmittedSurface(surface) {
  const value = String(surface || "").trim();
  const aliases = {
    PRODUCT_PAGE: UPSELL_SURFACES.PDP,
    PRODUCT: UPSELL_SURFACES.PDP,
    POST_PURCHASE_PAGE: UPSELL_SURFACES.POST_PURCHASE,
    CUSTOMER_ACCOUNT: UPSELL_SURFACES.ACCOUNT,
  };
  const normalized = aliases[value] || value;

  return isValidSurface(normalized) ? normalized : "";
}

function isValidSurface(surface) {
  return SURFACE_OPTIONS.some((item) => item.value === surface);
}

function normalizeStatus(status) {
  const value = String(status || "").trim();

  return isValidStatus(value) ? value : "DRAFT";
}

function parseSubmittedStatus(status) {
  const value = String(status || "").trim();

  return isValidStatus(value) ? value : "";
}

function isValidStatus(status) {
  return STATUS_OPTIONS.some((item) => item.value === status);
}

/**
 * Normalize to a date string suitable for <s-date-field>.
 * If you need time-of-day, we can revert these to <input type="datetime-local">.
 */
function normalizeDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  // Adjust to local date, then keep only YYYY-MM-DD
  const tzOffset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - tzOffset);
  return local.toISOString().slice(0, 10);
}

function getEditableValues(funnel) {
  return {
    title: funnel?.title ?? "",
    surface: normalizeSurface(funnel?.surface),
    status: normalizeStatus(funnel?.status),
    description: funnel?.description ?? "",
    priority: String(funnel?.priority ?? 0),
    startAt: normalizeDateTimeLocal(funnel?.startAt),
    endAt: normalizeDateTimeLocal(funnel?.endAt),
  };
}

function surfaceLabel(surface) {
  const normalized = normalizeSurface(surface);
  return SURFACE_OPTIONS.find((item) => item.value === normalized)?.label ?? normalized;
}

function statusLabel(status) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

function statusBadgeTone(status) {
  if (status === "ACTIVE") return "success";
  if (status === "DRAFT") return "warning";
  if (status === "ARCHIVED") return "subdued";
  return "info";
}

function getSurfaceHint(surface) {
  const normalized = normalizeSurface(surface);
  const map = {
    [UPSELL_SURFACES.PDP]:
      "Best for add-ons, bundles, and quantity breaks before add to cart.",
    [UPSELL_SURFACES.CART]:
      "Best for threshold offers, bundle completion, and cross-sells during cart review.",
    [UPSELL_SURFACES.CHECKOUT]:
      "Best for low-friction offers such as gift wrap, protection, or priority processing.",
    [UPSELL_SURFACES.POST_PURCHASE]:
      "Best for one-click follow-up offers after payment without interrupting checkout.",
    [UPSELL_SURFACES.ACCOUNT]:
      "Best for reorder, refill, and subscription-oriented retention experiences.",
  };

  return (
    map[normalized] ??
    "Choose the surface that best matches where the customer should see this funnel."
  );
}

/**
 * Server-side validation – unchanged
 */
function validateForm(formData) {
  const title = String(formData.get("title") || "").trim();
  const surface = parseSubmittedSurface(formData.get("surface"));
  const status = parseSubmittedStatus(formData.get("status"));
  const description = String(formData.get("description") || "").trim();
  const priority = String(formData.get("priority") || "0").trim();
  const startAt = String(formData.get("startAt") || "").trim();
  const endAt = String(formData.get("endAt") || "").trim();

  const errors = {};
  const parsedPriority = Number(priority);

  if (!title) {
    errors.title = "Title is required.";
  }

  if (!surface) {
    errors.surface = "Choose a valid surface.";
  }

  if (!status) {
    errors.status = "Choose a valid status.";
  }

  if (!Number.isFinite(parsedPriority) || parsedPriority < 0) {
    errors.priority = "Priority must be 0 or greater.";
  }

  const parsedStartAt = startAt ? new Date(startAt) : null;
  const parsedEndAt = endAt ? new Date(endAt) : null;

  if (startAt && (!parsedStartAt || Number.isNaN(parsedStartAt.getTime()))) {
    errors.startAt = "Start date is invalid.";
  }

  if (endAt && (!parsedEndAt || Number.isNaN(parsedEndAt.getTime()))) {
    errors.endAt = "End date is invalid.";
  }

  if (
    parsedStartAt &&
    parsedEndAt &&
    !Number.isNaN(parsedStartAt.getTime()) &&
    !Number.isNaN(parsedEndAt.getTime()) &&
    parsedStartAt > parsedEndAt
  ) {
    errors.endAt = "End date must be after the start date.";
  }

  return {
    errors,
    values: { title, surface, status, description, priority, startAt, endAt },
  };
}

/**
 * Remix loader/action – unchanged
 */
export const loader = async ({ request, params }) => {
  const { session, redirect } = await authenticate.admin(request);

  const widgetKey = widgetKeyFromSlug(params.widget);

  if (widgetKey === "testimonials_social_proof") {
    await requireFeatureAccess(session.shop, "TESTIMONIALS");
  }
  const funnel = await getUpsellFunnel(session.shop, params.id);

  if (!funnel) {
    throw new Response("Not Found", { status: 404 });
  }

  return {
    funnel,
    initialValues: getEditableValues(funnel),
  };
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const existingFunnel = await getUpsellFunnel(session.shop, params.id);

  if (!existingFunnel) {
    throw new Response("Not Found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "save");

  if (intent !== "save") {
    return null;
  }

  const { errors, values } = validateForm(formData);

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      saved: false,
      errors,
      values,
      funnel: existingFunnel,
    };
  }

  await updateUpsellFunnel(session.shop, params.id, {
    title: values.title,
    surface: values.surface,
    status: values.status,
    description: values.description || null,
    priority: Number(values.priority || 0),
    startAt: values.startAt ? new Date(values.startAt) : null,
    endAt: values.endAt ? new Date(values.endAt) : null,
  });

  const updatedFunnel = await getUpsellFunnel(session.shop, params.id);

  if (!updatedFunnel) {
    throw new Response("Not Found", { status: 404 });
  }

  return {
    ok: true,
    saved: true,
    funnel: updatedFunnel,
    errors: {},
    values: getEditableValues(updatedFunnel),
  };
};

/**
 * Main route component using Polaris web components
 * (see: https://shopify.dev/docs/api/polaris/using-polaris-web-components)
 */
export default function UpsellFunnelsEditRoute() {
  const { funnel, initialValues } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submit = useSubmit();
  const formRef = useRef(null);

  const currentFunnel = (actionData && actionData.funnel) || funnel;
  const values = (actionData && actionData.values) || initialValues;
  const [formValues, setFormValues] = useState(values);
  const errors = (actionData && actionData.errors) || {};
  const saved = actionData && actionData.saved === true;
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    setFormValues(values);
  }, [values]);

  const counts = useMemo(() => {
    return {
      offers:
        currentFunnel?._count?.offers ??
        (currentFunnel?.offers ? currentFunnel.offers.length : 0),
      targets:
        currentFunnel?._count?.targets ??
        (currentFunnel?.targets ? currentFunnel.targets.length : 0),
      conditions:
        currentFunnel?._count?.conditions ??
        (currentFunnel?.conditions ? currentFunnel.conditions.length : 0),
    };
  }, [currentFunnel]);

  function handleSave() {
    if (!formRef.current || isSubmitting) return;
    submit(formRef.current, { method: "post" });
  }

  function handleOpenWidgets() {
  navigate("/app/Customize");
}

  function updateValue(field) {
    return (event) => {
      const nextValue = event.target?.value ?? event.currentTarget?.value ?? "";

      setFormValues((previousValues) => ({
        ...previousValues,
        [field]: field === "surface" ? normalizeSurface(nextValue) : nextValue,
      }));
    };
  }

  return (
    <s-page heading={currentFunnel.title || "Edit funnel"}>
      {/* Page-level actions (slots) */}
      <s-button
        slot="secondary-actions"
        variant="secondary"
        onClick={() => navigate(FUNNELS_INDEX_ROUTE)}
      >
        Back to funnels
      </s-button>

      <s-button
        slot="primary-action"
        variant="primary"
        disabled={isSubmitting}
        onClick={handleSave}
      >
        {isSubmitting ? "Saving..." : "Save changes"}
      </s-button>

      {/* Aside controls – Polaris components inside your card layout */}
      <s-box slot="aside">
        <s-section heading="Controls">
          <div style={{ display: "grid", gap: 14 }}>
            {/* Priority card */}
            <div style={card(18)}>
              <div style={{ display: "grid", gap: 6 }}>
                <s-number-field
                  label="Priority"
                  min={0}
                  value={formValues.priority}
                  error={errors.priority}
                  onInput={updateValue("priority")}
                  details={
                    errors.priority
                      ? undefined
                      : "Higher values run later if multiple funnels are eligible."
                  }
                />
              </div>
            </div>

            {/* Action buttons card */}
            <div style={card(18)}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                {/* Primary action on the left */}
                <div style={{ display: "flex", gap: 8 }}>
                  <s-button
                    type="button"
                    variant="primary"
                    disabled={isSubmitting}
                    onClick={handleSave}
                  >
                    {isSubmitting ? "Saving..." : "Save changes"}
                  </s-button>
                </div>

                {/* Secondary actions on the right */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                    flexWrap: "wrap",
                  }}
                >
                  <s-button
                    type="button"
                    variant="secondary"
                    onClick={handleOpenWidgets}
                  >
                    Open widget builder
                  </s-button>

                  <s-button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate(FUNNELS_INDEX_ROUTE)}
                  >
                    Back to funnels
                  </s-button>
                </div>
              </div>
            </div>

            {/* Info card */}
            <div style={card(18)}>
              <div style={{ marginBottom: 6 }}>
                <s-text tone="subdued">What happens next</s-text>
              </div>

              <s-text tone="subdued">
                After saving this funnel, use the widget builder to define
                placement, creative, CTAs, and the exact upsell experience
                customers will see.
              </s-text>
            </div>
          </div>
        </s-section>
      </s-box>

      {/* Main content form */}
      <form
        method="post"
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <input type="hidden" name="intent" value="save" />
        <input type="hidden" name="title" value={formValues.title} />
        <input type="hidden" name="surface" value={formValues.surface} />
        <input type="hidden" name="status" value={formValues.status} />
        <input type="hidden" name="description" value={formValues.description} />
        <input type="hidden" name="priority" value={formValues.priority} />
        <input type="hidden" name="startAt" value={formValues.startAt} />
        <input type="hidden" name="endAt" value={formValues.endAt} />

        {/* Hero / header section */}
        <s-section>
          <div
            style={{
              ...card(24),
              background:
                "radial-gradient(circle at top right, rgba(16, 185, 129, 0.08), transparent 35%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)",
                gap: 20,
                alignItems: "stretch",
              }}
            >
              {/* Left panel */}
              <div style={{ display: "grid", gap: 12 }}>
                <s-badge tone="info">Funnel editor</s-badge>

                <s-heading>
                  {currentFunnel.title || "Untitled funnel"}
                </s-heading>

                <s-paragraph tone="subdued">
                  Update this funnel&rsquo;s configuration, publish state, and
                  schedule here. Use the widget builder to define what buyers
                  actually see.
                </s-paragraph>

                {saved ? (
                  <div>
                    <s-badge tone="success">Changes saved</s-badge>
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 4,
                  }}
                >
                  <s-button
                    type="button"
                    variant="primary"
                    onClick={handleOpenWidgets}
                  >
                    Open widget builder
                  </s-button>

                  <s-button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate(FUNNELS_INDEX_ROUTE)}
                  >
                    Back to funnels
                  </s-button>
                </div>
              </div>

              {/* Right panel: funnel summary */}
              <div style={{ ...card(18), display: "grid", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <s-text tone="subdued">Surface</s-text>
                  <s-text>{surfaceLabel(formValues.surface)}</s-text>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <s-text tone="subdued">Status</s-text>
                  <s-badge tone={statusBadgeTone(formValues.status)}>
                    {statusLabel(formValues.status)}
                  </s-badge>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <s-text tone="subdued">Offers</s-text>
                  <s-text>{counts.offers}</s-text>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <s-text tone="subdued">Targets</s-text>
                  <s-text>{counts.targets}</s-text>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <s-text tone="subdued">Conditions</s-text>
                  <s-text>{counts.conditions}</s-text>
                </div>

                <div
                  style={{
                    paddingTop: 8,
                    marginTop: 4,
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <s-text tone="subdued">
                    {getSurfaceHint(formValues.surface)}
                  </s-text>
                </div>
              </div>
            </div>
          </div>
        </s-section>

        {/* Configuration section */}
        <s-section heading="Configuration">
          <div style={card(20)}>
            <div style={{ display: "grid", gap: 18 }}>
              {/* Title */}
              <s-text-field
                label="Funnel title"
                value={formValues.title}
                error={errors.title}
                onInput={updateValue("title")}
                required
              />

              {/* Surface + Status */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                <s-select
                  label="Surface"
                  value={formValues.surface}
                  error={errors.surface}
                  onChange={updateValue("surface")}
                  required
                >
                  {SURFACE_OPTIONS.map((option) => (
                    <s-option key={option.value} value={option.value}>
                      {option.label}
                    </s-option>
                  ))}
                </s-select>

                <s-select
                  label="Status"
                  value={formValues.status}
                  error={errors.status}
                  onChange={updateValue("status")}
                  required
                >
                  {STATUS_OPTIONS.map((option) => (
                    <s-option key={option.value} value={option.value}>
                      {option.label}
                    </s-option>
                  ))}
                </s-select>
              </div>

              {/* Description */}
              <s-text-area
                label="Internal description"
                value={formValues.description}
                onInput={updateValue("description")}
                rows={4}
              />
            </div>
          </div>
        </s-section>

        {/* Scheduling section */}
        <s-section heading="Scheduling">
          <div style={card(18)}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
                marginTop: 8,
              }}
            >
              {/* Start date */}
              <s-date-field
                label="Start date"
                value={formValues.startAt}
                error={errors.startAt}
                onInput={updateValue("startAt")}
                onChange={updateValue("startAt")}
                details={
                  errors.startAt
                    ? undefined
                    : "Optional. Leave blank to start immediately."
                }
              />

              {/* End date */}
              <s-date-field
                label="End date"
                value={formValues.endAt}
                error={errors.endAt}
                onInput={updateValue("endAt")}
                onChange={updateValue("endAt")}
                details={
                  errors.endAt
                    ? undefined
                    : "Optional. Leave blank to keep running until archived."
                }
              />
            </div>
          </div>
        </s-section>
      </form>
    </s-page>
  );
}

/**
 * Error boundary / headers passthrough – unchanged
 */
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
