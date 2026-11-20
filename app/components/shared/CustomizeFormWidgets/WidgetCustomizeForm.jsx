import { useState, useCallback, useEffect } from "react";
import { BundleCardPreview } from "../PreviewCheckout/BundleCardPreview";
import { TabButton } from "./subcomponents/TabButton";
import { Field, Group, ColorSwatch } from "./subcomponents/FormControls";
import { LayoutTab } from "./subcomponents/LayoutTab";
import { TextTab } from "./subcomponents/TextTab";
import { PositionTab } from "./subcomponents/PositionTab";
import { StyleTab } from "./subcomponents/StyleTab";
import { RecommendationCardPreview } from "../PreviewCheckout/RecommendationCardPreview";
import { FbtWidgetPreview } from "../PreviewCheckout/FbtWidgetPreview";
import { DefaultCheckoutPreview } from "../PreviewCheckout/DefaultCheckoutPreview";
import { TestimonialsCheckoutPreview } from "../PreviewCheckout/TestimonialsCheckoutPreview";
import { DonationsCheckoutPreview } from "../PreviewCheckout/DonationsCheckoutPreview";
import { DonationsContentTab } from "./subcomponents/Donations/DonationsContentTab";
import { DonationsStyleTab } from "./subcomponents/Donations/DonationsStyleTab";
import { getTabsForWidget, TAB_LABELS } from "./subcomponents/TabConfig";
import { useRef } from "react";
import { OrderNoteCheckoutPreview } from "../PreviewCheckout/OrderNoteCheckoutPreview";
import { CountdownCartDrawerPreview } from "../PreviewCartDrawer/CountdownCartDrawerPreview";
import { StickyCartPreview } from "../PreviewCartDrawer/StickyCartPreview";
import { AnnouncementBarPreview } from "../PreviewCartDrawer/AnnouncementBarPreview";
import { OrderNoteCartDrawerPreview } from "../PreviewCartDrawer/OrderNoteCartDrawerPreview";
import { DiscountCodeCartDrawerPreview } from "../PreviewCartDrawer/DiscountCodeCartDrawerPreview";
import { FreeShippingProgressBarPreview } from "../PreviewCartDrawer/FreeShippingProgressBarPreview";

// Testimonials-specific tabs aren't built yet — show a friendly placeholder
function TestimonialsTabPlaceholder({ tabName }) {
    return (
        <div
            style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "#6d7175",
                fontSize: "13px",
            }}
        >
            {tabName} settings for testimonials are coming soon.
        </div>
    );
}

// ─── Preview registry ────────────────────────────────────────────────────────
// To add a new widget preview: import it above and add one line here.
const PREVIEW_REGISTRY = {
    sticky_cart: StickyCartPreview,
    announcement_bar_in_cart: AnnouncementBarPreview,
    bundle: BundleCardPreview,
    recommendation: RecommendationCardPreview,
    fbt: FbtWidgetPreview,
    testimonials_social_proof: TestimonialsCheckoutPreview,
    donations: DonationsCheckoutPreview,
    order_notes: OrderNoteCheckoutPreview,
    countdown_timer_urgency: CountdownCartDrawerPreview,
    order_notes_cart_drawer: OrderNoteCartDrawerPreview,
    discount_code_field: DiscountCodeCartDrawerPreview,
    free_shipping_progress_bar: FreeShippingProgressBarPreview,
    // remaining checkout widgets all fall through to DefaultCheckoutPreview
};

const CHECKOUT_WIDGET_TYPES = [
    "one_click_upsell_at_checkout",
    "automatic_discounts",
    "downsell_funnel",
    "targeting_rules",
    "ab_testing",
    "shipping_method_rules",
    "payment_method_rules",
    "donations",
    "testimonials_social_proof",
    "reward_bar_progress_bar",
    "order_notes",
];
//----------------------Defaults for preview------------------------
const TESTIMONIALS_CHECKOUT_DEFAULTS = {
    borderRadius: "large",
    gap: "base",
    padding: "base",
    titleSize: "base",
    layoutDirection: "vertical",   // "vertical" | "horizontal" (carousel) | "grid"
    itemsPerRow: 2,             // used by grid layout: 1 | 2 | 3
    reviewsToShow: 4,             // total reviews pulled in (1–4)
    reviewsPerPage: 1,             // reviews per page for vertical/grid pagination
    reviewSource: "auto",
};
const DONATIONS_CHECKOUT_DEFAULTS = {
    charityName: "",
    headline: "Add a small donation",
    subheading: "Round up or add a contribution at checkout.",
    ctaLabel: "Donate",
    impactMessage: "",
    learnMoreUrl: "",
    donationTiers: [10, 20, 50],      // merchant-editable preset amounts
    allowCustomAmount: true,
    customMinAmount: 1,
    customMaxAmount: 5000,
    allowRoundUp: false,
    buttonVariant: "outline",         // reuse existing token
    borderRadius: "large",            // reuse existing token
    gap: "base",
    padding: "base",
};


