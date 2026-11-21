
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
    loaderData: null,
    navigate: vi.fn(),
    submit: vi.fn(),
    modalShow: vi.fn(),
    modalHide: vi.fn(),
}));

vi.mock("react-router", () => ({
    useLoaderData: () => mocks.loaderData,
    useNavigate: () => mocks.navigate,
    useFetcher: () => ({
        submit: mocks.submit,
        state: "idle",
    }),
}));

vi.mock("@shopify/app-bridge-react", () => ({
    useAppBridge: () => ({
        modal: {
            show: mocks.modalShow,
            hide: mocks.modalHide,
        },
    }),
}));

vi.mock("~/shopify.server", () => ({
    authenticate: {
        admin: vi.fn(),
    },
}));

vi.mock("~/plans", async (importOriginal) => {
    const actual = await importOriginal();

    return {
        ...actual,
        canAccessFeature: vi.fn(),
    };
});

import Dashboard from "~/routes/app.dashboard.jsx";

const ACTIVE_BUNDLE = {
    id: "bundle-active-123",
    title: "Starter Kit",
    type: "FIXED",
    status: "ACTIVE",
    components: [{ id: "component-1" }, { id: "component-2" }],
    discountType: "PERCENTAGE",
    discountValue: 10,
};

const ARCHIVED_BUNDLE = {
    id: "bundle-archived-456",
    title: "Summer Collection",
    type: "VOLUME",
    status: "ARCHIVED",
    components: [{ id: "component-3" }],
    discountType: null,
    discountValue: null,
};

function setupDashboard(bundles = [ACTIVE_BUNDLE, ARCHIVED_BUNDLE]) {
    mocks.loaderData = {
        bundles,
        stats: {
            totalBundles: bundles.length,
            activeBundles: bundles.filter((bundle) => bundle.status === "ACTIVE").length,
            totalRevenue: 0,
            totalOrders: 0,
            totalUnitsSold: 0,
            deltas: {
                totalBundles: null,
                activeBundles: null,
            },
        },
        shopCurrency: "USD",
        paidAppPlan: "GROWTH",
        featureAccess: {
            FIXED_BUNDLE: true,
            VOLUME_BUNDLE: true,
            MIX_MATCH: true,
            BYOB: true,
            MULTIVARIANT: true,
        },
    };

    return render(<Dashboard />);
}

// Each bundle card has three action buttons:
// 0 = Edit, 1 = Delete, 2 = Archive or Unarchive.
function getBundleCard(title) {
    const titleElement = screen.getByText(title, { exact: true });
    const card = titleElement.closest("s-box");

    if (!card) {
        throw new Error(`Could not find bundle card for "${title}"`);
    }

    return card;
}

function clickBundleAction(title, actionIndex) {
    const card = getBundleCard(title);
    const buttons = card.querySelectorAll("s-button");

    if (!buttons[actionIndex]) {
        throw new Error(
            `Could not find action button ${actionIndex} for "${title}"`,
        );
    }

    fireEvent.click(buttons[actionIndex]);
}

function getModal(modalId) {
    const modal = document.querySelector(`#${modalId}`);

    if (!modal) {
        throw new Error(`Could not find modal "${modalId}"`);
    }

    return modal;
}

function clickModalButton(modalId, buttonName) {
    const modal = getModal(modalId);

    fireEvent.click(
        within(modal).getByRole("button", { name: buttonName }),
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    setupDashboard();
});

describe("Dashboard Component - Delete Bundle", () => {
    it("should open the delete confirmation modal for the selected bundle", () => {
        clickBundleAction("Starter Kit", 1);

        expect(mocks.modalShow).toHaveBeenCalledOnce();
        expect(mocks.modalShow).toHaveBeenCalledWith("delete-bundle-modal");
    });

    it("should close the delete modal without submitting when cancelled", () => {
        clickBundleAction("Starter Kit", 1);

        clickModalButton("delete-bundle-modal", "Cancel");

        expect(mocks.modalHide).toHaveBeenCalledWith("delete-bundle-modal");
        expect(mocks.submit).not.toHaveBeenCalled();
    });

    it("should submit the correct bundle ID when deletion is confirmed", () => {
        clickBundleAction("Starter Kit", 1);

        clickModalButton("delete-bundle-modal", "Delete bundle");

        expect(mocks.submit).toHaveBeenCalledOnce();
        expect(mocks.submit).toHaveBeenCalledWith(
            {
                intent: "delete",
                bundleId: ACTIVE_BUNDLE.id,
            },
            { method: "POST" },
        );

        expect(mocks.modalHide).toHaveBeenCalledWith("delete-bundle-modal");
    });
});

describe("Dashboard Component - Archive Bundle", () => {
    it("should open the archive confirmation modal for the selected bundle", () => {
        clickBundleAction("Starter Kit", 2);

        expect(mocks.modalShow).toHaveBeenCalledOnce();
        expect(mocks.modalShow).toHaveBeenCalledWith("archive-bundle-modal");
    });

    it("should close the archive modal without submitting when cancelled", () => {
        clickBundleAction("Starter Kit", 2);

        clickModalButton("archive-bundle-modal", "Cancel");

        expect(mocks.modalHide).toHaveBeenCalledWith("archive-bundle-modal");
        expect(mocks.submit).not.toHaveBeenCalled();
    });

    it("should submit the correct bundle ID when archiving is confirmed", () => {
        clickBundleAction("Starter Kit", 2);

        clickModalButton("archive-bundle-modal", "Archive bundle");

        expect(mocks.submit).toHaveBeenCalledOnce();
        expect(mocks.submit).toHaveBeenCalledWith(
            {
                intent: "archive",
                bundleId: ACTIVE_BUNDLE.id,
            },
            { method: "POST" },
        );

        expect(mocks.modalHide).toHaveBeenCalledWith("archive-bundle-modal");

        // The component optimistically updates the bundle status.
        expect(
            within(getBundleCard("Starter Kit")).getByText(/Archived/),
        ).toBeInTheDocument();
    });
});

describe("Dashboard Component - Unarchive Bundle", () => {
    it("should open the unarchive confirmation modal for the selected bundle", () => {
        clickBundleAction("Summer Collection", 2);

        expect(mocks.modalShow).toHaveBeenCalledOnce();
        expect(mocks.modalShow).toHaveBeenCalledWith("unarchive-bundle-modal");
    });

    it("should close the unarchive modal without submitting when cancelled", () => {
        clickBundleAction("Summer Collection", 2);

        clickModalButton("unarchive-bundle-modal", "Cancel");

        expect(mocks.modalHide).toHaveBeenCalledWith("unarchive-bundle-modal");
        expect(mocks.submit).not.toHaveBeenCalled();
    });

    it("should submit the correct bundle ID when unarchiving is confirmed", () => {
        clickBundleAction("Summer Collection", 2);

        clickModalButton("unarchive-bundle-modal", "Unarchive bundle");

        expect(mocks.submit).toHaveBeenCalledOnce();
        expect(mocks.submit).toHaveBeenCalledWith(
            {
                intent: "unarchive",
                bundleId: ARCHIVED_BUNDLE.id,
            },
            { method: "POST" },
        );

        expect(mocks.modalHide).toHaveBeenCalledWith("unarchive-bundle-modal");

        // The component optimistically updates the bundle status.
        expect(
            within(getBundleCard("Summer Collection")).getByText(/Active/),
        ).toBeInTheDocument();
    });
});
