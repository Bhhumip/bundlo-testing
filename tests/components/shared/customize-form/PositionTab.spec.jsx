import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { PositionTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/PositionTab.jsx";
import { baseTheme } from "../../../helpers/theme.js";
import {
    getControl, getGroupLabels, optionValues, optionLabels, countControls,
} from "../../../helpers/formPanel.js";

const CHECKOUT_HINT =
    "In checkout, widget placement is controlled by the Shopify checkout editor. These controls adjust the internal layout of this widget only.";

function setup(props = {}) {
    const update = vi.fn();
    const view = render(<PositionTab mode="storefront" theme={baseTheme} update={update} {...props} />);
    return { update, ...view };
}

// [group, field, theme key, options as [value, label], sends a number?]
const SELECTS = [
    ["Product Layout", "Direction", "layoutDirection",
        [["vertical", "Vertical (stacked)"], ["horizontal", "Horizontal (row)"], ["grid", "Grid"]], false],
    ["Product Layout", "Items per row", "itemsPerRow",
        [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]], true],
    ["Spacing & sizing", "Gap spacing", "gap",
        [["tight", "Tight"], ["normal", "Normal"], ["loose", "Loose"]], false],
    ["Spacing & sizing", "Image ratio", "imageRatio",
        [["1:1", "1:1 Square"], ["4:5", "4:5 Vertical"], ["16:9", "16:9 Wide"]], false],
    ["Outer Alignment (Widget)", "Widget align", "alignment",
        [["left", "Left"], ["center", "Center"], ["right", "Right"]], false],
    ["Outer Alignment (Widget)", "Max width", "widgetMaxWidth",
        [["100%", "Full width"], ["420px", "Compact (420px)"], ["320px", "Narrow (320px)"]], false],
    ["Inner Alignment (Cards)", "Card alignment", "cardAlignment",
        [["top", "Top (Compact)"], ["stretch", "Stretch (Equal Height)"]], false],
    ["Inner Alignment (Cards)", "Card text align", "textAlignment",
        [["left", "Left"], ["center", "Center"], ["right", "Right"]], false],
];

describe("PositionTab: groups", () => {
    it("shows four groups in order", () => {
        const { container } = setup();
        expect(getGroupLabels(container)).toEqual([
            "Product Layout",
            "Spacing & sizing",
            "Outer Alignment (Widget)",
            "Inner Alignment (Cards)",
        ]);
    });

    it("shows the same four groups in checkout mode", () => {
        const { container } = setup({ mode: "checkout" });
        expect(getGroupLabels(container)).toHaveLength(4);
    });

    it("has 9 controls: 8 dropdowns and 1 slider", () => {
        const { container } = setup();
        expect(countControls(container)).toBe(9);
        expect(container.querySelectorAll("select")).toHaveLength(8);
        expect(container.querySelectorAll('input[type="range"]')).toHaveLength(1);
    });

    it("does not call update just by rendering", () => {
        const { update } = setup();
        expect(update).not.toHaveBeenCalled();
    });
});

describe.each(SELECTS)("PositionTab: %s / %s", (group, field, key, options, numeric) => {
    it("lists the expected options in order", () => {
        const { container } = setup();
        const select = getControl(container, group, field);
        expect(optionValues(select)).toEqual(options.map(([value]) => value));
        expect(optionLabels(select)).toEqual(options.map(([, label]) => label));
    });

    it("shows the current theme value", () => {
        const { container } = setup();
        expect(getControl(container, group, field).value).toBe(String(baseTheme[key]));
    });

    it.each(options.map(([value]) => [value]))("sends the right value when %s is chosen", async (value) => {
        // start from a theme whose value differs from the option being chosen
        const other = options.find(([v]) => v !== value)[0];
        const startTheme = { ...baseTheme, [key]: numeric ? Number(other) : other };
        const { container, update } = setup({ theme: startTheme });

        await userEvent.selectOptions(getControl(container, group, field), value);

        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledWith(key, numeric ? Number(value) : value);
        if (numeric) expect(typeof update.mock.calls[0][1]).toBe("number");
    });
});

