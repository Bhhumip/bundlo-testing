import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { TextTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/TextTab.jsx";
import { baseTheme } from "../../../helpers/theme.js";
import {
    getControl, getGroupLabels, optionValues, optionLabels, countControls,
} from "../../../helpers/formPanel.js";

const CHECKOUT_HINT = "In checkout, text colors and fonts are controlled by your Shopify checkout branding.";
const CSS_HINT = "Applied to the storefront widget wrapper. Does not apply to checkout.";

function setup(props = {}) {
    const update = vi.fn();
    const view = render(<TextTab mode="storefront" theme={baseTheme} update={update} {...props} />);
    return { update, ...view };
}

describe("TextTab: storefront mode", () => {
    it("shows Title, Price and Custom CSS groups in order, and no checkout hint", () => {
        const { container } = setup();
        expect(getGroupLabels(container)).toEqual(["Title", "Price", "Custom CSS"]);
        expect(screen.queryByText(CHECKOUT_HINT)).not.toBeInTheDocument();
    });

    it.each([[undefined], ["storefront"], ["preview"], [""]])(
        "treats mode %j as storefront (only 'checkout' switches layout)",
        (mode) => {
            const { container } = setup({ mode });
            expect(getGroupLabels(container)).toEqual(["Title", "Price", "Custom CSS"]);
        }
    );

    it("does not call update just by rendering", () => {
        const { update } = setup();
        expect(update).not.toHaveBeenCalled();
    });

    describe("title", () => {
        it("shows the title color and reports changes", () => {
            const { container, update } = setup();
            const input = getControl(container, "Title", "Color");
            expect(input).toHaveAttribute("type", "color");
            expect(input.value).toBe("#191919");
            fireEvent.change(input, { target: { value: "#abcdef" } });
            expect(update).toHaveBeenCalledTimes(1);
            expect(update).toHaveBeenCalledWith("titleColor", "#abcdef");
        });

        it("offers Small, Medium and Large title sizes", () => {
            const { container } = setup();
            const select = getControl(container, "Title", "Size");
            expect(optionValues(select)).toEqual(["11", "13", "15"]);
            expect(optionLabels(select)).toEqual(["Small", "Medium", "Large"]);
            expect(select.value).toBe("13");
        });

        it.each([["11", 11], ["15", 15]])("sends the number %s for the size", async (value, expected) => {
            const { container, update } = setup();
            await userEvent.selectOptions(getControl(container, "Title", "Size"), value);
            expect(update).toHaveBeenCalledTimes(1);
            expect(update).toHaveBeenCalledWith("titleSize", expected);
            expect(typeof update.mock.calls[0][1]).toBe("number");
        });

        // Characterization: testimonials themes store titleSize as a token ("base"), which
        // is not one of these options, so the dropdown displays the first option, "Small".
        it("displays a token size such as 'base' as Small", () => {
            const { container } = setup({ theme: { ...baseTheme, titleSize: "base" } });
            expect(getControl(container, "Title", "Size").value).toBe("11");
        });
    });

    describe("price", () => {
        it("shows the price color and reports changes", () => {
            const { container, update } = setup();
            const input = getControl(container, "Price", "Color");
            expect(input).toHaveAttribute("type", "color");
            expect(input.value).toBe("#6b7280");
            fireEvent.change(input, { target: { value: "#00ff00" } });
            expect(update).toHaveBeenCalledTimes(1);
            expect(update).toHaveBeenCalledWith("priceColor", "#00ff00");
        });

        it("changes the price color without touching the title color", () => {
            const { container, update } = setup();
            fireEvent.change(getControl(container, "Price", "Color"), { target: { value: "#00ff00" } });
            expect(update).not.toHaveBeenCalledWith("titleColor", expect.anything());
        });
    });

    describe("custom CSS", () => {
        const getBox = (container) => container.querySelector("textarea");

        it("shows a 5-row textarea with an example placeholder and a scope hint", () => {
            const { container } = setup();
            const box = getBox(container);
            expect(box).toHaveAttribute("rows", "5");
            expect(box).toHaveAttribute("placeholder", ".widget-title { font-family: serif; }");
            expect(screen.getByText(CSS_HINT)).toBeInTheDocument();
        });

        it("shows the saved CSS", () => {
            const css = ".title { color: red; }";
            const { container } = setup({ theme: { ...baseTheme, customCss: css } });
            expect(getBox(container).value).toBe(css);
        });

        it("sends what the merchant types", () => {
            const { container, update } = setup();
            fireEvent.change(getBox(container), { target: { value: ".a { color: blue; }" } });
            expect(update).toHaveBeenCalledTimes(1);
            expect(update).toHaveBeenCalledWith("customCss", ".a { color: blue; }");
        });

        it("keeps multi-line CSS intact", () => {
            const { container, update } = setup();
            const css = ".a {\n  color: blue;\n}\n.b {\n  margin: 0;\n}";
            fireEvent.change(getBox(container), { target: { value: css } });
            expect(update).toHaveBeenCalledWith("customCss", css);
        });

        it("sends an empty string when the box is cleared", () => {
            const { container, update } = setup({ theme: { ...baseTheme, customCss: ".x{}" } });
            fireEvent.change(getBox(container), { target: { value: "" } });
            expect(update).toHaveBeenCalledWith("customCss", "");
        });

        it("sends the CSS exactly as typed, without cleaning it up", () => {
            const { container, update } = setup();
            const raw = "  </style><script>alert(1)</script>  ";
            fireEvent.change(getBox(container), { target: { value: raw } });
            expect(update).toHaveBeenCalledWith("customCss", raw);
        });

        it("does not crash when customCss is missing from the theme", () => {
            const { customCss, ...themeWithoutCss } = baseTheme;
            expect(() => setup({ theme: themeWithoutCss })).not.toThrow();
        });

        it("has one update call per keystroke", async () => {
            const { container, update } = setup();
            await userEvent.type(getBox(container), "ab");
            expect(update).toHaveBeenCalledTimes(2);
        });
    });

    it("has 4 controls: title color, title size, price color and the CSS textarea", () => {
        expect(countControls(setup().container)).toBe(4);
    });
});

describe("TextTab: checkout mode", () => {
    it("shows only the Title group and the branding hint", () => {
        const { container } = setup({ mode: "checkout" });
        expect(getGroupLabels(container)).toEqual(["Title"]);
        expect(screen.getByText(CHECKOUT_HINT)).toBeInTheDocument();
    });

    it("has a single control: the title size", () => {
        const { container } = setup({ mode: "checkout" });
        expect(countControls(container)).toBe(1);
        expect(getControl(container, "Title", "Title size")).not.toBeNull();
    });

    it("hides colors, price and custom CSS", () => {
        const { container } = setup({ mode: "checkout" });
        expect(container.querySelector('input[type="color"]')).toBeNull();
        expect(container.querySelector("textarea")).toBeNull();
        expect(screen.queryByText(CSS_HINT)).not.toBeInTheDocument();
    });

    it("offers Small, Medium and Large and shows the current size", () => {
        const { container } = setup({ mode: "checkout" });
        const select = getControl(container, "Title", "Title size");
        expect(optionValues(select)).toEqual(["11", "13", "15"]);
        expect(optionLabels(select)).toEqual(["Small", "Medium", "Large"]);
        expect(select.value).toBe("13");
    });

    it.each([["11", 11], ["15", 15]])("sends the number %s for the size", async (value, expected) => {
        const { container, update } = setup({ mode: "checkout" });
        await userEvent.selectOptions(getControl(container, "Title", "Title size"), value);
        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledWith("titleSize", expected);
    });
});

describe("TextTab: robustness", () => {
    it("ignores extra props passed by WidgetCustomizeForm", () => {
        expect(() => setup({ widgetType: "bundle", previewCondition: "fbt" })).not.toThrow();
    });

    it.each([["storefront"], ["checkout"]])("throws in %s mode when no theme is passed", (mode) => {
        const original = console.error;
        console.error = () => { };
        try {
            expect(() => render(<TextTab mode={mode} update={() => { }} />)).toThrow();
        } finally {
            console.error = original;
        }
    });
});