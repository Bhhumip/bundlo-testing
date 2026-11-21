
import { beforeEach, describe, expect, it, vi } from "vitest";

// --------------------------------------------------
// MOCKS
// --------------------------------------------------

vi.mock("~/shopify.server", () => ({
    authenticate: {
        admin: vi.fn(),
    },
}));

vi.mock("~/featureAccess.server", () => ({
    getCurrentAppPlan: vi.fn(),
    canShopAccessFeature: vi.fn(),
}));

vi.mock("~/models/bundle.server", () => ({
    listBundles: vi.fn(),
    getBundleStats: vi.fn(),
    deleteBundle: vi.fn(),
    archiveBundle: vi.fn(),
    activateBundle: vi.fn(),
}));

vi.mock("@shopify/shopify-app-react-router/server", () => ({
    boundary: {
        headers: vi.fn(() => new Headers()),
    },
}));

// --------------------------------------------------
// IMPORTS
// --------------------------------------------------

import { authenticate } from "~/shopify.server";

import {
    getCurrentAppPlan,
    canShopAccessFeature,
} from "~/featureAccess.server";

import {
    listBundles,
    getBundleStats,
    deleteBundle,
    archiveBundle,
    activateBundle,
} from "~/models/bundle.server";

import {
    loader,
    action,
} from "~/routes/app.dashboard.jsx";

// --------------------------------------------------
// TEST DATA
// --------------------------------------------------

const SHOP = "merchant-test.myshopify.com";
const BUNDLE_ID = "bundle-123";

const mockBundles = [
    {
        id: BUNDLE_ID,
        title: "Starter Kit",
        type: "FIXED",
        status: "ACTIVE",
        components: [{ id: "product-1" }],
        discountType: "PERCENTAGE",
        discountValue: 10,
    },
];

const mockStats = {
    totalBundles: 5,
    activeBundles: 3,
    totalRevenue: 1250.5,
    totalOrders: 12,
    totalUnitsSold: 25,
    deltas: {
        totalBundles: 10,
        activeBundles: -5,
    },
};

// --------------------------------------------------
// REQUEST HELPERS
// --------------------------------------------------

function createLoaderRequest() {
    return new Request("http://localhost/app/dashboard");
}

function createActionRequest(intent, bundleId = BUNDLE_ID) {
    const formData = new FormData();

    formData.set("intent", intent);

    if (bundleId !== undefined && bundleId !== null) {
        formData.set("bundleId", bundleId);
    }

    return new Request("http://localhost/app/dashboard", {
        method: "POST",
        body: formData,
    });
}

// --------------------------------------------------
// MOCK SETUP
// --------------------------------------------------

function setupAuthenticatedShop() {
    const admin = {
        graphql: vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue({
                data: {
                    shop: {
                        currencyCode: "USD",
                    },
                },
            }),
        }),
    };

    authenticate.admin.mockResolvedValue({
        session: {
            shop: SHOP,
        },
        admin,
    });

    canShopAccessFeature.mockResolvedValue(true);

    getCurrentAppPlan.mockResolvedValue("Growth plan");

    listBundles.mockResolvedValue({
        bundles: mockBundles,
        total: mockBundles.length,
    });

    getBundleStats.mockResolvedValue(mockStats);

    return admin;
}

beforeEach(() => {
    vi.clearAllMocks();
});

// ==================================================
// DASHBOARD LOADER TESTS
// ==================================================