const ORDER_NOTES_CHECKOUT_DEFAULTS = {
    label: "Order note",
    placeholder: "Add a note for your order",
    maxLength: 300,
    required: false,
    borderRadius: "base",
    gap: "base",
    padding: "base",
};

//-----default preview cart drawer------
const ORDER_NOTES_CART_DRAWER_DEFAULTS = {
    label: "Order note",
    placeholder: "Add a note for your order",
    maxLength: 300,
    required: false,
    borderRadius: "base",
    gap: "base",
    padding: "base",
    showOnCartPage: true,
    showInCartDrawer: true,
};

const COUNTDOWN_CART_DRAWER_DEFAULTS = {
    enabled: true,
    mainMessage: "Hurry up!! Limited in Stock!",
    itemCartMessage: "Item in your cart is reserved for:",
    countdownDuration: 15,
    extendedTimeHeading: "Time Extended 🔥",
    extendedTimeMessage: "Items in your cart are reserved for:",
    extendedTime: 180,
    expirationBehavior: "show_expired_text",
    messageTextColor: "#000000",
    backgroundColor: "#FFF7C4",
    timerColor: "#FF0000",
    fontSize: 16,
    fontBold: false,
    borderStyle: "solid",
    borderWidth: 2,
    borderRadius: 20,
    borderColor: "#F44336",
    padding: 15,
    margin: 10,
    cartPageTopPosition: 5,
    cartPageLeftPosition: 50,
    customCSS: "",
    showOnCartPage: true,
    showInCartDrawer: true,
};
// ─── Default theme ────────────────────────────────────────────────────────────
const DEFAULT_THEME = {
    titleBundle: "Complete the bundle",
    titleRecommendations: "You may also like",
    titleOrderHistory: "Buy again",
    titleBestSellers: "Popular right now",
    titleFbt: "Frequently bought together",
    widgetBackground: "#f5f5f0",
    cardBackground: "#ffffff",
    borderColor: "#e0e0e0",
    borderWidth: 1,
    borderRadius: 12,
    buttonVariant: "outline",
    buttonColor: "#262626",
    buttonRadius: 8,
    imageRadius: 10,
    imageSize: 52,
    badgeColor: "#22c55e",
    titleColor: "#191919",
    titleSize: 13,
    priceColor: "#6b7280",
    showPrice: true,
    showBadge: true,
    discountValue: 10,          // ← merchant-configurable discount % shown in badge
    showDivider: true,
    customCss: "",

    // Layout / positioning
    layoutDirection: "vertical",   // "vertical" | "horizontal" | "grid"
    itemsPerRow: 2,                // only used when horizontal or grid
    alignment: "left",             // "left" | "center" | "right"
    widgetMaxWidth: "100%",        // "100%" | "420px" | "320px"
    // mobileLayout: "stack",         // "stack" | "scroll"
    // showScrollArrows: false,       // horizontal scroll arrows
    cardMinWidth: 140,

    gap: "normal",                 // "tight" | "normal" | "loose"
    padding: 12,                   // px
    imageRatio: "1:1",             // "1:1" | "4:5" | "16:9"

    cardAlignment: "top",          // "top" | "stretch"
    textAlignment: "left",         // "left" | "center" | "right"

    // Testimonials
    testimonialsTitle: "What customers are saying",
    showReviewImage: true,
    showReviewTitle: true,
    showReviewBody: true,
    showReviewAuthor: true,
    showOverallRating: true,
    starColor: "#f59e0b",
    reviewsPerPage: 1,
    paginationStyle: "arrows",   // "arrows" | "dots" | "none"
    reviewSource: "auto",        // "auto" | "judgeme" | "google" | "metafield"


    productIds: "",
    maxProducts: 3,
    headline: "You may also like",
    subheading: "Recommend relevant add-ons before checkout.",
};


