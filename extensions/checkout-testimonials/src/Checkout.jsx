// extensions/checkout-testimonials/src/index.jsx

import "@shopify/ui-extensions/preact";
import { render } from "preact";
//import { react } from "@shopify/ui-extensions-react/checkout";
import { useState, useEffect } from "preact/hooks";
import { truncate, starsString, extractNumericId } from "./logic/utils.js";
import { APP_URL } from "../../constants.js";

const APP_PROXY = `${APP_URL}/api`;

// ─── Default theme (mirrors TESTIMONIALS_CHECKOUT_DEFAULTS) ──────────────────
const DEFAULT_THEME = {
  testimonialsTitle: "What customers are saying",
  showReviewImage: true,
  showReviewTitle: true,
  showReviewBody: true,
  showReviewAuthor: true,
  showOverallRating: true,
  paginationStyle: "arrows",
  reviewsPerPage: 1,
  buttonVariant: "outline",
  borderRadius: "base",
  gap: "base",
  padding: "base",
  titleSize: "base",
  textAlignment: "left",
  layoutDirection: "vertical",
  itemsPerRow: 2,
  reviewsToShow: 4,
  reviewSource: "auto",
  judgeMePrivateToken: "",
  judgeMePublicToken: "",
};

// ─── Token maps (saved theme → Shopify UI Extension props) ───────────────────
const BUTTON_VARIANT_MAP = {
  filled: "primary",
  outline: "secondary",
  plain: "plain",
};

const BORDER_RADIUS_MAP = {
  none: "none",
  base: "base",
  large: "large",
};

const SIZE_MAP = {
  small: "small",
  base: "medium",
  large: "large",
};

const GAP_MAP = {
  tight: "tight",
  base: "base",
  loose: "loose",
};

const PADDING_MAP = {
  tight: "tight",
  base: "base",
  loose: "loose",
};

function convertSavedThemeToExtensionTheme(savedTheme) {
  if (!savedTheme) return DEFAULT_THEME;

  return {
    ...DEFAULT_THEME,
    testimonialsTitle: savedTheme.testimonialsTitle || DEFAULT_THEME.testimonialsTitle,
    showReviewImage: savedTheme.showReviewImage ?? DEFAULT_THEME.showReviewImage,
    showReviewTitle: savedTheme.showReviewTitle ?? DEFAULT_THEME.showReviewTitle,
    showReviewBody: savedTheme.showReviewBody ?? DEFAULT_THEME.showReviewBody,
    showReviewAuthor: savedTheme.showReviewAuthor ?? DEFAULT_THEME.showReviewAuthor,
    showOverallRating: savedTheme.showOverallRating ?? DEFAULT_THEME.showOverallRating,
    paginationStyle: savedTheme.paginationStyle || DEFAULT_THEME.paginationStyle,
    reviewsPerPage: Number(savedTheme.reviewsPerPage) || DEFAULT_THEME.reviewsPerPage,
    reviewsToShow: Number(savedTheme.reviewsToShow) || DEFAULT_THEME.reviewsToShow,
    layoutDirection: savedTheme.layoutDirection || DEFAULT_THEME.layoutDirection,
    itemsPerRow: Number(savedTheme.itemsPerRow) || DEFAULT_THEME.itemsPerRow,
    reviewSource: savedTheme.reviewSource || DEFAULT_THEME.reviewSource,
    textAlignment: savedTheme.textAlignment || DEFAULT_THEME.textAlignment,

    // Map token strings → Shopify prop values
    buttonVariant: BUTTON_VARIANT_MAP[savedTheme.buttonVariant] ?? DEFAULT_THEME.buttonVariant,
    borderRadius: BORDER_RADIUS_MAP[savedTheme.borderRadius] ?? DEFAULT_THEME.borderRadius,
    titleSize: SIZE_MAP[savedTheme.titleSize] ?? DEFAULT_THEME.titleSize,
    gap: GAP_MAP[savedTheme.gap] ?? DEFAULT_THEME.gap,
    padding: PADDING_MAP[savedTheme.padding] ?? DEFAULT_THEME.padding,
    // JudgeMe API tokens
    judgeMePrivateToken: savedTheme.judgeMePrivateToken ?? DEFAULT_THEME.judgeMePrivateToken,
    judgeMePublicToken: savedTheme.judgeMePublicToken ?? DEFAULT_THEME.judgeMePublicToken,
  };
}

