import {
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
  useRouteError,
  useSubmit,
} from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { authenticate } from "../shopify.server";
import { UPSELL_SURFACES } from "../models/upsell.constants";
import { createUpsellFunnel } from "../models/upsell.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

const FUNNELS_INDEX_ROUTE = "/app/upsell/funnels";
const DEFAULT_SURFACE = UPSELL_SURFACES.PDP;

const SURFACE_OPTIONS = [
  {
    label: "Product page",
    value: UPSELL_SURFACES.PDP,
    description: "Show offers before add to cart when buyer intent is highest.",
  },
  {
    label: "Cart",
    value: UPSELL_SURFACES.CART,
    description:
      "Recommend related products and threshold nudges during cart review.",
  },
  {
    label: "Checkout",
    value: UPSELL_SURFACES.CHECKOUT,
    description: "Use low-friction add-ons near purchase completion.",
  },
  {
    label: "Post-purchase",
    value: UPSELL_SURFACES.POST_PURCHASE,
    description:
      "Show one-click follow-up offers immediately after payment is completed.",
  },
  {
    label: "Customer account",
    value: UPSELL_SURFACES.ACCOUNT,
    description: "Drive reorders and subscription retention moments.",
  },
];

const STRATEGY_PRESETS = [
  {
    key: "ADD_ON",
    title: "Add-on",
    description:
      "Offer a natural complementary item with a simple yes-or-no choice.",
  },
  {
    key: "BUNDLE",
    title: "Bundle",
    description:
      "Combine products into a higher-value package with stronger perceived savings.",
  },
  {
    key: "VOLUME",
    title: "Volume discount",
    description:
      "Encourage larger quantities using tier-based or threshold incentives.",
  },
  {
    key: "BOGO",
    title: "BOGO",
    description:
      "Use second-item or buy-one-get-one mechanics to create urgency.",
  },
  {
    key: "SUBSCRIPTION",
    title: "Subscription",
    description:
      "Turn one-time buyers into repeat purchasers with recurring value.",
  },
];

/**
 * Layout / style helpers
 * Keep spacing, radii, and borders consistent across cards and panels.
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
 * Normalize + helpers
 */
function normalizeSurface(surface) {
  return SURFACE_OPTIONS.some((item) => item.value === surface)
    ? surface
    : DEFAULT_SURFACE;
}

function buildEditFunnelRoute(id) {
  return `/app/upsell/funnels/${id}`;
}

/**
 * Loader / action
 */
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const url = new URL(request.url);
  const requestedSurface = url.searchParams.get("surface");

  return {
    initialValues: {
      title: "",
      surface: normalizeSurface(requestedSurface),
      description: "",
      priority: "0",
    },
  };
};

function validateForm(formData) {
  const title = String(formData.get("title") || "").trim();
  const surface = normalizeSurface(
    String(formData.get("surface") || DEFAULT_SURFACE).trim(),
  );
  const description = String(formData.get("description") || "").trim();
  const priority = String(formData.get("priority") || "0").trim();

  const errors = {};
  const parsedPriority = Number(priority);

  if (!title) {
    errors.title = "Title is required.";
  }

  if (!Number.isFinite(parsedPriority) || parsedPriority < 0) {
    errors.priority = "Priority must be 0 or greater.";
  }

  return {
    errors,
    values: { title, surface, description, priority },
  };
}

export const action = async ({ request }) => {
  const { session, redirect } = await authenticate.admin(request);
  const formData = await request.formData();
  const { errors, values } = validateForm(formData);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }

  const funnel = await createUpsellFunnel(session.shop, {
    title: values.title,
    surface: values.surface,
    description: values.description || null,
    priority: Number(values.priority || 0),
  });

  return redirect(buildEditFunnelRoute(funnel.id));
};

/**
 * Route component
 */
