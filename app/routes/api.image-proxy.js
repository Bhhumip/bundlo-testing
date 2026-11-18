import { fetchPublicImage } from "../utils/imageProxy.server.js";

const IMAGE_CONTENT_TYPE = /^image\/(?:avif|bmp|gif|jpe?g|png|webp|x-icon|vnd\.microsoft\.icon)(?:\s*;|$)/i;

export function createImageProxyResponse(response) {
    if (response.status < 200 || response.status >= 300) {
        return new Response("Failed to fetch image", { status: 502 });
    }

    const contentType = response.headers["content-type"];
    if (typeof contentType !== "string" || !IMAGE_CONTENT_TYPE.test(contentType)) {
        return new Response("Unsupported image type", { status: 502 });
    }

    return new Response(response.body, {
        status: 200,
        headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
        },
    });
}

export async function loader({ request }) {
    const url = new URL(request.url);
    const imageUrl = url.searchParams.get("url");

    if (!imageUrl) {
        return new Response("Missing url param", { status: 400 });
    }

    try {
        const response = await fetchPublicImage(imageUrl);
        return createImageProxyResponse(response);
    } catch (err) {
        console.error("[image-proxy] error:", err);
        return new Response("Proxy error", { status: 502 });
    }
}
