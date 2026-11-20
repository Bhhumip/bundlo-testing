import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import {
    Field,
    Group,
    ColorSwatch,
} from "~/components/shared/CustomizeFormWidgets/subcomponents/FormControls.jsx";

describe("Field", () => {
    it("renders its label and its children", () => {
        render(
            <Field label="Border radius">
                <select aria-label="radius select" />
            </Field>
        );
        expect(screen.getByText("Border radius")).toBeInTheDocument();
        expect(screen.getByLabelText("radius select")).toBeInTheDocument();
    });

    it("renders the label with no children", () => {
        render(<Field label="Only a label" />);
        expect(screen.getByText("Only a label")).toBeInTheDocument();
    });

    it("renders several children in order", () => {
        const { container } = render(
            <Field label="Pair">
                <button>first</button>
                <button>second</button>
            </Field>
        );
        const buttons = container.querySelectorAll("button");
        expect([...buttons].map((b) => b.textContent)).toEqual(["first", "second"]);
    });
});

describe("Group", () => {
    it("renders its label and its children", () => {
        render(
            <Group label="Spacing">
                <p>inside the group</p>
            </Group>
        );
        expect(screen.getByText("Spacing")).toBeInTheDocument();
        expect(screen.getByText("inside the group")).toBeInTheDocument();
    });

    it("puts the label before the children", () => {
        const { container } = render(
            <Group label="Title">
                <p>child</p>
            </Group>
        );
        const wrapper = container.firstChild;
        expect(wrapper.firstChild).toHaveTextContent("Title");
        expect(wrapper.lastChild).toHaveTextContent("child");
    });
});

// jsdom cannot compute a border shorthand containing "transparent", so jest-dom's
// toHaveStyle gives false failures. Compare the inline style string instead, letting
// the browser engine normalise the expected value the same way it normalised the real one.
const SELECTED_BORDER = (() => {
    const el = document.createElement("div");
    el.style.border = "2px solid #111827";
    return el.style.border;
})();
const UNSELECTED_BORDER = (() => {
    const el = document.createElement("div");
    el.style.border = "2px solid transparent";
    return el.style.border;
})();

describe("ColorSwatch", () => {
    const colors = ["#ff0000", "#00ff00", "#0000ff"];

    it("renders one swatch per color, identified by its title", () => {
        render(<ColorSwatch colors={colors} value="#ff0000" onChange={() => { }} />);
        for (const c of colors) {
            expect(screen.getByTitle(c)).toBeInTheDocument();
        }
    });

    it("renders nothing when the color list is empty", () => {
        const { container } = render(<ColorSwatch colors={[]} value="" onChange={() => { }} />);
        expect(container.firstChild).toBeEmptyDOMElement();
    });

    it("calls onChange with the clicked color", async () => {
        const onChange = vi.fn();
        render(<ColorSwatch colors={colors} value="#ff0000" onChange={onChange} />);
        await userEvent.click(screen.getByTitle("#00ff00"));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith("#00ff00");
    });

    it("still calls onChange when the already-selected color is clicked", async () => {
        const onChange = vi.fn();
        render(<ColorSwatch colors={colors} value="#ff0000" onChange={onChange} />);
        await userEvent.click(screen.getByTitle("#ff0000"));
        expect(onChange).toHaveBeenCalledWith("#ff0000");
    });

    it("paints each swatch with its own color", () => {
        render(<ColorSwatch colors={colors} value="" onChange={() => { }} />);
        expect(screen.getByTitle("#00ff00")).toHaveStyle({ background: "#00ff00" });
    });

    it("marks only the selected swatch with a dark border", () => {
        render(<ColorSwatch colors={colors} value="#00ff00" onChange={() => { }} />);
        expect(screen.getByTitle("#00ff00").style.border).toBe(SELECTED_BORDER);
        expect(screen.getByTitle("#ff0000").style.border).toBe(UNSELECTED_BORDER);
        expect(screen.getByTitle("#0000ff").style.border).toBe(UNSELECTED_BORDER);
    });

    it("marks no swatch as selected when value matches none of the colors", () => {
        render(<ColorSwatch colors={colors} value="#abcdef" onChange={() => { }} />);
        for (const c of colors) {
            expect(screen.getByTitle(c).style.border).toBe(UNSELECTED_BORDER);
        }
    });

    it("compares colors exactly, so a different letter case is not selected", () => {
        render(<ColorSwatch colors={["#FF0000"]} value="#ff0000" onChange={() => { }} />);
        expect(screen.getByTitle("#FF0000").style.border).toBe(UNSELECTED_BORDER);
    });

    it("updates the selected swatch when value changes", () => {
        const { rerender } = render(<ColorSwatch colors={colors} value="#ff0000" onChange={() => { }} />);
        rerender(<ColorSwatch colors={colors} value="#0000ff" onChange={() => { }} />);
        expect(screen.getByTitle("#0000ff").style.border).toBe(SELECTED_BORDER);
        expect(screen.getByTitle("#ff0000").style.border).toBe(UNSELECTED_BORDER);
    });
});