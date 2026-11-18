import assert from "node:assert/strict";
import test from "node:test";
import { fetchStoreFallbackReviews } from "./judgemeApi.server.js";

test("sends Judge.me API keys in the documented header, not the URL", async () => {
    const privateToken = "private-token-test-value";
    let requestUrl;
    let requestOptions;
    const reviews = await fetchStoreFallbackReviews(
        "example.myshopify.com",
        privateToken,
        {
            fetchImpl: async (url, options) => {
                requestUrl = url;
                requestOptions = options;
                return {
                    ok: true,
                    json: async () => ({
                        reviews: [{
                            id: 123,
                            rating: 5,
                            title: "Great",
                            body: "Works well",
                            reviewer: { name: "Buyer" },
                            pictures: [{ urls: { huge: "https://cdn.example.test/review.jpg" } }],
                            product_title: "Product",
                            product_external_id: 456,
                            votes_up: 2,
                        }],
                    }),
                };
            },
            logger: { warn() {}, error() {} },
        }
    );

    const url = new URL(requestUrl);
    assert.equal(url.origin, "https://api.judge.me");
    assert.equal(url.pathname, "/api/v1/reviews");
    assert.equal(url.searchParams.get("shop_domain"), "example.myshopify.com");
    assert.equal(url.searchParams.get("api_token"), null);
    assert.equal(requestOptions.headers.get("X-Api-Token"), privateToken);
    const { createdAt, ...normalizedReview } = reviews[0];
    assert.deepEqual(normalizedReview, {
        id: "123",
        rating: 5,
        title: "Great",
        body: "Works well",
        reviewerName: "Buyer",
        pictureUrls: ["https://cdn.example.test/review.jpg"],
        productTitle: "Product",
        shopifyProductId: "456",
        source: "judgeme",
        _votesUp: 2,
    });
    assert.equal(Number.isNaN(Date.parse(createdAt)), false);
});

test("logs only a safe category for upstream errors and invalid JSON", async () => {
    const privateToken = "private-token-test-value";
    const responseBody = "sensitive upstream response";
    const logged = [];
    const logger = {
        warn: (...args) => logged.push(args),
        error: (...args) => logged.push(args),
    };

    const httpFailure = await fetchStoreFallbackReviews("example.myshopify.com", privateToken, {
        fetchImpl: async () => ({ ok: false, status: 401 }),
        logger,
    });
    const invalidJson = await fetchStoreFallbackReviews("example.myshopify.com", privateToken, {
        fetchImpl: async () => ({
            ok: true,
            json: async () => {
                throw new SyntaxError(`${responseBody} ${privateToken}`);
            },
        }),
        logger,
    });
    const requestFailure = await fetchStoreFallbackReviews("example.myshopify.com", privateToken, {
        fetchImpl: async () => {
            throw new Error(`${responseBody} ${privateToken}`);
        },
        logger,
    });

    assert.deepEqual(httpFailure, []);
    assert.deepEqual(invalidJson, []);
    assert.deepEqual(requestFailure, []);
    assert.equal(JSON.stringify(logged).includes(privateToken), false);
    assert.equal(JSON.stringify(logged).includes(responseBody), false);
    assert.deepEqual(logged.map((entry) => entry.at(-1)), [
        { category: "upstream_http_error", status: 401 },
        { category: "invalid_upstream_json" },
        { category: "request_error" },
    ]);
});
