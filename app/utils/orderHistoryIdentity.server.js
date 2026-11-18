function getShopFromDestination(destination) {
    if (typeof destination !== "string") return null;

    try {
        const url = new URL(destination);
        const shop = url.hostname.toLowerCase();
        if (
            url.protocol !== "https:"
            || url.port
            || url.username
            || url.password
            || (url.pathname !== "" && url.pathname !== "/")
            || url.search
            || url.hash
            || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)
        ) {
            return null;
        }
        return shop;
    } catch {
        return null;
    }
}

export function getOrderHistoryIdentity(sessionToken) {
    if (!sessionToken || typeof sessionToken !== "object") return null;
    if (!process.env.SHOPIFY_API_KEY || sessionToken.aud !== process.env.SHOPIFY_API_KEY) {
        return null;
    }

    const shop = getShopFromDestination(sessionToken.dest);
    const customerId = sessionToken.sub;
    if (
        !shop
        || typeof customerId !== "string"
        || !/^gid:\/\/shopify\/Customer\/\d+$/.test(customerId)
    ) {
        return null;
    }

    return { shop, customerId };
}

export async function authenticateOrderHistoryRequest(request, authenticateCheckout) {
    try {
        const { sessionToken, cors } = await authenticateCheckout(request);
        return {
            identity: getOrderHistoryIdentity(sessionToken),
            cors,
        };
    } catch (error) {
        if (error instanceof Response) {
            return { identity: null, cors: null };
        }
        throw error;
    }
}
