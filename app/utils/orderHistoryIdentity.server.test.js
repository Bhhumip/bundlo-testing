import assert from "node:assert/strict";
import process from "node:process";
import test, { afterEach, beforeEach } from "node:test";
import { authenticateOrderHistoryRequest } from "./orderHistoryIdentity.server.js";

const shop = "example-store.myshopify.com";
const customerId = "gid://shopify/Customer/12345";
const expectedAudience = "test-shopify-app-client-id";
const originalApiKey = process.env.SHOPIFY_API_KEY;

beforeEach(() => {
    process.env.SHOPIFY_API_KEY = expectedAudience;
});

afterEach(() => {
    if (originalApiKey === undefined) {
        delete process.env.SHOPIFY_API_KEY;
    } else {
        process.env.SHOPIFY_API_KEY = originalApiKey;
    }
});

function requestWithParams(params = {}) {
    const url = new URL("https://app.example.test/api/order-history-recommendations");
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return new Request(url);
}

test("missing session token cannot authenticate or produce customer identity", async () => {
    const request = requestWithParams({ shop, customerId });
    const context = await authenticateOrderHistoryRequest(request, async (receivedRequest) => {
        assert.equal(receivedRequest, request);
        throw new Response(null, { status: 302 });
    });

    assert.deepEqual(context, { identity: null, cors: null });
});

test("invalid session token cannot authenticate or produce customer identity", async () => {
    const request = requestWithParams({ shop, customerId });
    const context = await authenticateOrderHistoryRequest(request, async () => {
        throw new Response(null, { status: 401 });
    });

    assert.deepEqual(context, { identity: null, cors: null });
});

test("anonymous authenticated checkout has no order-history identity", async () => {
    const cors = (response) => response;
    const context = await authenticateOrderHistoryRequest(requestWithParams(), async () => ({
        sessionToken: { aud: expectedAudience, dest: `https://${shop}` },
        cors,
    }));

    assert.equal(context.identity, null);
    assert.equal(context.cors, cors);
});

test("query-string shop and customer IDs cannot override verified claims", async () => {
    const context = await authenticateOrderHistoryRequest(
        requestWithParams({
            shop: "attacker-shop.myshopify.com",
            customerId: "gid://shopify/Customer/99999",
        }),
        async () => ({
            sessionToken: {
                aud: expectedAudience,
                dest: `https://${shop}`,
                sub: customerId,
            },
            cors: (response) => response,
        })
    );

    assert.deepEqual(context.identity, { shop, customerId });
});

test("valid authenticated customer claims provide shop and customer identity", async () => {
    const context = await authenticateOrderHistoryRequest(requestWithParams(), async () => ({
        sessionToken: {
            aud: expectedAudience,
            dest: `https://${shop}/`,
            sub: customerId,
        },
        cors: (response) => response,
    }));

    assert.deepEqual(context.identity, { shop, customerId });
});

test("matching audience permits verified customer claims", async () => {
    const context = await authenticateOrderHistoryRequest(requestWithParams(), async () => ({
        sessionToken: {
            aud: expectedAudience,
            dest: `https://${shop}`,
            sub: customerId,
        },
        cors: (response) => response,
    }));

    assert.deepEqual(context.identity, { shop, customerId });
});

test("mismatched audience rejects customer claims", async () => {
    const context = await authenticateOrderHistoryRequest(requestWithParams(), async () => ({
        sessionToken: {
            aud: "another-app-client-id",
            dest: `https://${shop}`,
            sub: customerId,
        },
        cors: (response) => response,
    }));

    assert.equal(context.identity, null);
});

test("missing audience rejects customer claims", async () => {
    const context = await authenticateOrderHistoryRequest(requestWithParams(), async () => ({
        sessionToken: {
            dest: `https://${shop}`,
            sub: customerId,
        },
        cors: (response) => response,
    }));

    assert.equal(context.identity, null);
});

test("invalid destinations and non-customer subjects are rejected", async () => {
    for (const sessionToken of [
        { aud: expectedAudience, dest: "https://attacker.example", sub: customerId },
        { aud: expectedAudience, dest: "http://example-store.myshopify.com", sub: customerId },
        { aud: expectedAudience, dest: `https://${shop}`, sub: "gid://shopify/Product/12345" },
        { aud: expectedAudience, dest: `https://${shop}`, sub: 12345 },
    ]) {
        const context = await authenticateOrderHistoryRequest(requestWithParams(), async () => ({
            sessionToken,
            cors: (response) => response,
        }));
        assert.equal(context.identity, null);
    }
});

test("non-authentication failures are not converted into anonymous requests", async () => {
    await assert.rejects(
        authenticateOrderHistoryRequest(requestWithParams(), async () => {
            throw new Error("internal authentication failure");
        }),
        /internal authentication failure/
    );
});