console.log("[Testimonials] Extension mounted");

export default function () {
  render(<Extension />, document.body);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function Extension() {
  const [testimonials, setTestimonials] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const handlePrev = () => {
    console.log("[Testimonials] handlePrev called, current:", currentPage, "totalPages:", totalPages);
    setCurrentPage((p) => (p - 1 + totalPages) % totalPages);
  };

  const handleNext = () => {
    console.log("[Testimonials] handleNext called, current:", currentPage, "totalPages:", totalPages);
    setCurrentPage((p) => (p + 1) % totalPages);
  };
  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const storeDomain = shopify.shop.myshopifyDomain;
      const currentLines = shopify.lines.current;

      const cartProductIds = currentLines
        .map((line) => line.merchandise?.product?.id)
        .filter(Boolean)
        .map(extractNumericId);

      if (!cartProductIds.length) {
        setThemeLoaded(true);
        setLoading(false);
        return;
      }
      const token = await shopify.sessionToken.get();
      console.log("[Testimonials] token present:", !!token);
      // ── Fetch theme and testimonials in parallel ──────────────────────────
      const [themeRes, testimonialsRes] = await Promise.all([
        fetch(`${APP_PROXY}/widget-theme?widgetKey=testimonials_social_proof&surface=CHECKOUT`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),

        fetch(`${APP_PROXY}/bundle-testimonials?shop=${storeDomain}&productIds=${cartProductIds.join(",")}`),
      ]);

      const themeData = await themeRes.json().catch(() => ({}));
      const data = await testimonialsRes.json().catch(() => ({}));

      const convertedTheme = convertSavedThemeToExtensionTheme(themeData.theme);
      setTheme(convertedTheme);
      setThemeLoaded(true);

      console.log("[Testimonials]", data.source, "| count:", data.testimonials?.length, "| rating:", data.averageRating);

      const cap = Math.max(1, Number(themeData.theme?.reviewsToShow) || 4);
      setTestimonials((data.testimonials ?? []).slice(0, cap));
      setAverageRating(data.averageRating ?? 0);
      setTotalCount(data.totalCount ?? 0);

    } catch (err) {
      console.error("[Testimonials] fetchAll failed:", err);
      setThemeLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !themeLoaded) return <SkeletonCard />;
  if (!loading && testimonials.length === 0) return null;

  const {
    testimonialsTitle,
    showOverallRating,
    paginationStyle,
    reviewsPerPage,
    layoutDirection,
    gap,
    padding,
    borderRadius,
    titleSize,
    buttonVariant,
  } = theme;

  const isCarousel = layoutDirection === "horizontal";
  const isGrid = layoutDirection === "grid";
  const perPage = Math.max(1, Number(reviewsPerPage) || 1);
  const totalPages = Math.ceil(testimonials.length / perPage);
  const showPaginate = !isCarousel && paginationStyle !== "none" && totalPages > 1;

  const visibleList = (isCarousel || paginationStyle === "none")
    ? testimonials
    : testimonials.slice(currentPage * perPage, currentPage * perPage + perPage);

  return (
    <s-box border="base base solid" borderRadius={borderRadius} padding={padding}>
      <s-stack direction="block" gap={gap}>

        {/* ── Header ── */}
        <s-grid gridTemplateColumns="1fr auto" alignItems="center" gap="base">
          <s-text emphasis="bold" size={titleSize}>
            {testimonialsTitle}
          </s-text>
          {showOverallRating && totalCount > 0 && (
            <s-text size="small" appearance="subdued">
              {starsString(averageRating)} {averageRating.toFixed(1)} · {totalCount} reviews
            </s-text>
          )}
        </s-grid>

        <s-divider />

        {/* ── Layout ── */}
        {isCarousel ? (
          <s-scroll-view direction="inline">
            <s-stack direction="inline" gap={gap}>
              {visibleList.map((t) => (
                <s-box key={t.id} minInlineSize="260px">
                  <TestimonialCard testimonial={t} theme={theme} />
                </s-box>
              ))}
            </s-stack>
          </s-scroll-view>
        ) : isGrid ? (
          <s-grid gridTemplateColumns="1fr 1fr" gap={gap}>
            {visibleList.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} theme={theme} />
            ))}
          </s-grid>
        ) : (
          <s-stack direction="block" gap={gap}>
            {visibleList.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} theme={theme} />
            ))}
          </s-stack>
        )}

        {/* ── Pagination: arrows ── */}
        {showPaginate && paginationStyle === "arrows" && (
          <s-stack direction="inline" gap="base" alignItems="center" justifyContent="center">
            <s-button
              kind={buttonVariant}
              size="slim"
              onClick={handlePrev}
            >
              ← Prev
            </s-button>
            <s-text size="small" appearance="subdued">
              {currentPage + 1} / {totalPages}
            </s-text>
            <s-button
              kind={buttonVariant}
              size="slim"
              onClick={handleNext}
            >
              Next →
            </s-button>
          </s-stack>
        )}

        {/* ── Pagination: dots ── */}
        {showPaginate && paginationStyle === "dots" && (
          <s-stack direction="inline" gap="tight" alignItems="center" justifyContent="center">
            {Array.from({ length: totalPages }).map((_, i) => (
              <s-button
                key={i}
                kind={i === currentPage ? "primary" : buttonVariant}
                size="slim"
                onClick={() => setCurrentPage(i)}
              >
                {i === currentPage ? "●" : "○"}
              </s-button>
            ))}
          </s-stack>
        )}

      </s-stack>
    </s-box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTIMONIAL CARD
