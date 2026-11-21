
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
    loaderData: null,
    navigate: vi.fn(),
    submit: vi.fn(),
    modalShow: vi.fn(),
    modalHide: vi.fn(),
}));


vi.mock("../../../app/shopify.server", () => ({
    authenticate: {
        admin: vi.fn(),
    },
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

vi.mock("~/plans", async (importOriginal) => {
    const actual = await importOriginal();

    return {
        ...actual,

        canAccessFeature: vi.fn(),

        FEATURE_MIN_PLAN: {
            ...actual.FEATURE_MIN_PLAN,
            FIXED_BUNDLE: "Basic",
            VOLUME_BUNDLE: "Growth",
            MIX_MATCH: "Growth",
            BYOB: "Pro",
            MULTIVARIANT: "Pro",
        },
    };
});

import Dashboard from "~/routes/app.dashboard.jsx";

// --------------------------------------------------
// TEST DATA
// --------------------------------------------------

const createDashboardData = (overrides = {}) => ({
    bundles: [
        {
            id: "bundle-101",
            title: "Starter Kit",
            type: "FIXED",
            status: "ACTIVE",
            components: [
                { id: "product-1" },
                { id: "product-2" },
            ],
            discountType: "PERCENTAGE",
            discountValue: 10,
        },
        {
            id: "bundle-102",
            title: "Archived Bundle",
            type: "VOLUME",
            status: "ARCHIVED",
            components: [{ id: "product-3" }],
            discountType: "PERCENTAGE",
            discountValue: 15,
        },
    ],

    stats: {
        totalBundles: 10,
        activeBundles: 6,
        totalRevenue: 1250.5,
        totalOrders: 25,
        totalUnitsSold: 40,
        deltas: {
            totalBundles: 10,
            activeBundles: -5,
        },
    },

    shopCurrency: "USD",
    paidAppPlan: "Growth plan",

    featureAccess: {
        FIXED_BUNDLE: true,
        VOLUME_BUNDLE: true,
        MIX_MATCH: true,
        BYOB: true,
        MULTIVARIANT: true,
    },

    ...overrides,
});

// --------------------------------------------------
// SETUP
// --------------------------------------------------

beforeEach(() => {
    vi.clearAllMocks();

    mocks.loaderData = createDashboardData();
});

// ==================================================
// DASHBOARD RENDERING
// ==================================================

describe("Dashboard Component - Rendering", () => {
    it("should render the dashboard page", () => {
        const { container } = render(<Dashboard />);

        expect(container.querySelector("s-page"))
            .toHaveAttribute("heading", "Dashboard");
    });

    it("should render the Create a bundle section", () => {
        const { container } = render(<Dashboard />);

        expect(
            container.querySelector(
                's-section[heading="Create a bundle"]'
            )
        ).toBeInTheDocument();
    });

    it("should display all five bundle types", () => {
        render(<Dashboard />);

        const expectedBundleTypes = [
            "Fixed bundle",
            "Mix & match",
            "Volume Bundle",
            "Build a box",
            "Multivariant bundle",
        ];

        expectedBundleTypes.forEach((bundleType) => {
            expect(
                screen.getByAltText(bundleType)
            ).toBeInTheDocument();
        });
    });

    it("should display the correct create button for every bundle type", () => {
        render(<Dashboard />);

        expect(screen.getByText("Create fixed bundle"))
            .toBeInTheDocument();

        expect(screen.getByText("Create mix & match"))
            .toBeInTheDocument();

        expect(screen.getByText("Create volume bundle"))
            .toBeInTheDocument();

        expect(screen.getByText("Create build a box"))
            .toBeInTheDocument();

        expect(screen.getByText("Create multivariant bundle"))
            .toBeInTheDocument();
    });

    it("should render the Stats Overview section", () => {
        const { container } = render(<Dashboard />);

        expect(
            container.querySelector(
                's-section[heading="Stats Overview"]'
            )
        ).toBeInTheDocument();
    });

    it("should render the About bundle types section", () => {
        const { container } = render(<Dashboard />);

        expect(
            container.querySelector(
                's-section[heading="About bundle types"]'
            )
        ).toBeInTheDocument();
    });
});

// ==================================================
// BUNDLE TYPE NAVIGATION
// ==================================================

describe("Dashboard Component - Bundle Navigation", () => {
    it.each([
        ["Create fixed bundle", "/app/bundles/new"],
        ["Create mix & match", "/app/bundles/new/mix-match"],
        ["Create volume bundle", "/app/bundles/new/volume"],
        ["Create build a box", "/app/byob/new"],
        ["Create multivariant bundle", "/app/bundles/multivariant"],
    ])(
        "should navigate to the correct route when clicking %s",
        (buttonText, expectedRoute) => {
            render(<Dashboard />);

            fireEvent.click(screen.getByText(buttonText));

            expect(mocks.navigate).toHaveBeenCalledWith(
                expectedRoute
            );
        }
    );

    it("should navigate to Billing when a feature is unavailable", () => {
        mocks.loaderData = createDashboardData({
            featureAccess: {
                FIXED_BUNDLE: true,
                VOLUME_BUNDLE: false,
                MIX_MATCH: true,
                BYOB: true,
                MULTIVARIANT: true,
            },
        });

        render(<Dashboard />);

        expect(
            screen.getByText("Upgrade to Growth")
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByText("Upgrade to Growth")
        );

        expect(mocks.navigate).toHaveBeenCalledWith(
            "/app/billing"
        );
    });

    it("should not navigate to Billing for an available feature", () => {
        render(<Dashboard />);

        fireEvent.click(
            screen.getByText("Create fixed bundle")
        );

        expect(mocks.navigate).not.toHaveBeenCalledWith(
            "/app/billing"
        );
    });

    it("should stop event propagation when clicking a create button", () => {
        render(<Dashboard />);

        const button = screen.getByText("Create fixed bundle");

        const event = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
        });

        const stopPropagation = vi.spyOn(
            event,
            "stopPropagation"
        );

        button.dispatchEvent(event);

        expect(stopPropagation).toHaveBeenCalled();
    });
});

// ==================================================
// DASHBOARD STATISTICS
// ==================================================

describe("Dashboard Component - Statistics", () => {
    it("should display the total bundle count", () => {
        render(<Dashboard />);

        expect(screen.getByText("10")).toBeInTheDocument();
        expect(screen.getByText("Total bundles")).toBeInTheDocument();
    });

    it("should display the active bundle count", () => {
        render(<Dashboard />);

        expect(screen.getByText("Active bundles"))
            .toBeInTheDocument();

        expect(screen.getByText("6")).toBeInTheDocument();
    });

    it("should display revenue in the shop currency", () => {
        render(<Dashboard />);

        expect(screen.getByText("$1,250.50"))
            .toBeInTheDocument();
    });

    it("should display the total units sold", () => {
        render(<Dashboard />);

        expect(screen.getByText("Units sold"))
            .toBeInTheDocument();

        expect(screen.getByText("40"))
            .toBeInTheDocument();
    });

    it("should display a positive percentage indicator", () => {
        render(<Dashboard />);

        expect(screen.getByText("10%"))
            .toBeInTheDocument();
    });

    it("should display a negative percentage indicator", () => {
        render(<Dashboard />);

        expect(screen.getByText("5%"))
            .toBeInTheDocument();
    });

    it("should not display a percentage badge when delta is null", () => {
        mocks.loaderData = createDashboardData({
            stats: {
                ...createDashboardData().stats,
                deltas: {
                    totalBundles: null,
                    activeBundles: null,
                },
            },
        });

        render(<Dashboard />);

        expect(screen.queryByText("10%"))
            .not.toBeInTheDocument();

        expect(screen.queryByText("5%"))
            .not.toBeInTheDocument();
    });

    it("should display zero revenue correctly", () => {
        mocks.loaderData = createDashboardData({
            stats: {
                ...createDashboardData().stats,
                totalRevenue: 0,
            },
        });

        render(<Dashboard />);

        expect(screen.getByText("$0.00"))
            .toBeInTheDocument();
    });
});

// ==================================================
// RECENT BUNDLES
// ==================================================

describe("Dashboard Component - Recent Bundles", () => {
    it("should render the Recent active bundles section", () => {
        const { container } = render(<Dashboard />);

        expect(
            container.querySelector(
                's-section[heading="Recent active bundles"]'
            )
        ).toBeInTheDocument();
    });

    it("should display recent bundle titles", () => {
        render(<Dashboard />);

        expect(screen.getByText("Starter Kit"))
            .toBeInTheDocument();

        expect(screen.getByText("Archived Bundle"))
            .toBeInTheDocument();
    });

    it("should display the correct bundle status", () => {
        render(<Dashboard />);


        const archivedBundles = screen.getAllByText(/Archived/);

        expect(archivedBundles.length).toBeGreaterThan(0);
    });

    it("should display the number of products in a bundle", () => {
        render(<Dashboard />);

        expect(screen.getByText(/2 products/))
            .toBeInTheDocument();

        expect(screen.getByText(/1 products/))
            .toBeInTheDocument();
    });

    it("should display the percentage discount", () => {
        render(<Dashboard />);

        expect(screen.getByText(/10% off/))
            .toBeInTheDocument();
    });

    it("should display Volume discount for volume bundles", () => {
        render(<Dashboard />);

        expect(screen.getAllByText("Volume discount").length).toBeGreaterThan(0);
    });

    it("should display an empty state when there are no bundles", () => {
        mocks.loaderData = createDashboardData({
            bundles: [],
        });

        render(<Dashboard />);

        expect(
            screen.getByText(
                "No active bundles yet. Choose a bundle type above to get started."
            )
        ).toBeInTheDocument();
    });

    it("should display zero products when components are missing", () => {
        mocks.loaderData = createDashboardData({
            bundles: [
                {
                    id: "bundle-103",
                    title: "Bundle Without Components",
                    type: "FIXED",
                    status: "ACTIVE",
                    components: null,
                    discountType: null,
                    discountValue: null,
                },
            ],
        });

        render(<Dashboard />);

        expect(screen.getByText(/0 products/))
            .toBeInTheDocument();

        expect(screen.getByText(/No discount/))
            .toBeInTheDocument();
    });

    it("should display View all bundles button when bundles exist", () => {
        render(<Dashboard />);

        expect(
            screen.getByText("View all bundles")
        ).toBeInTheDocument();
    });

    it("should navigate to the bundle listing page", () => {
        render(<Dashboard />);

        fireEvent.click(
            screen.getByText("View all bundles")
        );

        expect(mocks.navigate).toHaveBeenCalledWith(
            "/app/bundles/index"
        );
    });
});

// ==================================================
// BUNDLE EDIT NAVIGATION
// ==================================================

describe("Dashboard Component - Edit Bundle", () => {
    it("should navigate to the selected bundle edit page", () => {
        const { container } = render(<Dashboard />);

        const bundle = screen.getByText("Starter Kit")
            .closest("s-box");

        expect(bundle).toBeInTheDocument();

        const editButton = bundle.querySelector("s-button");

        expect(editButton).toBeInTheDocument();

        fireEvent.click(editButton);

        expect(mocks.navigate).toHaveBeenCalledWith(
            "/app/bundles/bundle-101"
        );
    });
});
