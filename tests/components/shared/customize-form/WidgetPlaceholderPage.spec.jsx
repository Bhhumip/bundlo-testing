import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { WidgetPlaceholderPage } from "~/components/shared/WidgetPlaceholderPage.jsx";

const definition = {
    key: "gift_wrap",
    title: "Gift wrap",
    description: "Let shoppers add gift wrapping.",
    surface: "CART",
};

describe("WidgetPlaceholderPage", () => {
    it("shows the widget title and description", () => {
        render(<WidgetPlaceholderPage definition={definition} />);
        expect(screen.getByText("Gift wrap")).toBeInTheDocument();
        expect(screen.getByText("Let shoppers add gift wrapping.")).toBeInTheDocument();
    });

    it("mentions the widget key and surface", () => {
        render(<WidgetPlaceholderPage definition={definition} />);
        expect(
            screen.getByText("Manage widget settings for gift_wrap on the CART surface.")
        ).toBeInTheDocument();
    });

    it("says 'this' surface when the definition has no surface", () => {
        render(<WidgetPlaceholderPage definition={{ ...definition, surface: undefined }} />);
        expect(
            screen.getByText("Manage widget settings for gift_wrap on the this surface.")
        ).toBeInTheDocument();
    });

    it("shows the default helper text when extraText is not given", () => {
        render(<WidgetPlaceholderPage definition={definition} />);
        expect(
            screen.getByText("Use this placeholder component to add widget-specific fields later.")
        ).toBeInTheDocument();
    });

    it("shows extraText instead of the default helper text", () => {
        render(<WidgetPlaceholderPage definition={definition} extraText="Custom note" />);
        expect(screen.getByText("Custom note")).toBeInTheDocument();
        expect(screen.queryByText(/Use this placeholder component/)).not.toBeInTheDocument();
    });

    it.each([[""], [null], [undefined]])("falls back to the default helper text for extraText %j", (extra) => {
        render(<WidgetPlaceholderPage definition={definition} extraText={extra} />);
        expect(screen.getByText(/Use this placeholder component/)).toBeInTheDocument();
    });

    it("renders two sections: details and settings", () => {
        const { container } = render(<WidgetPlaceholderPage definition={definition} />);
        expect(container.querySelectorAll("s-section")).toHaveLength(2);
        expect(screen.getByText("Widget settings")).toBeInTheDocument();
    });

    // Characterization: `definition.title` is not guarded, unlike `definition?.surface`
    it("throws when no definition is passed", () => {
        vi.spyOn(console, "error").mockImplementation(() => { });
        expect(() => render(<WidgetPlaceholderPage />)).toThrow();
    });
});