describe("Dashboard Loader", () => {

    // ----------------------------------------------
    // Successful loader execution
    // ----------------------------------------------

    it("should return all required dashboard data", async () => {
        setupAuthenticatedShop();

        const request = createLoaderRequest();

        const result = await loader({ request });

        expect(result).toEqual({
            bundles: mockBundles,
            stats: mockStats,
            shopCurrency: "USD",
            paidAppPlan: "Growth plan",

            featureAccess: {
                FIXED_BUNDLE: true,
                VOLUME_BUNDLE: true,
                MIX_MATCH: true,
                BYOB: true,
                MULTIVARIANT: true,
            },
        });
    });

    it("should authenticate the admin request", async () => {
        setupAuthenticatedShop();

        const request = createLoaderRequest();

        await loader({ request });

        expect(authenticate.admin).toHaveBeenCalledWith(request);
        expect(authenticate.admin).toHaveBeenCalledTimes(1);
    });

    it("should fetch only the latest five bundles", async () => {
        setupAuthenticatedShop();

        await loader({
            request: createLoaderRequest(),
        });

        expect(listBundles).toHaveBeenCalledWith(
            SHOP,
            { take: 5 }
        );
    });

    it("should fetch bundle statistics for the authenticated shop", async () => {
        setupAuthenticatedShop();

        await loader({
            request: createLoaderRequest(),
        });

        expect(getBundleStats).toHaveBeenCalledWith(SHOP);
    });

    // ----------------------------------------------
    // Feature access
    // ----------------------------------------------

    it("should check access for all five bundle types", async () => {
        setupAuthenticatedShop();

        await loader({
            request: createLoaderRequest(),
        });

        expect(canShopAccessFeature).toHaveBeenCalledTimes(5);

        expect(canShopAccessFeature).toHaveBeenCalledWith(
            SHOP,
            "FIXED_BUNDLE"
        );

        expect(canShopAccessFeature).toHaveBeenCalledWith(
            SHOP,
            "VOLUME_BUNDLE"
        );

        expect(canShopAccessFeature).toHaveBeenCalledWith(
            SHOP,
            "MIX_MATCH"
        );

        expect(canShopAccessFeature).toHaveBeenCalledWith(
            SHOP,
            "BYOB"
        );

        expect(canShopAccessFeature).toHaveBeenCalledWith(
            SHOP,
            "MULTIVARIANT"
        );
    });

    it("should preserve restricted feature access", async () => {
        setupAuthenticatedShop();

        canShopAccessFeature.mockImplementation(
            async (_shop, feature) => feature === "FIXED_BUNDLE"
        );

        const result = await loader({
            request: createLoaderRequest(),
        });

        expect(result.featureAccess).toEqual({
            FIXED_BUNDLE: true,
            VOLUME_BUNDLE: false,
            MIX_MATCH: false,
            BYOB: false,
            MULTIVARIANT: false,
        });
    });

    it("should return false for features that are unavailable", async () => {
        setupAuthenticatedShop();

        canShopAccessFeature.mockResolvedValue(false);

        const result = await loader({
            request: createLoaderRequest(),
        });

        expect(
            Object.values(result.featureAccess).every(
                (value) => value === false
            )
        ).toBe(true);
    });

    // ----------------------------------------------
    // Currency and plan
    // ----------------------------------------------

    it("should retrieve the shop currency through GraphQL", async () => {
        const admin = setupAuthenticatedShop();

        await loader({
            request: createLoaderRequest(),
        });

        expect(admin.graphql).toHaveBeenCalledTimes(1);

        expect(admin.graphql).toHaveBeenCalledWith(
            expect.stringContaining("currencyCode")
        );
    });

    it("should retrieve the current app plan", async () => {
        setupAuthenticatedShop();

        await loader({
            request: createLoaderRequest(),
        });

        expect(getCurrentAppPlan).toHaveBeenCalledWith(SHOP);
    });

    it("should return null plan when the merchant has no paid plan or trial plan", async () => {
        setupAuthenticatedShop();

        getCurrentAppPlan.mockResolvedValue(null);

        const result = await loader({
            request: createLoaderRequest(),
        });

        expect(result.paidAppPlan).toBeNull();
    });

    // ----------------------------------------------
    // Empty data
    // ----------------------------------------------

    it("should return an empty bundle array when no bundles exist", async () => {
        setupAuthenticatedShop();

        listBundles.mockResolvedValue({
            bundles: [],
            total: 0,
        });

        const result = await loader({
            request: createLoaderRequest(),
        });

        expect(result.bundles).toEqual([]);
    });

    it("should return zero statistics when the shop has no bundles", async () => {
        setupAuthenticatedShop();

        getBundleStats.mockResolvedValue({
            totalBundles: 0,
            activeBundles: 0,
            totalRevenue: 0,
            totalOrders: 0,
            totalUnitsSold: 0,
            deltas: {
                totalBundles: null,
                activeBundles: null,
            },
        });

        const result = await loader({
            request: createLoaderRequest(),
        });

        expect(result.stats.totalBundles).toBe(0);
        expect(result.stats.activeBundles).toBe(0);
        expect(result.stats.totalRevenue).toBe(0);
        expect(result.stats.totalUnitsSold).toBe(0);
    });

    // ----------------------------------------------
    // Failure scenarios
    // ----------------------------------------------

    it("should propagate authentication failures", async () => {
        authenticate.admin.mockRejectedValue(
            new Error("Unauthorized")
        );

        await expect(
            loader({
                request: createLoaderRequest(),
            })
        ).rejects.toThrow("Unauthorized");

        expect(listBundles).not.toHaveBeenCalled();
        expect(getBundleStats).not.toHaveBeenCalled();
    });

    it("should propagate bundle fetching failures", async () => {
        setupAuthenticatedShop();

        listBundles.mockRejectedValue(
            new Error("Bundle query failed")
        );

        await expect(
            loader({
                request: createLoaderRequest(),
            })
        ).rejects.toThrow("Bundle query failed");
    });

    it("should propagate statistics fetching failures", async () => {
        setupAuthenticatedShop();

        getBundleStats.mockRejectedValue(
            new Error("Statistics query failed")
        );

        await expect(
            loader({
                request: createLoaderRequest(),
            })
        ).rejects.toThrow("Statistics query failed");
    });

    it("should propagate feature access failures", async () => {
        setupAuthenticatedShop();

        canShopAccessFeature.mockRejectedValue(
            new Error("Feature access failed")
        );

        await expect(
            loader({
                request: createLoaderRequest(),
            })
        ).rejects.toThrow("Feature access failed");
    });

    it("should propagate currency GraphQL failures", async () => {
        const admin = setupAuthenticatedShop();

        admin.graphql.mockRejectedValue(
            new Error("Shop GraphQL failed")
        );

        await expect(
            loader({
                request: createLoaderRequest(),
            })
        ).rejects.toThrow("Shop GraphQL failed");
    });

    it("should propagate GraphQL JSON parsing failures", async () => {
        const admin = setupAuthenticatedShop();

        admin.graphql.mockResolvedValue({
            json: vi.fn().mockRejectedValue(
                new Error("Invalid GraphQL response")
            ),
        });

        await expect(
            loader({
                request: createLoaderRequest(),
            })
        ).rejects.toThrow("Invalid GraphQL response");
    });

    it("should propagate app plan lookup failures", async () => {
        setupAuthenticatedShop();

        getCurrentAppPlan.mockRejectedValue(
            new Error("Plan lookup failed")
        );

        await expect(
            loader({
                request: createLoaderRequest(),
            })
        ).rejects.toThrow("Plan lookup failed");
    });

});

