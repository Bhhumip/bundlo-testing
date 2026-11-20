// tabConfig.js — single source of truth for "which tabs does each widget show,
// and which component renders each tab". Add a new widget by adding one entry
// here; no changes needed anywhere else in WidgetCustomizeForm.

import { StyleTab } from "./StyleTab";
import { LayoutTab } from "./LayoutTab";
import { TextTab } from "./TextTab";
import { PositionTab } from "./PositionTab";
import { DonationsContentTab } from "./Donations/DonationsContentTab";
import { DonationsStyleTab } from "./Donations/DonationsStyleTab"; // new — see below
import { TestimonialsContentTab } from "./Testimonials/TestimonialsContentTab";
import { FbtStyleTab } from "./Fbt/FbtStyleTab";
import { RecommendationStyleTab } from "./Recommendation/RecommendationStyleTab";
import { OrderNoteContentTab } from "./OrderNote/OrderNoteContentTab";
import { OrderNoteStyleTab } from "./OrderNote/OrderNoteStyleTab";
// Human labels for tab buttons, keyed by tab id.
export const TAB_LABELS = {
    style: "Style",
    layout: "Layout",
    text: "Text",
    position: "Position",
};

// Default tab set + components for widgets with no special-case entry below.
const DEFAULT_TABS = {
    order: ["style", "layout", "text", "position"],
    components: {
        style: StyleTab,
        layout: LayoutTab,
        text: TextTab,
        position: PositionTab,
    },
};

// Per-widget overrides. Only list what differs from DEFAULT_TABS.
//   order:      which tabs show, and in what order — omit a tab entirely
//               to hide it (this is how "no Layout/Position for donations" works)
//   components: which component renders each listed tab
const WIDGET_TAB_CONFIG = {
    donations: {
        order: ["style", "text"],
        components: {
            style: DonationsStyleTab,
            text: DonationsContentTab,
        },
    },
    testimonials_social_proof: {
        order: ["text", "style"],
        components: {
            text: TestimonialsContentTab,
            style: StyleTab,
        },
    },
    fbt: {
        order: ["style", "layout", "text", "position"],
        components: {
            style: FbtStyleTab,
            // layout, text, position — DEFAULT_TABS  picked (LayoutTab, TextTab, PositionTab)
        },
    },
    frequently_bought_together: {
        order: ["style", "layout", "text", "position"],
        components: {
            style: FbtStyleTab,
            // layout, text, position — DEFAULT_TABS  picked
        },
    },
    recommendation: {
        order: ["style", "layout", "text", "position"],
        components: {
            style: RecommendationStyleTab,
        },
    },
    customer_personalized_recommendation: {
        order: ["style", "layout", "text", "position"],
        components: {
            style: RecommendationStyleTab,
            // layout, text, position — DEFAULT_TABS picked
        },

    },
    // Add future widgets here, e.g.:
    // reward_bar_progress_bar: { order: ["style", "text"], components: {...} },

    order_notes: {
        order: ["style", "text"],
        components: {
            style: OrderNoteStyleTab, // generic style tab is enough — borderRadius/gap/padding only
            text: OrderNoteContentTab,
        },
    },
};

/**
 * Resolve the tab list + component map for a given widget type.
 * Falls back to the generic four-tab set for anything not explicitly configured.
 */
export function getTabsForWidget(widgetType) {
    const override = WIDGET_TAB_CONFIG[widgetType];
    if (!override) return DEFAULT_TABS;

    return {
        order: override.order,
        components: { ...DEFAULT_TABS.components, ...override.components },
    };
}