// ─── Shared style tokens ──────────────────────────────────────────────────────
const S = {
    root: {
        display: "grid",
        gridTemplateColumns: "30% 70%",
        minHeight: "580px",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        overflow: "hidden",
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: "13px",
        background: "#ffffff",
    },
    panel: {
        background: "#fafafa",
        borderRight: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
    },
    tabs: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        borderBottom: "1px solid #e5e7eb",
    },
    previewPane: {
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
    },
    previewHeader: {
        padding: "10px 16px",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#fafafa",
    },
    previewCanvas: {
        flex: 1,
        padding: "24px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        background: "#f3f4f6",
    },
    previewInner: {
        width: "100%",
        maxWidth: "420px",
    },
    footer: {
        padding: "10px 16px",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        justifyContent: "flex-end",
        background: "#fafafa",
    },
    formBody: {
        padding: "14px",
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
    },
    group: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    groupLabel: {
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "#9ca3af",
    },
    field: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
    },
    fieldLabel: {
        fontSize: "12px",
        color: "#374151",
    },
    select: {
        fontSize: "12px",
        padding: "4px 8px",
        borderRadius: "6px",
        border: "1px solid #d1d5db",
        background: "#fff",
        color: "#111827",
        cursor: "pointer",
    },
    colorInput: {
        width: "32px",
        height: "26px",
        padding: "1px",
        borderRadius: "5px",
        border: "1px solid #d1d5db",
        cursor: "pointer",
        background: "none",
    },
    rangeWrapper: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
    },
    rangeVal: {
        fontSize: "11px",
        color: "#9ca3af",
        minWidth: "28px",
        textAlign: "right",
    },
    textFull: {
        fontSize: "12px",
        padding: "6px 8px",
        borderRadius: "6px",
        border: "1px solid #d1d5db",
        background: "#fff",
        color: "#111827",
        width: "100%",
        boxSizing: "border-box",
        outline: "none",
    },
    textarea: {
        fontSize: "11px",
        padding: "6px 8px",
        borderRadius: "6px",
        border: "1px solid #d1d5db",
        background: "#fff",
        color: "#111827",
        width: "100%",
        boxSizing: "border-box",
        resize: "vertical",
        fontFamily: "monospace",
        outline: "none",
    },
    btnSave: {
        fontSize: "12px",
        padding: "6px 16px",
        background: "#111827",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontWeight: 500,
    },
    btnReset: {
        fontSize: "12px",
        padding: "6px 12px",
        background: "transparent",
        color: "#6b7280",
        border: "1px solid #d1d5db",
        borderRadius: "6px",
        cursor: "pointer",
    },
    savedBadge: {
        fontSize: "11px",
        color: "#16a34a",
        marginRight: "auto",
        display: "flex",
        alignItems: "center",
        gap: "4px",
    },
    // ── Dropdown for jumping between widgets (Part 2) ──
    navWidget: {
        padding: "8px 16px",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "#ffffff",
    },
    navLabel: {
        fontSize: "11px",
        color: "#6b7280",
        whiteSpace: "nowrap",
    },
    navSelect: {
        fontSize: "12px",
        padding: "5px 8px",
        borderRadius: "6px",
        border: "1px solid #d1d5db",
        background: "#fff",
        color: "#111827",
        cursor: "pointer",
        maxWidth: "240px",
    },
};

// ─── Condition block styles ───────────────────────────────────────────────────
const styles = {
    conditionBlock: {
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        overflow: "hidden",
    },
    conditionHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "7px 10px",
        background: "#f9fafb",
        borderBottom: "1px solid #e5e7eb",
    },
    conditionName: {
        fontSize: "11px",
        fontWeight: 600,
        color: "#111827",
    },
    conditionHint: {
        fontSize: "10px",
        color: "#9ca3af",
    },
    conditionBody: {
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        background: "#ffffff",
    },
};

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * WidgetCustomizeForm
 *
 * Props:
 *   widgetType       {string}   — e.g. "bundle" | "recommendation" | "fbt"
 *                                 or any checkout widget key like "donations"
 *   initialTheme     {object}   — saved theme from DB (optional, falls back to DEFAULT_THEME)
 *   onSave           {function} — called with final theme object when merchant hits Save
 *   mode             {string}   — optional, "checkout" or "storefront".
 *                                 If omitted, auto-derived from widgetType.
 */
