import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { LayoutTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/LayoutTab.jsx";
import { baseTheme } from "../../../helpers/theme.js";
import {
    getControl, getGroupLabels, optionValues, optionLabels, countControls,
} from "../../../helpers/formPanel.js";

function setup(props = {}) {
    const update = vi.fn();
    const view = render(<LayoutTab mode="storefront" theme={baseTheme} update={update} {...props} />);
    return { update, ...view };
}

describe("LayoutTab: groups", () => {
    it("shows Button, Image and Show / Hide in storefront mode", () => {
        const { container } = setup();
        expect(getGroupLabels(container)).toEqual(["Button", "Image", "Show / Hide"]);
    });

    it("shows the same three groups in checkout mode", () => {
        const { container } = setup({ mode: "checkout" });
        expect(getGroupLabels(container)).toEqual(["Button", "Image", "Show / Hide"]);
    });

    it("does not call update just by rendering", () => {
        const { update } = setup();
        expect(update).not.toHaveBeenCalled();
    });
});

describe("LayoutTab: button style", () => {
    it("offers Primary (filled) and Secondary (outline) only", () => {
        const { container } = setup();
        const select = getControl(container, "Button", "Style");
        expect(optionValues(select)).toEqual(["filled", "outline"]);
        expect(optionLabels(select)).toEqual(["Primary", "Secondary"]);
    });

    it.each([["outline"], ["filled"]])("shows the theme's current style (%s)", (variant) => {
        const { container } = setup({ theme: { ...baseTheme, buttonVariant: variant } });
        expect(getControl(container, "Button", "Style").value).toBe(variant);
    });

    it("sends the chosen style as a string", async () => {
        const { container, update } = setup();
        await userEvent.selectOptions(getControl(container, "Button", "Style"), "filled");
        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledWith("buttonVariant", "filled");
    });

    it("can switch back from filled to outline", async () => {
        const { container, update } = setup({ theme: { ...baseTheme, buttonVariant: "filled" } });
        await userEvent.selectOptions(getControl(container, "Button", "Style"), "outline");
        expect(update).toHaveBeenCalledWith("buttonVariant", "outline");
    });

    // Characterization: "plain" (Subtle) is commented out of the list, but a saved theme
    // may still contain it. The dropdown then displays the first option, "Primary",
    // while the stored value stays "plain".
    it("displays a saved 'plain' style as Primary", () => {
        const { container } = setup({ theme: { ...baseTheme, buttonVariant: "plain" } });
        expect(getControl(container, "Button", "Style").value).toBe("filled");
    });
});

describe("LayoutTab: storefront-only button controls", () => {
    it("shows a color picker and a radius slider in storefront mode", () => {
        const { container } = setup();
        expect(getControl(container, "Button", "Color (Storefront)")).toHaveAttribute("type", "color");
        expect(getControl(container, "Button", "Radius (Storefront)")).toHaveAttribute("type", "range");
    });

    it("hides them in checkout mode", () => {
        const { container } = setup({ mode: "checkout" });
        expect(getControl(container, "Button", "Color (Storefront)")).toBeNull();
        expect(getControl(container, "Button", "Radius (Storefront)")).toBeNull();
    });

    it("keeps the button style dropdown in checkout mode", () => {
        const { container } = setup({ mode: "checkout" });
        expect(getControl(container, "Button", "Style")).not.toBeNull();
    });

    it("reports a new button color", () => {
        const { container, update } = setup();
        const input = getControl(container, "Button", "Color (Storefront)");
        expect(input.value).toBe("#262626");
        fireEvent.change(input, { target: { value: "#ff0000" } });
        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledWith("buttonColor", "#ff0000");
    });

    it("has a 0 to 20 radius slider in steps of 2", () => {
        const { container } = setup();
        const range = getControl(container, "Button", "Radius (Storefront)");
        expect(range).toHaveAttribute("min", "0");
        expect(range).toHaveAttribute("max", "20");
        expect(range).toHaveAttribute("step", "2");
        expect(range.value).toBe("8");
        expect(screen.getByText("8px")).toBeInTheDocument();
    });

    it.each([["0", 0], ["10", 10], ["20", 20]])("sends the number %s for the radius", (raw, expected) => {
        const { container, update } = setup();
        fireEvent.change(getControl(container, "Button", "Radius (Storefront)"), { target: { value: raw } });
        expect(update).toHaveBeenCalledWith("buttonRadius", expected);
        expect(typeof update.mock.calls[0][1]).toBe("number");
    });

    it("keeps the px label in sync with the theme", () => {
        const { rerender, update } = setup();
        rerender(<LayoutTab mode="storefront" theme={{ ...baseTheme, buttonRadius: 16 }} update={update} />);
        expect(screen.getByText("16px")).toBeInTheDocument();
    });
});

describe("LayoutTab: image", () => {
    it("offers four radius options, including a full circle", () => {
        const { container } = setup();
        const select = getControl(container, "Image", "Radius");
        expect(optionValues(select)).toEqual(["0", "6", "10", "9999"]);
        expect(optionLabels(select)).toEqual(["Sharp", "Soft", "Rounded", "Circle"]);
        expect(select.value).toBe("10");
    });

    it.each([["0", 0], ["6", 6], ["9999", 9999]])("sends the number %s for the image radius", async (value, expected) => {
        const { container, update } = setup();
        await userEvent.selectOptions(getControl(container, "Image", "Radius"), value);
        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledWith("imageRadius", expected);
    });

    it("offers Small, Medium and Large sizes", () => {
        const { container } = setup();
        const select = getControl(container, "Image", "Size");
        expect(optionValues(select)).toEqual(["40", "52", "68"]);
        expect(optionLabels(select)).toEqual(["Small", "Medium", "Large"]);
        expect(select.value).toBe("52");
    });

    it.each([["40", 40], ["68", 68]])("sends the number %s for the image size", async (value, expected) => {
        const { container, update } = setup();
        await userEvent.selectOptions(getControl(container, "Image", "Size"), value);
        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledWith("imageSize", expected);
    });

    it("shows the image controls in checkout mode too", () => {
        const { container } = setup({ mode: "checkout" });
        expect(getControl(container, "Image", "Radius")).not.toBeNull();
        expect(getControl(container, "Image", "Size")).not.toBeNull();
    });

    // Characterization: a size outside the list (for example 60) displays as "Small"
    it("displays an unlisted size as the first option", () => {
        const { container } = setup({ theme: { ...baseTheme, imageSize: 60 } });
        expect(getControl(container, "Image", "Size").value).toBe("40");
    });
});

describe("LayoutTab: show / hide checkboxes", () => {
    const BOXES = [
        ["Price", "showPrice"],
        ["Discount badge", "showBadge"],
        ["Divider lines", "showDivider"],
    ];

    it("has exactly three checkboxes", () => {
        const { container } = setup();
        expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
    });

    it.each(BOXES)("%s reflects a true theme value", (label, key) => {
        const { container } = setup({ theme: { ...baseTheme, [key]: true } });
        expect(getControl(container, "Show / Hide", label)).toBeChecked();
    });

    it.each(BOXES)("%s reflects a false theme value", (label, key) => {
        const { container } = setup({ theme: { ...baseTheme, [key]: false } });
        expect(getControl(container, "Show / Hide", label)).not.toBeChecked();
    });

    it.each(BOXES)("%s sends false when a checked box is clicked", async (label, key) => {
        const { container, update } = setup({ theme: { ...baseTheme, [key]: true } });
        await userEvent.click(getControl(container, "Show / Hide", label));
        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledWith(key, false);
    });

    it.each(BOXES)("%s sends true when an unchecked box is clicked", async (label, key) => {
        const { container, update } = setup({ theme: { ...baseTheme, [key]: false } });
        await userEvent.click(getControl(container, "Show / Hide", label));
        expect(update).toHaveBeenCalledWith(key, true);
    });

    it("changes only the clicked checkbox", async () => {
        const { container, update } = setup();
        await userEvent.click(getControl(container, "Show / Hide", "Discount badge"));
        expect(update).toHaveBeenCalledTimes(1);
        expect(update.mock.calls[0][0]).toBe("showBadge");
    });

    it("treats a missing value as unchecked", () => {
        const { container } = setup({ theme: { ...baseTheme, showPrice: undefined } });
        expect(getControl(container, "Show / Hide", "Price")).not.toBeChecked();
    });

    it("shows the checkboxes in checkout mode too", () => {
        const { container } = setup({ mode: "checkout" });
        expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
    });
});

describe("LayoutTab: control counts and robustness", () => {
    it("has 8 controls in storefront mode and 6 in checkout mode", () => {
        expect(countControls(setup().container)).toBe(8);
        expect(countControls(setup({ mode: "checkout" }).container)).toBe(6);
    });

    it("ignores extra props passed by WidgetCustomizeForm", () => {
        expect(() => setup({ widgetType: "bundle", previewCondition: "fbt" })).not.toThrow();
    });

    it("throws when no theme is passed", () => {
        const original = console.error;
        console.error = () => { };
        try {
            expect(() => render(<LayoutTab mode="storefront" update={() => { }} />)).toThrow();
        } finally {
            console.error = original;
        }
    });
});