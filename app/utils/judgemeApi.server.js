const JM_API = "https://api.judge.me/api/v1";

export async function requestJudgeMe(url, apiToken, options = {}, fetchImpl = fetch) {
    const headers = new Headers(options.headers);
    headers.set("X-Api-Token", apiToken);
    return fetchImpl(url, { ...options, headers });
}

export async function fetchStoreFallbackReviews(
    shop,
    privateToken,
    { fetchImpl = fetch, logger = console } = {}
) {
    try {
        const url = new URL(`${JM_API}/reviews`);
        url.searchParams.set("shop_domain", shop);
        url.searchParams.set("per_page", "9");
        url.searchParams.set("page", "1");

        const response = await requestJudgeMe(
            url.toString(),
            privateToken,
            {},
            fetchImpl
        );
        if (!response.ok) {
            logger.warn("[bundle-testimonials] Judge.me fallback request failed", {
                category: "upstream_http_error",
                status: response.status,
            });
            return [];
        }

        const data = await response.json();
        return (data?.reviews ?? []).map((review) => ({
            id: String(review.id),
            rating: review.rating ?? 0,
            title: review.title ?? "",
            body: review.body ?? "",
            reviewerName: review.reviewer?.name ?? "Customer",
            pictureUrls: (review.pictures ?? [])
                .map(picture => picture.urls?.huge ?? picture.urls?.original ?? "")
                .filter(Boolean),
            productTitle: review.product_title ?? "",
            shopifyProductId: String(review.product_external_id ?? ""),
            createdAt: review.created_at ?? new Date().toISOString(),
            source: "judgeme",
            _votesUp: review.votes_up ?? 0,
        }));
    } catch (error) {
        logger.error("[bundle-testimonials] Judge.me fallback request failed", {
            category: error instanceof SyntaxError ? "invalid_upstream_json" : "request_error",
        });
        return [];
    }
}