// ─────────────────────────────────────────────────────────────────────────────

function TestimonialCard({ testimonial, theme }) {
  const {
    showReviewImage,
    showReviewTitle,
    showReviewBody,
    showReviewAuthor,
    borderRadius,
    textAlignment,
  } = theme;

  const inlineAlignment = textAlignment === "center" ? "center"
    : textAlignment === "right" ? "end"
      : "start";

  const rawImageUrl = testimonial.pictureUrls?.[0] ?? null;

  const imageUrl = (() => {
    if (!rawImageUrl || !showReviewImage) return null;
    // Google profile photos load directly — no proxy needed
    if (
      rawImageUrl.includes("googleusercontent.com") ||
      rawImageUrl.includes("googleapis.com")
    ) {
      return rawImageUrl;
    }
    // Judge.me and metafield images go through the proxy
    return `${APP_PROXY}/image-proxy?url=${encodeURIComponent(rawImageUrl)}`;
  })();

  const textContent = (
    <s-stack direction="block" gap="tight" inlineAlignment={inlineAlignment}>
      <s-text size="small">
        {starsString(testimonial.rating)}
      </s-text>
      {showReviewTitle && testimonial.title ? (
        <s-text emphasis="bold" size="small">
          {testimonial.title}
        </s-text>
      ) : null}
      {showReviewBody && testimonial.body ? (
        <s-text size="small">
          {truncate(testimonial.body, 120)}
        </s-text>
      ) : null}
      {showReviewAuthor ? (
        <s-text size="extraSmall" appearance="subdued">
          — {testimonial.reviewerName}
        </s-text>
      ) : null}
    </s-stack>
  );

  return (
    <s-box background="subdued" borderRadius={borderRadius} padding="base">
      {imageUrl ? (
        <s-grid gridTemplateColumns="64px 1fr" gap="base" alignItems="start">
          <s-image
            src={imageUrl}
            alt={`Review by ${testimonial.reviewerName}`}
            aspectRatio="1/1"
            inlineSize="fill"
            borderRadius={borderRadius}
          />
          {textContent}
        </s-grid>
      ) : (
        textContent
      )}
    </s-box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <s-box border="base base solid" borderRadius="base" padding="base">
      <s-stack direction="block" gap="base">
        <s-grid gridTemplateColumns="1fr auto" alignItems="center" gap="base">
          <s-box background="base" borderRadius="base" blockSize="16px" inlineSize="180px" />
        </s-grid>
        <s-divider />
        <s-box background="subdued" borderRadius="base" padding="base">
          <s-stack direction="block" gap="small">
            <s-box background="base" borderRadius="base" blockSize="12px" inlineSize="60px" />
            <s-box background="base" borderRadius="base" blockSize="14px" inlineSize="fill" />
            <s-box background="base" borderRadius="base" blockSize="40px" inlineSize="fill" />
            <s-box background="base" borderRadius="base" blockSize="12px" inlineSize="100px" />
          </s-stack>
        </s-box>
      </s-stack>
    </s-box>
  );
}