export function WidgetCustomizeForm({ widgetType, initialTheme, onSave, mode: propMode }) {
    const [activeTab, setActiveTab] = useState("style");
    const [saved, setSaved] = useState(false);
    const [mobilePreview, setMobilePreview] = useState(false);
    const [previewCondition, setPreviewCondition] = useState(
        widgetType === "fbt" ? "fbt" : "recommendations"
    );

    const widgetTypeRef = useRef(widgetType);

    // Derive mode if not explicitly passed
    const isCheckoutWidget = CHECKOUT_WIDGET_TYPES.includes(widgetType);
    const mode = propMode || (isCheckoutWidget ? "checkout" : "storefront");
    const { order: visibleTabs, components: tabComponents } = getTabsForWidget(widgetType);

    const normalizeTheme = (t) => {
        const isTestimonials = widgetType === "testimonials_social_proof";
        const isDonations = widgetType === "donations";
        const isOrderNotes = widgetType === "order_notes";
        const isOrderNotesCartDrawer = widgetType === "order_notes_cart_drawer";
        const isCountdownCartDrawer = widgetType === "countdown_timer_urgency";
        const isStickyCart = widgetType === "sticky_cart";
        const isAnnouncementBar = widgetType === "announcement_bar_in_cart";
        const base = {
            ...(isAnnouncementBar ? {
                enableBar: true,
                text1: "?? Free Shipping on Orders Over $50",
                text2: "? Trusted by 10,000+ Customers",
                text3: "?? Secure Checkout Guaranteed",
                text4: "?? Buy More & Save More",
                text5: "?? Fast Delivery Across India",
                enableScroll: true,
                showHome: true,
                showCart: true,
                showCartDrawer: true,
                bgColor: "#000000",
                textColor: "#ffffff",
                margin: 0,
                padding: 12,
                homePosition: "top",
                cartPosition: "top",
            } : {}),
            ...(isStickyCart ? {
                bgColor: t?.bgColor ?? "#ffffff",
                buttonBg: t?.buttonBg ?? "#000000",
                buttonText: t?.buttonText ?? "#ffffff",
            } : {}),
            ...DEFAULT_THEME,
            ...(t || {}),
            // These four fields stay as numbers for storefront/FBT widgets,
            // but become token strings for testimonials checkout widget
            borderRadius: isTestimonials
                ? (t?.borderRadius ?? "large")
                : (typeof t?.borderRadius === "string" ? 12 : (t?.borderRadius ?? 12)),
            titleSize: isTestimonials
                ? (t?.titleSize ?? "base")
                : (typeof t?.titleSize === "string" ? 13 : (t?.titleSize ?? 13)),
            padding: isTestimonials
                ? (t?.padding ?? "base")
                : (typeof t?.padding === "string" ? 12 : (t?.padding ?? 12)),
            gap: isTestimonials
                ? (t?.gap ?? "base")
                : (t?.gap ?? "normal"),
            // These always stay as numbers regardless of widget type
            borderWidth: typeof t?.borderWidth === "string" ? 1 : (t?.borderWidth ?? 1),
            buttonRadius: typeof t?.buttonRadius === "string" ? 8 : (t?.buttonRadius ?? 8),
            imageRadius: typeof t?.imageRadius === "string" ? 10 : (t?.imageRadius ?? 10),
            imageSize: typeof t?.imageSize === "string" ? 52 : (t?.imageSize ?? 52),
            reviewsPerPage: typeof t?.reviewsPerPage === "string" ? 1 : (t?.reviewsPerPage ?? 1),
        };

        // Merge testimonials-specific token defaults on top for that widget
        if (isTestimonials) {
            return { ...base, ...TESTIMONIALS_CHECKOUT_DEFAULTS, ...(t || {}) };
        }

        // Merge donations-specific token defaults on top for that widget
        if (isDonations) {
            return { ...base, ...DONATIONS_CHECKOUT_DEFAULTS, ...(t || {}) };
        }
        // Merge order notes-specific token defaults on top for that widget
        if (isOrderNotes) {
            return { ...base, ...ORDER_NOTES_CHECKOUT_DEFAULTS, ...(t || {}) };
        }

        // Merge countdown cart drawer-specific token defaults on top for that widget
        if (isCountdownCartDrawer) {
            return { ...base, ...COUNTDOWN_CART_DRAWER_DEFAULTS, ...(t || {}) };
        }

        // Merge order notes cart drawer-specific token defaults on top for that widget
        if (isOrderNotesCartDrawer) {
            return { ...base, ...ORDER_NOTES_CART_DRAWER_DEFAULTS, ...(t || {}) };
        }

        return base;
    };

    // Single field updater — keeps updates cheap
    const update = useCallback((key, value) => {
        setSaved(false);
        setTheme((prev) => ({ ...prev, [key]: value }));
    }, []);

    // Reset internal state whenever the widget being edited changes
    useEffect(() => {
        if (widgetTypeRef.current !== widgetType) {
            widgetTypeRef.current = widgetType;
            setTheme(normalizeTheme(initialTheme));
            setSaved(false);
            setActiveTab(getTabsForWidget(widgetType).order[0]);
            setPreviewCondition(widgetType === "fbt" ? "fbt" : "recommendations");
        }
    }, [widgetType, initialTheme]);


    const CONDITION_PREVIEW_MAP = {
        fbt: FbtWidgetPreview,
        bundle: BundleCardPreview,
        recommendations: RecommendationCardPreview,
        orderHistory: RecommendationCardPreview,
        bestSellers: RecommendationCardPreview,
        testimonials_social_proof: TestimonialsCheckoutPreview,
    };
    // WIDGETS THAT HAVE A DEDICATED PREVIEW COMPONENT
    // (add any future checkout widget previews here)
    const CHECKOUT_PREVIEW_REGISTRY = {
        testimonials_social_proof: TestimonialsCheckoutPreview,
        donations: DonationsCheckoutPreview,
        order_notes: OrderNoteCheckoutPreview,
        // e.g. reward_bar_progress_bar: RewardBarPreview,
    };

    // WIDGETS THAT HAVE A DEDICATED PREVIEW COMPONENT
    const SINGLE_PREVIEW_WIDGET_TYPES = [
    "order_notes_cart_drawer",
    "countdown_timer_urgency",
    "sticky_cart",
    "announcement_bar_in_cart",
    "discount_code_field",
];

    const PreviewComponent = (() => {
        if (CHECKOUT_PREVIEW_REGISTRY[widgetType]) {
            return CHECKOUT_PREVIEW_REGISTRY[widgetType];
        }
        if (CHECKOUT_WIDGET_TYPES.includes(widgetType)) {
            return DefaultCheckoutPreview;
        }
        if (SINGLE_PREVIEW_WIDGET_TYPES.includes(widgetType) && PREVIEW_REGISTRY[widgetType]) {
            return PREVIEW_REGISTRY[widgetType];
        }
        if (activeTab === "style") {
            return CONDITION_PREVIEW_MAP[previewCondition] || DefaultCheckoutPreview;
        }
        return PREVIEW_REGISTRY[widgetType] || DefaultCheckoutPreview;
    })();

    function handleSave() {
        //alert(theme.discountValue);
        //console.log("[SAVE DEBUG] theme.imageRadius before save:", theme.imageRadius, "type:", typeof theme.imageRadius);
        let themeToSave = theme;

        if (widgetType === "testimonials_social_proof") {
            // Testimonials checkout: only Shopify UI Extension safe fields
            // NO hex colors, NO pixel values — only tokens and booleans
            themeToSave = {
                testimonialsTitle: theme.testimonialsTitle,
                showReviewImage: theme.showReviewImage,
                showReviewTitle: theme.showReviewTitle,
                showReviewBody: theme.showReviewBody,
                showReviewAuthor: theme.showReviewAuthor,
                showOverallRating: theme.showOverallRating,
                paginationStyle: theme.paginationStyle,
                reviewsPerPage: theme.reviewsPerPage,
                buttonVariant: theme.buttonVariant,    // "filled"|"outline"|"plain"
                borderRadius: theme.borderRadius,     // "none"|"base"|"large"
                gap: theme.gap,              // "tight"|"base"|"loose"
                padding: theme.padding,          // "tight"|"base"|"loose"
                titleSize: theme.titleSize,        // "small"|"base"|"large"
                textAlignment: theme.textAlignment,    // "left"|"center"|"right"
                alignment: theme.alignment,        // "left"|"center"|"right"
                layoutDirection: theme.layoutDirection,
                itemsPerRow: theme.itemsPerRow,
                reviewsToShow: theme.reviewsToShow,
                reviewSource: theme.reviewSource ?? "auto",

                // JudgeMe API tokens for fetching reviews
                judgeMePrivateToken: theme.judgeMePrivateToken ?? "",
                judgeMePublicToken: theme.judgeMePublicToken ?? "",

            };
        } else if (widgetType === "donations") {
            themeToSave = {
                charityName: theme.charityName,
                headline: theme.headline,
                subheading: theme.subheading,
                ctaLabel: theme.ctaLabel,
                impactMessage: theme.impactMessage,
                learnMoreUrl: theme.learnMoreUrl,
                donationTiers: theme.donationTiers,
                allowCustomAmount: theme.allowCustomAmount,
                customMinAmount: theme.customMinAmount,
                customMaxAmount: theme.customMaxAmount,
                allowRoundUp: theme.allowRoundUp,
                buttonVariant: theme.buttonVariant,
                borderRadius: theme.borderRadius,
                gap: theme.gap,
                padding: theme.padding,
                donationVariantId: theme.donationVariantId,
                donationProductTitle: theme.donationProductTitle,
                donationProductImage: theme.donationProductImage,
            };
        } else if (widgetType === "order_notes") {          // ← add
            themeToSave = {
                label: theme.label,
                placeholder: theme.placeholder,
                maxLength: theme.maxLength,
                required: theme.required,
                borderRadius: theme.borderRadius,
                gap: theme.gap,
                padding: theme.padding,
            };
        } else if (widgetType === "order_notes_cart_drawer") {
            themeToSave = {
                label: theme.label,
                placeholder: theme.placeholder,
                maxLength: theme.maxLength,
                required: theme.required,
                borderRadius: theme.borderRadius,
                gap: theme.gap,
                padding: theme.padding,
                showOnCartPage: theme.showOnCartPage,
                showInCartDrawer: theme.showInCartDrawer,
            };
        } else if (widgetType === "announcement_bar_in_cart") {
            themeToSave = {
                enableBar: theme.enableBar,
                text1: theme.text1,
                text2: theme.text2,
                text3: theme.text3,
                text4: theme.text4,
                text5: theme.text5,
                enableScroll: theme.enableScroll,
                showHome: theme.showHome,
                showCart: theme.showCart,
                showCartDrawer: theme.showCartDrawer,
                bgColor: theme.bgColor,
                textColor: theme.textColor,
                margin: theme.margin,
                padding: theme.padding,
                homePosition: theme.homePosition,
                cartPosition: theme.cartPosition,
            };
        } else if (widgetType === "countdown_timer_urgency") {
            themeToSave = {
                enabled: theme.enabled,
                mainMessage: theme.mainMessage,
                itemCartMessage: theme.itemCartMessage,
                countdownDuration: theme.countdownDuration,
                extendedTimeHeading: theme.extendedTimeHeading,
                extendedTimeMessage: theme.extendedTimeMessage,
                extendedTime: theme.extendedTime,
                expirationBehavior: theme.expirationBehavior,
                messageTextColor: theme.messageTextColor,
                backgroundColor: theme.backgroundColor,
                timerColor: theme.timerColor,
                fontSize: theme.fontSize,
                fontBold: theme.fontBold,
                borderStyle: theme.borderStyle,
                borderWidth: theme.borderWidth,
                borderRadius: theme.borderRadius,
                borderColor: theme.borderColor,
                padding: theme.padding,
                margin: theme.margin,
                cartPageTopPosition: theme.cartPageTopPosition,
                cartPageLeftPosition: theme.cartPageLeftPosition,
                customCSS: theme.customCSS,
                showOnCartPage: theme.showOnCartPage,
                showInCartDrawer: theme.showInCartDrawer,
            };
        }
        else if (mode === "checkout") {
            // Other checkout widgets (FBT, donations, etc.) — existing logic
            themeToSave = {
                titleFbt: theme.titleFbt,
                titleBundle: theme.titleBundle,
                titleRecommendations: theme.titleRecommendations,
                titleOrderHistory: theme.titleOrderHistory,
                titleBestSellers: theme.titleBestSellers,
                showPrice: theme.showPrice,
                showBadge: theme.showBadge,
                showDivider: theme.showDivider,
                discountValue: theme.discountValue,
                layoutDirection: theme.layoutDirection,
                itemsPerRow: theme.itemsPerRow,
                alignment: theme.alignment,
                widgetMaxWidth: theme.widgetMaxWidth,
                // mobileLayout: theme.mobileLayout,
                // showScrollArrows: theme.showScrollArrows,
                gap: theme.gap,
                padding: theme.padding,
                imageRatio: theme.imageRatio,
                cardAlignment: theme.cardAlignment,
                textAlignment: theme.textAlignment,
                buttonVariant: theme.buttonVariant,
                imageRadius: theme.imageRadius,
                imageSize: theme.imageSize,
                titleSize: theme.titleSize,
            };
        }
        // storefront widgets: save full theme as-is
        // console.log("[SAVE DEBUG] themeToSave.imageRadius sending:", themeToSave.imageRadius);

        console.log("SAVING THEME =", JSON.stringify(themeToSave, null, 2));
        console.log("saving:", themeToSave)
        console.log(theme.discountValue);
        if (onSave) onSave(themeToSave);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    }

    function handleReset() {
        setTheme({ ...DEFAULT_THEME });
        setSaved(false);
    }
    const [theme, setTheme] = useState(normalizeTheme(initialTheme));
    const computedMaxWidth =
        mobilePreview
            ? "320px"
            : theme.widgetMaxWidth;
    return (
        <div style={S.root}>
            {/* ── Left panel: form ── */}
            <div style={S.panel}>
                <div style={{ ...S.tabs, gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}>
                    {visibleTabs.map((tabKey) => (
                        <TabButton
                            key={tabKey}
                            label={TAB_LABELS[tabKey]}
                            active={activeTab === tabKey}
                            onClick={() => setActiveTab(tabKey)}
                        />
                    ))}
                </div>

                <div style={S.formBody}>
                    {(() => {
                        const ActiveTabComponent = tabComponents[activeTab];
                        if (!ActiveTabComponent) return null;
                        return (
                            <ActiveTabComponent
                                mode={mode}
                                theme={theme}
                                update={update}
                                widgetType={widgetType}
                                previewCondition={previewCondition}
                                setPreviewCondition={setPreviewCondition}
                            />
                        );
                    })()}
                </div>
            </div>
            {/* ── Right panel: preview ── */}
            <div style={S.previewPane}>
                <div style={S.previewHeader}>
                    <span
                        style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                            color: "#9ca3af",
                        }}
                    >
                        Live preview ({mode === "checkout" ? "Checkout" : "Storefront"})
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                        <button
                            onClick={() => setMobilePreview(false)}
                            style={{
                                ...S.btnReset,
                                background: !mobilePreview ? "#f3f4f6" : "transparent",
                                color: !mobilePreview ? "#111827" : "#9ca3af",
                                padding: "3px 10px",
                                fontSize: "11px",
                            }}
                        >
                            Desktop
                        </button>
                        <button
                            onClick={() => setMobilePreview(true)}
                            style={{
                                ...S.btnReset,
                                background: mobilePreview ? "#f3f4f6" : "transparent",
                                color: mobilePreview ? "#111827" : "#9ca3af",
                                padding: "3px 10px",
                                fontSize: "11px",
                            }}
                        >
                            Mobile
                        </button>
                    </div>
                </div>

                <div
                    style={{
                        ...S.previewCanvas,
                        justifyContent:
                            theme.alignment === "center"
                                ? "center"
                                : theme.alignment === "right"
                                    ? "flex-end"
                                    : "flex-start",
                    }}
                >
                    <div
                        style={{
                            width: computedMaxWidth === "100%" ? "100%" : computedMaxWidth,
                            maxWidth: "100%",
                            transition: "width .2s ease",
                        }}
                    >
                        <PreviewComponent
                            theme={{
                                ...theme,
                                // Inject the active condition's title so preview always shows the right one
                                titleBundle: previewCondition === "bundle"
                                    ? theme.titleBundle
                                    : theme.titleBundle,
                                titleRecommendations: previewCondition === "recommendations"
                                    ? theme.titleRecommendations
                                    : previewCondition === "orderHistory"
                                        ? theme.titleOrderHistory
                                        : previewCondition === "bestSellers"
                                            ? theme.titleBestSellers
                                            : theme.titleRecommendations,
                            }}
                            widgetType={widgetType}
                            isMobileView={mobilePreview}
                            mode={mode}
                        />
                    </div>
                </div>

                <div style={S.footer}>
                    {saved && <span style={S.savedBadge}>✓ Saved</span>}
                    <button style={S.btnReset} onClick={handleReset}>
                        Reset
                    </button>
                    <button style={S.btnSave} onClick={handleSave}>
                        Save changes
                    </button>
                </div>
            </div>
        </div >
    );
}






