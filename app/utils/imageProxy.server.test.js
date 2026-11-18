import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";
import {
    createHttpsRequestOptions,
    fetchPublicImage,
    isPublicAddress,
    requestImage,
    resolvePublicImageTarget,
} from "./imageProxy.server.js";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function createMockHttpsRequest({
    status = 200,
    headers = {},
    body = Buffer.from("image"),
    fireSocketTimeout = false,
} = {}) {
    let requestOptions;
    const httpsRequest = (options, onResponse) => {
        requestOptions = options;
        const request = new EventEmitter();
        request.setTimeout = (...args) => {
            if (fireSocketTimeout) queueMicrotask(args[1]);
            return request;
        };
        request.end = () => {
            const response = new PassThrough();
            response.statusCode = status;
            response.headers = headers;
            queueMicrotask(() => {
                onResponse(response);
                if (body !== null) response.end(body);
            });
        };
        request.destroy = (error) => {
            if (error) queueMicrotask(() => request.emit("error", error));
            return request;
        };
        return request;
    };

    return {
        httpsRequest,
        getRequestOptions: () => requestOptions,
    };
}

test("blocks private, reserved, and IPv4-mapped IPv6 destinations", () => {
    for (const address of [
        "0.1.2.3",
        "10.0.0.1",
        "100.64.0.1",
        "127.0.0.1",
        "169.254.169.254",
        "172.16.0.1",
        "192.168.1.1",
        "198.18.0.1",
        "224.0.0.1",
        "240.0.0.1",
        "::",
        "::1",
        "::ffff:127.0.0.1",
        "::ffff:10.0.0.1",
        "fc00::1",
        "fe80::1",
        "ff02::1",
    ]) {
        assert.equal(isPublicAddress(address), false, address);
    }

    for (const address of ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"]) {
        assert.equal(isPublicAddress(address), true, address);
    }
});

test("rejects mixed public/private DNS results and pins the public DNS result", async () => {
    await assert.rejects(
        resolvePublicImageTarget("https://images.example.test/a.png", async () => [
            { address: "8.8.8.8", family: 4 },
            { address: "127.0.0.1", family: 4 },
        ]),
        /public IP addresses/
    );

    const target = await resolvePublicImageTarget(
        "https://images.example.test/a.png",
        async () => [{ address: "8.8.8.8", family: 4 }]
    );
    const options = createHttpsRequestOptions(target);
    let pinnedAddress;
    options.lookup("images.example.test", {}, (_error, address, family) => {
        pinnedAddress = { address, family };
    });

    assert.equal(options.hostname, "images.example.test");
    assert.equal(options.servername, "images.example.test");
    assert.deepEqual(pinnedAddress, { address: "8.8.8.8", family: 4 });
    assert.equal(options.rejectUnauthorized, true);
});

test("rejects hostnames when DNS resolution exceeds its timeout", async () => {
    await assert.rejects(
        resolvePublicImageTarget("https://images.example.test/a.png", () => new Promise(() => {})),
        /hostname lookup timed out/
    );
});

test("image request returns the Node HTTP status, lowercase headers, and Buffer body", async () => {
    const target = await resolvePublicImageTarget("https://8.8.8.8/image.png");
    const mock = createMockHttpsRequest({
        headers: { "content-type": "image/png", "content-length": "5" },
    });
    const response = await requestImage(target, mock.httpsRequest);

    assert.equal(response.status, 200);
    assert.equal(response.headers["content-type"], "image/png");
    assert.ok(Buffer.isBuffer(response.body));
    assert.equal(new Response(response.body).status, 200);
});

test("aborts requests that exceed the socket inactivity timeout", async () => {
    const target = await resolvePublicImageTarget("https://8.8.8.8/image.png");
    const mock = createMockHttpsRequest({ fireSocketTimeout: true, body: null });

    await assert.rejects(
        requestImage(target, mock.httpsRequest),
        /Image request timed out/
    );
});

test("rejects oversized responses from both declared and streamed lengths", async () => {
    const target = await resolvePublicImageTarget("https://8.8.8.8/image.png");
    const declaredLengthMock = createMockHttpsRequest({
        headers: { "content-length": String(MAX_IMAGE_BYTES + 1) },
        body: null,
    });
    await assert.rejects(
        requestImage(target, declaredLengthMock.httpsRequest),
        /size limit/
    );

    const streamedLengthMock = createMockHttpsRequest({
        headers: {},
        body: Buffer.alloc(MAX_IMAGE_BYTES + 1),
    });
    await assert.rejects(
        requestImage(target, streamedLengthMock.httpsRequest),
        /size limit/
    );
});

test("rejects unsafe redirects before making a request to the destination", async () => {
    let requests = 0;
    await assert.rejects(
        fetchPublicImage("https://8.8.8.8/image.png", async () => {
            requests += 1;
            return {
                status: 302,
                headers: { location: "https://[::ffff:127.0.0.1]/admin" },
                body: Buffer.alloc(0),
            };
        }),
        /public IP addresses/
    );
    assert.equal(requests, 1);
});

test("follows redirects only after validating each public destination", async () => {
    let requests = 0;
    const response = await fetchPublicImage("https://8.8.8.8/image.png", async () => {
        requests += 1;
        if (requests === 1) {
            return {
                status: 302,
                headers: { location: "https://1.1.1.1/final.png" },
                body: Buffer.alloc(0),
            };
        }
        return {
            status: 200,
            headers: { "content-type": "image/png" },
            body: Buffer.from("image"),
        };
    });

    assert.equal(requests, 2);
    assert.equal(response.status, 200);
    assert.equal(response.headers["content-type"], "image/png");
    assert.ok(Buffer.isBuffer(response.body));
});
