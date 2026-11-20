import { MemoryRouter, Routes, Route } from "react-router";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { ToolsSection } from "~/components/bundle-form/ToolsSection.jsx";

function renderTools({ hasAccess }) {
    return render(
        <MemoryRouter initialEntries={["/tools"]}>
            <Routes>
                <Route path="/tools" element={<ToolsSection hasAccess={hasAccess} />} />
                <Route path="/app/billing" element={<p>Billing page</p>} />
            </Routes>
        </MemoryRouter>
    );
}

const TOOLS = [
    ["Website Analyzer", "https://speed.propero.in/analyzer"],
    ["AI Chatbot for Shopify", "https://shopibot.azurewebsites.net/"],
    ["Web To App Converter", "https://speed.propero.in/webapp"],
    ["Shopify Utils", "https://speed.propero.in/utils"],
    ["Shopify Status", "https://speed.propero.in/status"],
    ["Shopify Theme Converter", "https://speed.propero.in/theme-converter"],
    ["CRO Tool", "https://speed.propero.in/cro"],
];

describe("ToolsSection", () => {
    let openSpy;

    beforeEach(() => {
        // Spy on window.open so no real tab opens, and we can inspect calls
        openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    });

    it("renders all 7 tools", () => {
        renderTools({ hasAccess: true });
        for (const [title] of TOOLS) {
            expect(screen.getByText(title)).toBeInTheDocument();
        }
    });

    it("shows no lock message when the shop has access", () => {
        renderTools({ hasAccess: true });
        expect(screen.queryByText("This feature is locked")).not.toBeInTheDocument();
        expect(screen.queryByText("Upgrade to Growth")).not.toBeInTheDocument();
    });

    it("shows the lock message and upgrade button without access", () => {
        renderTools({ hasAccess: false });
        expect(screen.getByText("This feature is locked")).toBeInTheDocument();
        expect(screen.getByText("Upgrade to Growth")).toBeInTheDocument();
    });

    it("navigates to billing when 'Upgrade to Growth' is clicked", async () => {
        renderTools({ hasAccess: false });
        await userEvent.click(screen.getByText("Upgrade to Growth"));
        expect(await screen.findByText("Billing page")).toBeInTheDocument();
    });

    // One generated test per tool: same logic, different data
    it.each(TOOLS)("opens %s in a new tab when the shop has access", async (title, href) => {
        renderTools({ hasAccess: true });
        await userEvent.click(screen.getByText(title));
        expect(openSpy).toHaveBeenCalledWith(href, "_blank");
    });

    it("does NOT open a tool when the shop has no access", () => {
        renderTools({ hasAccess: false });
        // fireEvent bypasses the CSS pointer-events:none that userEvent respects,
        // so this verifies the handler's own `if (hasAccess)` guard
        fireEvent.click(screen.getByText("Website Analyzer"));
        expect(openSpy).not.toHaveBeenCalled();
    });
});