export default function UpsellFunnelsNewRoute() {
  const { initialValues } = useLoaderData();
  const actionData = useActionData();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const submit = useSubmit();
  const formRef = useRef(null);

  const [values, setValues] = useState(initialValues);

  const errors = (actionData && actionData.errors) || {};
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    if (actionData && actionData.values) {
      setValues(actionData.values);
    }
  }, [actionData]);

  const selectedSurface = useMemo(() => {
    return (
      SURFACE_OPTIONS.find((item) => item.value === values.surface) ||
      SURFACE_OPTIONS[0]
    );
  }, [values.surface]);

  function updateValue(field) {
    return (event) => {
      const nextValue = event.target.value;

      setValues((prev) => ({
        ...prev,
        [field]: field === "surface" ? normalizeSurface(nextValue) : nextValue,
      }));
    };
  }

  function handleSubmit(event) {
    event && event.preventDefault();
    if (!formRef.current || isSubmitting) return;
    submit(formRef.current, { method: "post" });
  }

  /**
   * Layout:
   * - Primary content in flow: intro hero, basics, strategy presets
   * - Aside (slot="aside"): publishing + priority controls + CTA
   */
  return (
    <s-page heading="Create funnel">
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
        onClick={handleSubmit}
      >
        {isSubmitting ? "Creating..." : "Create funnel"}
      </s-button>

      <form ref={formRef} method="post" onSubmit={handleSubmit}>
        {/* Hero / context section */}
        <s-section>
          <div
            style={{
              ...card(24),
              background:
                "radial-gradient(circle at top right, rgba(14, 165, 233, 0.08), transparent 35%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
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
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <s-badge tone="info">New funnel</s-badge>
                </div>

                <div>
                  <s-heading>
                    Start with the buying moment you want to influence
                  </s-heading>
                </div>

                <s-paragraph tone="subdued">
                  Define the funnel shell now. You’ll add specific offers,
                  targeting rules, and scheduling in the funnel editor.
                </s-paragraph>
              </div>

              <div style={card(18)}>
                <div style={{ marginBottom: 8 }}>
                  <s-text tone="subdued">Selected surface</s-text>
                </div>

                <s-heading>{selectedSurface.label}</s-heading>

                <div style={{ marginTop: 8 }}>
                  <s-text tone="subdued">
                    {selectedSurface.description}
                  </s-text>
                </div>
              </div>
            </div>
          </div>
        </s-section>

        {/* Basics section */}
        <s-section heading="Basics">
          <div style={card(20)}>
            <div style={{ display: "grid", gap: 18 }}>
              {errors.form ? (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#fef2f2",
                    color: "#b91c1c",
                    fontSize: 13,
                  }}
                >
                  {errors.form}
                </div>
              ) : null}

              {/* Title */}
              <div style={{ display: "grid", gap: 6 }}>
                <label
                  htmlFor="title"
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#4b5563",
                  }}
                >
                  Funnel title
                </label>

                <input
                  id="title"
                  name="title"
                  value={values.title}
                  onChange={updateValue("title")}
                  placeholder="Example: PDP accessories booster"
                  style={{
                    width: "100%",
                    minHeight: 44,
                    borderRadius: 12,
                    border: `1px solid ${errors.title ? "#dc2626" : "#d1d5db"}`,
                    padding: "0 14px",
                    font: "inherit",
                    background: "#ffffff",
                  }}
                />

                {errors.title ? (
                  <div
                    style={{
                      color: "#dc2626",
                      fontSize: 13,
                    }}
                  >
                    {errors.title}
                  </div>
                ) : null}
              </div>

              {/* Surface */}
              <div style={{ display: "grid", gap: 6 }}>
                <label
                  htmlFor="surface"
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#4b5563",
                  }}
                >
                  Surface
                </label>

                <select
                  id="surface"
                  name="surface"
                  value={values.surface}
                  onChange={updateValue("surface")}
                  style={{
                    width: "100%",
                    minHeight: 44,
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                    padding: "0 14px",
                    font: "inherit",
                    background: "#ffffff",
                  }}
                >
                  {SURFACE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div style={{ display: "grid", gap: 6 }}>
                <label
                  htmlFor="description"
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#4b5563",
                  }}
                >
                  Internal description
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={values.description}
                  onChange={updateValue("description")}
                  rows={4}
                  placeholder="Add context about your goal, audience, or test idea for this funnel."
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                    padding: "10px 14px",
                    font: "inherit",
                    background: "#ffffff",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
          </div>
        </s-section>

        {/* Strategy presets section */}
        <s-section heading="Offer direction">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {STRATEGY_PRESETS.map((preset) => (
              <div key={preset.key} style={card(18)}>
                <div style={{ marginBottom: 6 }}>
                  <s-heading>{preset.title}</s-heading>
                </div>
                <s-paragraph tone="subdued">{preset.description}</s-paragraph>
              </div>
            ))}
          </div>
        </s-section>

        {/* Aside: publishing / priority / CTA */}
        <s-box slot="aside">
          <s-section heading="Publishing">
            <div style={{ display: "grid", gap: 14 }}>
              {/* Status card */}
              <div style={card(18)}>
                <div style={{ marginBottom: 6 }}>
                  <s-text tone="subdued">Initial status</s-text>
                </div>

                <s-badge tone="warning">Draft</s-badge>

                <div style={{ marginTop: 8 }}>
                  <s-text tone="subdued">
                    New funnels start in draft so you can safely configure them
                    before launch.
                  </s-text>
                </div>
              </div>

              {/* Priority field */}
              <div style={card(18)}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label
                    htmlFor="priority"
                    style={{
                      display: "block",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#4b5563",
                    }}
                  >
                    Priority
                  </label>

                  <input
                    id="priority"
                    name="priority"
                    type="number"
                    min="0"
                    value={values.priority}
                    onChange={updateValue("priority")}
                    style={{
                      width: "100%",
                      minHeight: 44,
                      borderRadius: 12,
                      border: `1px solid ${
                        errors.priority ? "#dc2626" : "#d1d5db"
                      }`,
                      padding: "0 14px",
                      font: "inherit",
                      background: "#ffffff",
                    }}
                  />

                  {errors.priority ? (
                    <div
                      style={{
                        marginTop: 2,
                        color: "#dc2626",
                        fontSize: 13,
                      }}
                    >
                      {errors.priority}
                    </div>
                  ) : (
                    <s-text tone="subdued">
                      Higher numbers run later if multiple funnels are eligible.
                    </s-text>
                  )}
                </div>
              </div>

              {/* Primary actions */}
              <div style={card(18)}>
                <div style={{ display: "grid", gap: 10 }}>
                  <s-button
                    variant="primary"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? "Creating..." : "Create funnel"}
                  </s-button>

                  <s-button
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={() => navigate(FUNNELS_INDEX_ROUTE)}
                  >
                    Cancel
                  </s-button>
                </div>
              </div>
            </div>
          </s-section>
        </s-box>
      </form>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);