import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { request as httpsRequest } from "node:https";

const blockedIpv4Addresses = new BlockList();
[
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.88.99.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
].forEach(([address, prefix]) => blockedIpv4Addresses.addSubnet(address, prefix, "ipv4"));
const blockedIpv6Addresses = new BlockList();
[
    ["::", 128],
    ["::1", 128],
    ["::ffff:0:0", 96],
    ["64:ff9b:1::", 48],
    ["100::", 64],
    ["2001::", 23],
    ["2001:db8::", 32],
    ["2002::", 16],
    ["3fff::", 20],
    ["fc00::", 7],
    ["fe80::", 10],
    ["ff00::", 8],
].forEach(([address, prefix]) => blockedIpv6Addresses.addSubnet(address, prefix, "ipv6"));

const globalIpv6Addresses = new BlockList();
globalIpv6Addresses.addSubnet("2000::", 3, "ipv6");
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const maxRedirects = 5;
const maxImageBytes = 10 * 1024 * 1024;
const dnsTimeoutMs = 5_000;
const requestTimeoutMs = 15_000;
const requestDeadlineMs = 30_000;

export function isPublicAddress(address) {
    const family = isIP(address);
    if (family === 4) {
        return !blockedIpv4Addresses.check(address, "ipv4");
    }
    if (family === 6) {
        return globalIpv6Addresses.check(address, "ipv6")
            && !blockedIpv6Addresses.check(address, "ipv6");
    }
    return false;
}

async function lookupWithTimeout(hostname, lookupImpl) {
    let timeout;
    try {
        return await Promise.race([
            lookupImpl(hostname, { all: true, verbatim: true }),
            new Promise((_, reject) => {
                timeout = setTimeout(
                    () => reject(new Error("Image hostname lookup timed out")),
                    dnsTimeoutMs
                );
            }),
        ]);
    } finally {
        clearTimeout(timeout);
    }
}

export async function resolvePublicImageTarget(rawUrl, lookupImpl = lookup) {
    const url = new URL(rawUrl);
    if (
        url.protocol !== "https:"
        || (url.port && url.port !== "443")
        || url.username
        || url.password
    ) {
        throw new Error("Image URL must use HTTPS on the default port without credentials");
    }

    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const family = isIP(hostname);
    const addresses = family
        ? [{ address: hostname, family }]
        : await lookupWithTimeout(hostname, lookupImpl);

    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
        throw new Error("Image URL must resolve only to public IP addresses");
    }

    return { url, hostname, address: addresses[0] };
}

export function createHttpsRequestOptions({ url, hostname, address }) {
    return {
        hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        servername: isIP(hostname) ? undefined : hostname,
        rejectUnauthorized: true,
        lookup: (_hostname, _options, callback) => {
            callback(null, address.address, address.family);
        },
    };
}

export function requestImage(
    { url, hostname, address },
    httpsRequestImpl = httpsRequest
) {
    return new Promise((resolve, reject) => {
        let settled = false;
        let deadline;
        const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(deadline);
            callback(value);
        };

        const request = httpsRequestImpl(
            createHttpsRequestOptions({ url, hostname, address }),
            (response) => {
                const status = response.statusCode ?? 502;
                if (redirectStatuses.has(status)) {
                    response.destroy();
                    finish(resolve, {
                        status,
                        headers: response.headers,
                        body: Buffer.alloc(0),
                    });
                    return;
                }

                const declaredLength = Number(response.headers["content-length"]);
                if (Number.isFinite(declaredLength) && declaredLength > maxImageBytes) {
                    response.destroy();
                    request.destroy(new Error("Image response exceeds the size limit"));
                    return;
                }

                const chunks = [];
                let totalBytes = 0;
                response.on("data", (chunk) => {
                    totalBytes += chunk.length;
                    if (totalBytes > maxImageBytes) {
                        request.destroy(new Error("Image response exceeds the size limit"));
                        return;
                    }
                    chunks.push(chunk);
                });
                response.on("end", () => {
                    finish(resolve, {
                        status,
                        headers: response.headers,
                        body: Buffer.concat(chunks),
                    });
                });
                response.on("error", (error) => finish(reject, error));
            }
        );

        request.setTimeout(requestTimeoutMs, () => request.destroy(new Error("Image request timed out")));
        deadline = setTimeout(
            () => request.destroy(new Error("Image request exceeded its deadline")),
            requestDeadlineMs
        );
        request.on("error", (error) => finish(reject, error));
        request.end();
    });
}

export async function fetchPublicImage(
    rawUrl,
    requestImageImpl = requestImage,
    lookupImpl = lookup
) {
    let currentUrl = rawUrl;

    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
        const target = await resolvePublicImageTarget(currentUrl, lookupImpl);
        const response = await requestImageImpl(target);
        const location = response.headers.location;

        if (!redirectStatuses.has(response.status) || !location) {
            return response;
        }
        if (redirectCount === maxRedirects) {
            throw new Error("Image URL exceeded the redirect limit");
        }

        currentUrl = new URL(location, target.url).toString();
    }

    throw new Error("Image URL exceeded the redirect limit");
}
