import { describe, it, expect } from "vitest";

import {
    TAB_LABELS,
    getTabsForWidget,
} from "~/components/shared/CustomizeFormWidgets/subcomponents/TabConfig.js";
import { StyleTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/StyleTab.jsx";
import { LayoutTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/LayoutTab.jsx";
import { TextTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/TextTab.jsx";
import { PositionTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/PositionTab.jsx";
import { FbtStyleTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/Fbt/FbtStyleTab.jsx";
import { RecommendationStyleTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/Recommendation/RecommendationStyleTab.jsx";
import { OrderNoteStyleTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/OrderNote/OrderNoteStyleTab.jsx";
import { OrderNoteContentTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/OrderNote/OrderNoteContentTab.jsx";
import { OrderNotePositionTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/OrderNote/OrderNotePositionTab.jsx";
import { DonationsStyleTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/Donations/DonationsStyleTab.jsx";
import { DonationsContentTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/Donations/DonationsContentTab.jsx";
import { TestimonialsContentTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/Testimonials/TestimonialsContentTab.jsx";
import { CountdownStyleTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/Countdown/CountdownStyleTab.jsx";
import { CountdownContentTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/Countdown/CountdownContentTab.jsx";
import { CountdownPositionTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/Countdown/CountdownPositionTab.jsx";
import { DiscountCodeStyleTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/DiscountCode/DiscountCodeStyleTab.jsx";
import { DiscountCodeContentTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/DiscountCode/DiscountCodeContentTab.jsx";
import { DiscountCodePositionTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/DiscountCode/DiscountCodePositionTab.jsx";
import { StickyCartStyleTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/StickyCart/StickyCartStyleTab.jsx";
import { AnnouncementBarStyleTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/AnnouncementBar/AnnouncementBarStyleTab.jsx";
import { AnnouncementBarContentTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/AnnouncementBar/AnnouncementBarContentTab.jsx";
import { AnnouncementBarLayoutTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/AnnouncementBar/AnnouncementBarLayoutTab.jsx";

const ALL_TAB_KEYS = ["style", "layout", "text", "position"];

// Every widget type that has its own entry in WIDGET_TAB_CONFIG
const CONFIGURED_WIDGETS = [
    "donations", "testimonials_social_proof", "fbt", "frequently_bought_together",
    "recommendation", "customer_personalized_recommendation", "order_notes",
    "order_notes_cart_drawer", "countdown_timer_urgency", "discount_code_field",
    "sticky_cart", "announcement_bar_in_cart",
];

describe("TAB_LABELS", () => {
    it("has a human label for each tab key", () => {
        expect(TAB_LABELS).toEqual({
            style: "Style",
            layout: "Layout",
            text: "Text",
            position: "Position",
        });
    });
});

describe("getTabsForWidget: default tabs", () => {
    it.each([["bundle"], ["some_unknown_widget"], [""], [undefined], [null]])(
        "uses the four default tabs for %j",
        (widgetType) => {
            const { order, components } = getTabsForWidget(widgetType);
            expect(order).toEqual(["style", "layout", "text", "position"]);
            expect(components).toEqual({
                style: StyleTab,
                layout: LayoutTab,
                text: TextTab,
                position: PositionTab,
            });
        }
    );

    it("is case-sensitive: 'Donations' is not the 'donations' widget", () => {
        expect(getTabsForWidget("Donations").order).toEqual(["style", "layout", "text", "position"]);
    });

    // Characterization: these widget types are passed to WidgetCustomizeForm by their
    // widget components, but TabConfig has no entry for them, so they get the generic tabs.
    it.each([
        ["free_shipping_progress_bar"],
        ["gift_wrap"],
        ["shipping_protection"],
        ["trust_badges"],
        ["payment_icons"],
        ["popup_upsell_funnel"],
        ["ai_recommendations_in_cart"],
        ["in_cart_upsell_cross_sell"],
    ])("%s currently falls back to the generic tabs", (widgetType) => {
        expect(getTabsForWidget(widgetType)).toBe(getTabsForWidget("definitely_not_a_widget"));
    });

    it.todo("in_cart_upsell_cross_sell should use the InCartUpsell tabs (their files and imports still exist)");
});

describe("getTabsForWidget: per-widget configuration", () => {
    it.each([
        ["donations", ["style", "text"]],
        ["testimonials_social_proof", ["text", "style"]],
        ["fbt", ["style", "layout", "text", "position"]],
        ["recommendation", ["style", "layout", "text", "position"]],
        ["order_notes", ["style", "text"]],
        ["order_notes_cart_drawer", ["style", "text", "position"]],
        ["countdown_timer_urgency", ["style", "text", "position"]],
        ["discount_code_field", ["style", "text", "position"]],
        ["sticky_cart", ["style"]],
        ["announcement_bar_in_cart", ["style", "text", "layout"]],
    ])("%s shows tabs %j", (widgetType, expectedOrder) => {
        expect(getTabsForWidget(widgetType).order).toEqual(expectedOrder);
    });

    it("uses the dedicated components for donations and order notes", () => {
        expect(getTabsForWidget("donations").components.style).toBe(DonationsStyleTab);
        expect(getTabsForWidget("donations").components.text).toBe(DonationsContentTab);
        expect(getTabsForWidget("order_notes").components.style).toBe(OrderNoteStyleTab);
        expect(getTabsForWidget("order_notes").components.text).toBe(OrderNoteContentTab);
    });

    it("uses the order-note position tab only for the cart drawer version", () => {
        expect(getTabsForWidget("order_notes_cart_drawer").components.position).toBe(OrderNotePositionTab);
        expect(getTabsForWidget("order_notes_cart_drawer").components.style).toBe(OrderNoteStyleTab);
        expect(getTabsForWidget("order_notes").order).not.toContain("position");
    });

    it("uses the dedicated countdown tabs", () => {
        const { components } = getTabsForWidget("countdown_timer_urgency");
        expect(components.style).toBe(CountdownStyleTab);
        expect(components.text).toBe(CountdownContentTab);
        expect(components.position).toBe(CountdownPositionTab);
    });

    it("uses the dedicated discount-code tabs", () => {
        const { components } = getTabsForWidget("discount_code_field");
        expect(components.style).toBe(DiscountCodeStyleTab);
        expect(components.text).toBe(DiscountCodeContentTab);
        expect(components.position).toBe(DiscountCodePositionTab);
    });

    it("uses the dedicated announcement-bar tabs, with layout last", () => {
        const { order, components } = getTabsForWidget("announcement_bar_in_cart");
        expect(order[order.length - 1]).toBe("layout");
        expect(components.style).toBe(AnnouncementBarStyleTab);
        expect(components.text).toBe(AnnouncementBarContentTab);
        expect(components.layout).toBe(AnnouncementBarLayoutTab);
    });

    it("shows only a style tab for the sticky cart", () => {
        const { order, components } = getTabsForWidget("sticky_cart");
        expect(order).toEqual(["style"]);
        expect(components.style).toBe(StickyCartStyleTab);
    });

    it("reuses the generic StyleTab for testimonials but a dedicated text tab", () => {
        const { components } = getTabsForWidget("testimonials_social_proof");
        expect(components.style).toBe(StyleTab);
        expect(components.text).toBe(TestimonialsContentTab);
    });

    it("falls back to the default component for tabs a widget does not override", () => {
        const { components } = getTabsForWidget("fbt");
        expect(components.style).toBe(FbtStyleTab);
        expect(components.layout).toBe(LayoutTab);
        expect(components.text).toBe(TextTab);
        expect(components.position).toBe(PositionTab);
    });

    it("gives the alias widget types the same setup as the main ones", () => {
        expect(getTabsForWidget("frequently_bought_together").order).toEqual(getTabsForWidget("fbt").order);
        expect(getTabsForWidget("frequently_bought_together").components.style).toBe(FbtStyleTab);
        expect(getTabsForWidget("customer_personalized_recommendation").order)
            .toEqual(getTabsForWidget("recommendation").order);
        expect(getTabsForWidget("customer_personalized_recommendation").components.style)
            .toBe(RecommendationStyleTab);
    });
});

describe("getTabsForWidget: safety and integrity", () => {
    it("does not leak one widget's overrides into the defaults", () => {
        getTabsForWidget("donations");
        getTabsForWidget("order_notes");
        getTabsForWidget("countdown_timer_urgency");
        expect(getTabsForWidget("unknown").components.style).toBe(StyleTab);
        expect(getTabsForWidget("unknown").components.text).toBe(TextTab);
        expect(getTabsForWidget("unknown").components.position).toBe(PositionTab);
    });

    it("returns the same default object for repeated unknown lookups", () => {
        expect(getTabsForWidget("nope")).toBe(getTabsForWidget("also_nope"));
    });

    it.each(CONFIGURED_WIDGETS)("%s: every listed tab has a label and a component", (widgetType) => {
        const { order, components } = getTabsForWidget(widgetType);
        expect(order.length).toBeGreaterThan(0);
        for (const key of order) {
            expect(TAB_LABELS).toHaveProperty(key);
            expect(typeof components[key]).toBe("function");
        }
    });

    it.each(CONFIGURED_WIDGETS)("%s: lists no tab twice and only known tab keys", (widgetType) => {
        const { order } = getTabsForWidget(widgetType);
        expect(new Set(order).size).toBe(order.length);
        for (const key of order) expect(ALL_TAB_KEYS).toContain(key);
    });

    it.each(CONFIGURED_WIDGETS)("%s: is not just the default fallback", (widgetType) => {
        // Guards against a typo in a widget key that silently falls back to defaults
        expect(getTabsForWidget(widgetType)).not.toBe(getTabsForWidget("definitely_not_a_widget"));
    });
});