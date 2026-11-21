import { MemoryRouter, Routes, Route } from "react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";

import { BackArrow, ForwardArrow } from "~/components/NavArrows.jsx";

// Two history entries: "/first" then "/second" (we start on "/second")
function renderOnSecondPage(Arrow, { startIndex = 1 } = {}) {
    return render(
        <MemoryRouter initialEntries={["/first", "/second"]} initialIndex={startIndex}>
            <Routes>
                <Route path="/first" element={<><p>First page</p><Arrow /></>} />
                <Route path="/second" element={<><p>Second page</p><Arrow /></>} />
            </Routes>
        </MemoryRouter>
    );
}

describe("BackArrow", () => {
    it("renders a Back button with a left arrow icon", () => {
        const { container } = renderOnSecondPage(BackArrow);
        const button = container.querySelector("s-button");
        expect(button).toHaveTextContent("Back");
        expect(button).toHaveAttribute("icon", "arrow-left");
        expect(button).toHaveAttribute("variant", "tertiary");
    });

    it("goes back one page in the history", async () => {
        renderOnSecondPage(BackArrow);
        expect(screen.getByText("Second page")).toBeInTheDocument();
        await userEvent.click(screen.getByText("Back"));
        expect(await screen.findByText("First page")).toBeInTheDocument();
    });

    it("stays on the page when there is nothing to go back to", async () => {
        renderOnSecondPage(BackArrow, { startIndex: 0 });
        await userEvent.click(screen.getByText("Back"));
        expect(screen.getByText("First page")).toBeInTheDocument();
    });

    it("needs a router", () => {
        const original = console.error;
        console.error = () => { };
        try {
            expect(() => render(<BackArrow />)).toThrow();
        } finally {
            console.error = original;
        }
    });
});

describe("ForwardArrow", () => {
    // Characterization: ForwardArrow is a copy of BackArrow. It is labelled "Back"
    // and goes back (navigate(-1)), not forward. Documenting current behaviour.
    it("is currently labelled 'Back' and goes back, like BackArrow", async () => {
        renderOnSecondPage(ForwardArrow);
        expect(screen.getByText("Back")).toBeInTheDocument();
        await userEvent.click(screen.getByText("Back"));
        expect(await screen.findByText("First page")).toBeInTheDocument();
    });
});