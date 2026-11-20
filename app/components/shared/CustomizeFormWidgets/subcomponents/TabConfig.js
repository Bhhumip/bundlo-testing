import { StyleTab } from "./StyleTab";
import { LayoutTab } from "./LayoutTab";
import { TextTab } from "./TextTab";
import { PositionTab } from "./PositionTab";
import { DonationsContentTab } from "./Donations/DonationsContentTab";
import { DonationsStyleTab } from "./Donations/DonationsStyleTab";
import { TestimonialsContentTab } from "./Testimonials/TestimonialsContentTab";
import { FbtStyleTab } from "./Fbt/FbtStyleTab";
import { RecommendationStyleTab } from "./Recommendation/RecommendationStyleTab";
import { OrderNoteContentTab } from "./OrderNote/OrderNoteContentTab";
import { OrderNoteStyleTab } from "./OrderNote/OrderNoteStyleTab";
import { OrderNotePositionTab } from "./OrderNote/OrderNotePositionTab";
import { CountdownPositionTab } from "./Countdown/CountdownPositionTab";
import { CountdownContentTab } from "./Countdown/CountdownContentTab";
import { CountdownStyleTab } from "./Countdown/CountdownStyleTab";
import { InCartUpsellContentTab } from "./InCartUpsell/InCartUpsellContentTab";
import { InCartUpsellStyleTab } from "./InCartUpsell/InCartUpsellStyleTab";
import { InCartUpsellLayoutTab } from "./InCartUpsell/InCartUpsellLayoutTab";
import { InCartUpsellPositionTab } from "./InCartUpsell/InCartUpsellPositionTab";
import { StickyCartStyleTab } from "./StickyCart/StickyCartStyleTab";
import { AnnouncementBarContentTab } from "./AnnouncementBar/AnnouncementBarContentTab";
import { AnnouncementBarStyleTab } from "./AnnouncementBar/AnnouncementBarStyleTab";
import { AnnouncementBarLayoutTab } from "./AnnouncementBar/AnnouncementBarLayoutTab";
import { EmptyWidgetTab } from "./EmptyWidgetTab";
import { DiscountCodeContentTab } from "./DiscountCode/DiscountCodeContentTab";
import { DiscountCodeStyleTab } from "./DiscountCode/DiscountCodeStyleTab";
import { DiscountCodePositionTab } from "./DiscountCode/DiscountCodePositionTab";

export const TAB_LABELS = {
    style: "Style",
    layout: "Layout",
    text: "Text",
    position: "Position",
};

const DEFAULT_TABS = {
    order: ["style", "layout", "text", "position"],
    components: {
        style: StyleTab,
        layout: LayoutTab,
        text: TextTab,
        position: PositionTab,
    },
};

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
        },
    },
    frequently_bought_together: {
        order: ["style", "layout", "text", "position"],
        components: {
            style: FbtStyleTab,
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
        },
    },
    order_notes: {
        order: ["style", "text"],
        components: {
            style: OrderNoteStyleTab,
            text: OrderNoteContentTab,
        },
    },
    order_notes_cart_drawer: {
        order: ["style", "text", "position"],
        components: {
            style: OrderNoteStyleTab,
            text: OrderNoteContentTab,
            position: OrderNotePositionTab,
        },
    },
    countdown_timer_urgency: {
        order: ["style", "text", "position"],
        components: {
            style: CountdownStyleTab,
            text: CountdownContentTab,
            position: CountdownPositionTab,
        },
    },
    discount_code_field: {
        order: ["style", "text", "position"],
        components: {
            style: DiscountCodeStyleTab,
            text: DiscountCodeContentTab,
            position: DiscountCodePositionTab,
        },
    },
    sticky_cart: {
        order: ["style"],
        components: {
            style: StickyCartStyleTab,
        },
    },
    announcement_bar_in_cart: {
        order: ["style", "text", "layout"],
        components: {
            style: AnnouncementBarStyleTab,
            text: AnnouncementBarContentTab,
            layout: AnnouncementBarLayoutTab,
        },
    },
};

export function getTabsForWidget(widgetType) {
    const override = WIDGET_TAB_CONFIG[widgetType];
    if (!override) return DEFAULT_TABS;

    return {
        order: override.order,
        components: { ...DEFAULT_TABS.components, ...override.components },
    };
}
