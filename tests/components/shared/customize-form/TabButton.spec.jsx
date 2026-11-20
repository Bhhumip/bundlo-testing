import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { TabButton } from "~/components/shared/CustomizeFormWidgets/subcomponents/TabButton.jsx";

describe("TabButton", () => {
    it("renders its label as a button", () => {
        render(<TabButton label="Style" active={false} onClick={() => { }} />);
        expect(screen.getByRole("button", { name: "Style" })).toBeInTheDocument();
    });

    it("calls onClick once per click", async () => {
        const onClick = vi.fn();
        render(<TabButton label="Layout" active={false} onClick={onClick} />);
        await userEvent.click(screen.getByRole("button", { name: "Layout" }));
        expect(onClick).toHaveBeenCalledTimes(1);
        await userEvent.click(screen.getByRole("button", { name: "Layout" }));
        expect(onClick).toHaveBeenCalledTimes(2);
    });

    it("does not throw when clicked without an onClick handler", async () => {
        render(<TabButton label="Text" active={false} />);
        await expect(userEvent.click(screen.getByRole("button", { name: "Text" }))).resolves.not.toThrow();
    });

    it("is bold and underlined when active", () => {
        render(<TabButton label="Style" active onClick={() => { }} />);
        const btn = screen.getByRole("button", { name: "Style" });
        expect(btn).toHaveStyle({ fontWeight: "600", borderBottom: "2px solid #111827", background: "#ffffff" });
        expect(btn.getAttribute("style")).not.toContain("transparent");
    });

    it("is regular weight with a transparent underline when inactive", () => {
        render(<TabButton label="Style" active={false} onClick={() => { }} />);
        const btn = screen.getByRole("button", { name: "Style" });
        expect(btn).toHaveStyle({ fontWeight: "400" });
        // jsdom cannot compute a "transparent" border for toHaveStyle, so read the inline style
        expect(btn.getAttribute("style")).toContain("transparent");
    });

    it("treats a missing active prop as inactive", () => {
        render(<TabButton label="Position" onClick={() => { }} />);
        expect(screen.getByRole("button", { name: "Position" })).toHaveStyle({ fontWeight: "400" });
    });

    it("switches its look when active changes", () => {
        const { rerender } = render(<TabButton label="Style" active={false} onClick={() => { }} />);
        rerender(<TabButton label="Style" active onClick={() => { }} />);
        expect(screen.getByRole("button", { name: "Style" })).toHaveStyle({ fontWeight: "600" });
    });
});