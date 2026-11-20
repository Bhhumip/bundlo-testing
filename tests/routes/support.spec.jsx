import { createRoutesStub } from "react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("~/shopify.server", () => ({ authenticate: { admin: vi.fn() } }));
vi.mock("~/featureAccess.server", () => ({ canShopAccessFeature: vi.fn() }));

import { authenticate } from "~/shopify.server";
import { canShopAccessFeature } from "~/featureAccess.server";
import Support, { loader } from "~/routes/app.support.jsx";

// Fake the plan: which support features does the shop have?
function mockPlan({ basic, priority }) {
    authenticate.admin.mockResolvedValue({ session: { shop: "test.myshopify.com" } });
    canShopAccessFeature.mockImplementation(async (_shop, feature) =>
        feature === "BASIC_SUPPORT" ? basic : priority
    );
}

// Render the page inside a fake router, with stub pages for navigation targets
async function renderSupport({ basic, priority }) {
    mockPlan({ basic, priority });
    const Stub = createRoutesStub([
        { path: "/", Component: Support, HydrateFallback: () => null, loader: () => ({ hasBasicSupport: basic, hasPrioritySupport: priority }) },
        { path: "/app/feedback", Component: () => <p>Feedback page</p> },
        { path: "/app/billing", Component: () => <p>Billing page</p> },
    ]);
    render(<Stub initialEntries={["/"]} />);
    // Wait for the loader to finish and the page to appear
    await screen.findByText("Shopify Sidekick");
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("Support route loader", () => {
    it("returns both access flags for the shop", async () => {
        mockPlan({ basic: true, priority: false });
        const result = await loader({ request: new Request("http://localhost/app/support") });
        expect(result).toEqual({ hasBasicSupport: true, hasPrioritySupport: false });
    });

    it("checks the correct features for the authenticated shop", async () => {
        mockPlan({ basic: true, priority: true });
        await loader({ request: new Request("http://localhost/app/support") });
        expect(canShopAccessFeature).toHaveBeenCalledWith("test.myshopify.com", "BASIC_SUPPORT");
        expect(canShopAccessFeature).toHaveBeenCalledWith("test.myshopify.com", "PRIORITY_SUPPORT");
    });
});

describe("Support page", () => {
    it("shows no locked messages when the shop has full access", async () => {
        await renderSupport({ basic: true, priority: true });
        expect(screen.queryByText("This feature is locked")).not.toBeInTheDocument();
    });

    it("locks both sections when the shop has no access", async () => {
        await renderSupport({ basic: false, priority: false });
        expect(screen.getAllByText("This feature is locked")).toHaveLength(2);
        expect(screen.getByText("Upgrade to Starter")).toBeInTheDocument();
        expect(screen.getByText("Upgrade to Growth")).toBeInTheDocument();
    });

    it("locks only the tools section with basic support", async () => {
        await renderSupport({ basic: true, priority: false });
        expect(screen.getAllByText("This feature is locked")).toHaveLength(1);
        expect(screen.getByText(/Explore Our Tools is available on the Growth plan/)).toBeInTheDocument();
    });

    it("navigates to the feedback page from 'Send request'", async () => {
        await renderSupport({ basic: true, priority: true });
        await userEvent.click(screen.getByText("Send request"));
        expect(await screen.findByText("Feedback page")).toBeInTheDocument();
    });

    it("navigates to billing from the upgrade button", async () => {
        await renderSupport({ basic: false, priority: true });
        await userEvent.click(screen.getByText("Upgrade to Starter"));
        expect(await screen.findByText("Billing page")).toBeInTheDocument();
    });

    it("expands an FAQ answer when its question is clicked", async () => {
        await renderSupport({ basic: true, priority: true });
        const answer = /There is no cost associated with the tools/;
        expect(screen.queryByText(answer)).not.toBeInTheDocument();
        await userEvent.click(screen.getByText("Is there a cost associated with these tools?"));
        expect(await screen.findByText(answer)).toBeInTheDocument();
    });
});