// ==================================================
// DASHBOARD ACTION TESTS
// ==================================================

describe("Dashboard Action", () => {

    // ----------------------------------------------
    // Delete bundle
    // ----------------------------------------------

    it("should delete the selected bundle", async () => {
        const admin = setupAuthenticatedShop();

        const result = await action({
            request: createActionRequest("delete"),
        });

        expect(result).toBeNull();

        expect(deleteBundle).toHaveBeenCalledWith(
            SHOP,
            admin,
            BUNDLE_ID
        );

        expect(archiveBundle).not.toHaveBeenCalled();
        expect(activateBundle).not.toHaveBeenCalled();
    });

    // ----------------------------------------------
    // Archive bundle
    // ----------------------------------------------

    it("should archive the selected bundle", async () => {
        const admin = setupAuthenticatedShop();

        const result = await action({
            request: createActionRequest("archive"),
        });

        expect(result).toBeNull();

        expect(archiveBundle).toHaveBeenCalledWith(
            BUNDLE_ID,
            SHOP,
            admin
        );

        expect(deleteBundle).not.toHaveBeenCalled();
        expect(activateBundle).not.toHaveBeenCalled();
    });

    // ----------------------------------------------
    // Unarchive bundle
    // ----------------------------------------------

    it("should activate an archived bundle", async () => {
        const admin = setupAuthenticatedShop();

        const result = await action({
            request: createActionRequest("unarchive"),
        });

        expect(result).toBeNull();

        expect(activateBundle).toHaveBeenCalledWith(
            BUNDLE_ID,
            SHOP,
            admin
        );

        expect(deleteBundle).not.toHaveBeenCalled();
        expect(archiveBundle).not.toHaveBeenCalled();
    });

    // ----------------------------------------------
    // Unsupported intent
    // ----------------------------------------------

    it("should not perform mutations for an unknown intent", async () => {
        setupAuthenticatedShop();

        const result = await action({
            request: createActionRequest("unknown"),
        });

        expect(result).toBeNull();

        expect(deleteBundle).not.toHaveBeenCalled();
        expect(archiveBundle).not.toHaveBeenCalled();
        expect(activateBundle).not.toHaveBeenCalled();
    });

    // ----------------------------------------------
    // Authentication failures
    // ----------------------------------------------

    it("should not execute an action when authentication fails", async () => {
        authenticate.admin.mockRejectedValue(
            new Error("Unauthorized")
        );

        await expect(
            action({
                request: createActionRequest("delete"),
            })
        ).rejects.toThrow("Unauthorized");

        expect(deleteBundle).not.toHaveBeenCalled();
        expect(archiveBundle).not.toHaveBeenCalled();
        expect(activateBundle).not.toHaveBeenCalled();
    });

    // ----------------------------------------------
    // Mutation failures
    // ----------------------------------------------

    it.each([
        ["delete", deleteBundle],
        ["archive", archiveBundle],
        ["unarchive", activateBundle],
    ])(
        "should propagate %s operation failures",
        async (intent, mutationFunction) => {
            setupAuthenticatedShop();

            mutationFunction.mockRejectedValue(
                new Error(`${intent} failed`)
            );

            await expect(
                action({
                    request: createActionRequest(intent),
                })
            ).rejects.toThrow(`${intent} failed`);
        }
    );

});
