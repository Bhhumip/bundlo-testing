import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";
import { createImageProxyResponse } from "../routes/api.image-proxy.js";

test("route response rejects an upstream image with no Content-Type", () => {
    const response = createImageProxyResponse({
        status: 200,
        headers: {},
        body: Buffer.from("body"),
    });

    assert.equal(response.status, 502);
});

test("rejects an unsupported upstream Content-Type", () => {
    const response = createImageProxyResponse({
        status: 200,
        headers: { "content-type": "application/json" },
        body: Buffer.from("{}"),
    });

    assert.equal(response.status, 502);
});

test("preserves an allowed image Content-Type and adds nosniff", async () => {
    const response = createImageProxyResponse({
        status: 200,
        headers: { "content-type": "image/png; charset=binary" },
        body: Buffer.from("image"),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png; charset=binary");
    assert.equal(response.headers.get("cache-control"), "public, max-age=86400");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(await response.text(), "image");
});
