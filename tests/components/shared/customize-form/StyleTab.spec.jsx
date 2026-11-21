import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { StyleTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/StyleTab.jsx";
import { baseTheme } from "../../../helpers/theme.js";
import {
    getControl, getGroupLabels, optionValues, optionLabels, countControls,
} from "../../../helpers/formPanel.js";

const SWATCH_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280"];
const CHECKOUT_HINT = "In checkout, colors and borders follow your Shopify checkout branding.";

function setup(props = {}) {
    const update = vi.fn();
    const view = render(<StyleTab mode="storefront" theme={baseTheme} update={update} {...props} />);
    return { update, ...view };
}

describe("StyleTab: storefront mode", () => {
    it("shows the three storefront groups in order, and no checkout hint", () => {
        const { container } = setup();
        expect(getGroupLabels(container)).toEqual([
            "Background (Storefront)",
            "Border (Storefront)",
            "Badge color (Storefront)",
        ]);
        expect(screen.queryByText(CHECKOUT_HINT)).not.toBeInTheDocument();
    });

    it.each([[undefined], ["storefront"], ["preview"], [""]])(
        "treats mode %j as storefront (only the exact value 'checkout' hides the controls)",
        (mode) => {
            const { container } = setup({ mode });
            expect(getGroupLabels(container)).toHaveLength(3);
        }
    );

    it("does not call update just by rendering", () => {
        const { update } = setup();
        expect(update).not.toHaveBeenCalled();
    });

    describe("color inputs", () => {
        it.each([
            ["Background (Storefront)", "Widget bg", "widgetBackground", "#f5f5f0"],
            ["Background (Storefront)", "Card bg", "cardBackground", "#ffffff"],
            ["Border (Storefront)", "Color", "borderColor", "#e0e0e0"],
        ])("%s / %s shows the theme color and reports changes", (group, field, key, current) => {
            const { container, update } = setup();
            const input = getControl(container, group, field);
            expect(input).toHaveAttribute("type", "color");
            expect(input.value).toBe(current);

            fireEvent.change(input, { target: { value: "#123456" } });
            expect(update).toHaveBeenCalledTimes(1);
            expect(update).toHaveBeenCalledWith(key, "#123456");
        });

        it("shows the new color when the theme changes", () => {
            const { container, rerender, update } = setup();
            rerender(<StyleTab mode="storefront" theme={{ ...baseTheme, widgetBackground: "#000000" }} update={update} />);
            expect(getControl(container, "Background (Storefront)", "Widget bg").value).toBe("#000000");
        });
    });

    describe("border width", () => {
        it("is a 0 to 3 range in steps of 1", () => {
            const { container } = setup();
            const range = getControl(container, "Border (Storefront)", "Width");
            expect(range).toHaveAttribute("type", "range");
            expect(range).toHaveAttribute("min", "0");
            expect(range).toHaveAttribute("max", "3");
            expect(range).toHaveAttribute("step", "1");
            expect(range.value).toBe("1");
        });

        it("shows the width in px next to the slider and keeps it in sync", () => {
            const { container, rerender, update } = setup();
            expect(screen.getByText("1px")).toBeInTheDocument();
            rerender(<StyleTab mode="storefront" theme={{ ...baseTheme, borderWidth: 3 }} update={update} />);
            expect(screen.getByText("3px")).toBeInTheDocument();
            expect(getControl(container, "Border (Storefront)", "Width").value).toBe("3");
        });

        it.each([["0", 0], ["2", 2], ["3", 3]])("sends the number %s (not a string)", (raw, expected) => {
            const { container, update } = setup();
            fireEvent.change(getControl(container, "Border (Storefront)", "Width"), { target: { value: raw } });
            expect(update).toHaveBeenCalledWith("borderWidth", expected);
            expect(typeof update.mock.calls[0][1]).toBe("number");
        });
    });

    describe("border radius", () => {
        it("offers Sharp, Soft, Rounded and Pill", () => {
            const { container } = setup();
            const select = getControl(container, "Border (Storefront)", "Radius");
            expect(optionValues(select)).toEqual(["0", "6", "12", "20"]);
            expect(optionLabels(select)).toEqual(["Sharp", "Soft", "Rounded", "Pill"]);
        });

        it("shows the theme's current radius", () => {
            const { container } = setup();
            expect(getControl(container, "Border (Storefront)", "Radius").value).toBe("12");
        });

        it.each([["0", 0], ["6", 6], ["20", 20]])("sends the number for option %s", async (value, expected) => {
            const { container, update } = setup();
            await userEvent.selectOptions(getControl(container, "Border (Storefront)", "Radius"), value);
            expect(update).toHaveBeenCalledTimes(1);
            expect(update).toHaveBeenCalledWith("borderRadius", expected);
        });

        // Characterization: a radius that is not one of the four options (for example a
        // token string such as "large") is displayed as the first option, "Sharp".
        it("displays an unlisted radius as the first option", () => {
            const { container } = setup({ theme: { ...baseTheme, borderRadius: "large" } });
            expect(getControl(container, "Border (Storefront)", "Radius").value).toBe("0");
        });
    });

    describe("badge color swatches", () => {
        const swatch = (color) => screen.getByTitle(color);

        it("offers six preset colors", () => {
            setup();
            for (const c of SWATCH_COLORS) expect(swatch(c)).toBeInTheDocument();
        });

        it("sends the clicked color", async () => {
            const { update } = setup();
            await userEvent.click(swatch("#3b82f6"));
            expect(update).toHaveBeenCalledTimes(1);
            expect(update).toHaveBeenCalledWith("badgeColor", "#3b82f6");
        });

        it.each(SWATCH_COLORS)("can pick %s", async (color) => {
            const { update } = setup();
            await userEvent.click(swatch(color));
            expect(update).toHaveBeenCalledWith("badgeColor", color);
        });

        it("highlights only the current badge color", () => {
            setup({ theme: { ...baseTheme, badgeColor: "#ef4444" } });
            const outlined = SWATCH_COLORS.filter((c) => swatch(c).style.outline.includes("solid"));
            expect(outlined).toEqual(["#ef4444"]);
        });

        it("highlights nothing when the badge color is not a preset", () => {
            setup({ theme: { ...baseTheme, badgeColor: "#123456" } });
            const outlined = SWATCH_COLORS.filter((c) => swatch(c).style.outline.includes("solid"));
            expect(outlined).toEqual([]);
        });
    });
});

describe("StyleTab: checkout mode", () => {
    it("shows only the branding hint", () => {
        const { container } = setup({ mode: "checkout" });
        expect(screen.getByText(CHECKOUT_HINT)).toBeInTheDocument();
        expect(getGroupLabels(container)).toEqual([]);
    });

    it("renders no form controls and no swatches", () => {
        const { container } = setup({ mode: "checkout" });
        expect(countControls(container)).toBe(0);
        expect(screen.queryByTitle("#22c55e")).not.toBeInTheDocument();
    });

    it("never calls update", () => {
        const { update } = setup({ mode: "checkout" });
        expect(update).not.toHaveBeenCalled();
    });
});

describe("StyleTab: robustness", () => {
    it("ignores extra props passed by WidgetCustomizeForm", () => {
        expect(() => setup({ widgetType: "bundle", previewCondition: "fbt", setPreviewCondition: () => { } })).not.toThrow();
    });

    it("renders with an empty theme object (controls fall back to browser defaults)", () => {
        const { container } = setup({ theme: {} });
        expect(getGroupLabels(container)).toHaveLength(3);
    });

    // Characterization: `theme` is required; the tab reads theme.* directly
    it("throws when no theme is passed", () => {
        const original = console.error;
        console.error = () => { };
        try {
            expect(() => render(<StyleTab mode="storefront" update={() => { }} />)).toThrow();
        } finally {
            console.error = original;
        }
    });
});