describe("PositionTab: items per row edge cases", () => {
    it("shows a numeric string such as '3' as the selected option", () => {
        const { container } = setup({ theme: { ...baseTheme, itemsPerRow: "3" } });
        expect(getControl(container, "Product Layout", "Items per row").value).toBe("3");
    });

    // Characterization: a missing value becomes NaN, matches no option, and the
    // dropdown displays the first option, "1".
    it("displays a missing value as 1 without crashing (React logs a NaN warning)", () => {
        const warn = vi.spyOn(console, "error").mockImplementation(() => { });
        const { container } = setup({ theme: { ...baseTheme, itemsPerRow: undefined } });
        expect(getControl(container, "Product Layout", "Items per row").value).toBe("1");
        expect(warn.mock.calls.flat().join(" ")).toContain("Received NaN");
    });
});

describe("PositionTab: inner padding slider", () => {
    const getSlider = (container) => getControl(container, "Spacing & sizing", "Inner padding");

    it("is a 4 to 32 range in steps of 2", () => {
        const { container } = setup();
        const slider = getSlider(container);
        expect(slider).toHaveAttribute("type", "range");
        expect(slider).toHaveAttribute("min", "4");
        expect(slider).toHaveAttribute("max", "32");
        expect(slider).toHaveAttribute("step", "2");
    });

    it("shows the current padding with a px label", () => {
        const { container } = setup();
        expect(getSlider(container).value).toBe("12");
        expect(screen.getByText("12px")).toBeInTheDocument();
    });

    it.each([["4", 4], ["20", 20], ["32", 32]])("sends the number %s", (raw, expected) => {
        const { container, update } = setup();
        fireEvent.change(getSlider(container), { target: { value: raw } });
        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledWith("padding", expected);
        expect(typeof update.mock.calls[0][1]).toBe("number");
    });

    it("keeps the label in sync with the theme", () => {
        const { rerender, update } = setup();
        rerender(<PositionTab mode="storefront" theme={{ ...baseTheme, padding: 24 }} update={update} />);
        expect(screen.getByText("24px")).toBeInTheDocument();
    });

    // Characterization: testimonials themes store padding as a token ("base"). The label
    // would then read "basepx" (the slider itself falls back to its minimum).
    it("shows a token padding such as 'base' as 'basepx'", () => {
        setup({ theme: { ...baseTheme, padding: "base" } });
        expect(screen.getByText("basepx")).toBeInTheDocument();
    });
});

describe("PositionTab: checkout hint", () => {
    it("is shown only in checkout mode", () => {
        setup({ mode: "checkout" });
        expect(screen.getByText(CHECKOUT_HINT)).toBeInTheDocument();
    });

    it.each([[undefined], ["storefront"], ["preview"]])("is hidden for mode %j", (mode) => {
        setup({ mode });
        expect(screen.queryByText(CHECKOUT_HINT)).not.toBeInTheDocument();
    });
});

describe("PositionTab: disabled features stay hidden", () => {
    it("has no mobile layout group", () => {
        const { container } = setup();
        expect(getGroupLabels(container)).not.toContain("Mobile");
        expect(screen.queryByText("Layout on mobile")).not.toBeInTheDocument();
    });

    it("has no scroll arrows option, even for a horizontal layout", () => {
        const { container } = setup({ theme: { ...baseTheme, layoutDirection: "horizontal" } });
        expect(getGroupLabels(container)).not.toContain("Horizontal scroll");
        expect(screen.queryByText("Show arrows")).not.toBeInTheDocument();
        expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    });
});

describe("PositionTab: robustness", () => {
    it("ignores extra props passed by WidgetCustomizeForm", () => {
        expect(() => setup({ widgetType: "fbt", previewCondition: "fbt" })).not.toThrow();
    });

    it.each([["storefront"], ["checkout"]])("throws in %s mode when no theme is passed", (mode) => {
        const original = console.error;
        console.error = () => { };
        try {
            expect(() => render(<PositionTab mode={mode} update={() => { }} />)).toThrow();
        } finally {
            console.error = original;
        }
    });
});