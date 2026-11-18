// app/reviews/registry.js
// ─────────────────────────────────────────────────────────────────────────────

import { JudgeMeAdapter } from "../adapters/judgeme.js";
import { MetafieldAdapter } from "../adapters/metafield.js";

const ADAPTERS = [
    {
        name: "judgeme",
        condition: (config) => Boolean(config.judgemePublicToken),
        adapter: JudgeMeAdapter,
        buildConfig: (c) => ({
            shop: c.shop,
            publicToken: c.judgemePublicToken,
            privateToken: c.judgemePrivateToken,
        }),
    },
    {
        name: "metafield",
        condition: () => true,
        adapter: MetafieldAdapter,
        buildConfig: (c) => ({
            shop: c.shop,
            accessToken: c.accessToken,
        }),
    },
];

const ADAPTER_MAP = Object.fromEntries(ADAPTERS.map((e) => [e.name, e]));

export function getAdapter(shopConfig, reviewSource = null) {
    if (reviewSource && reviewSource !== "auto") {
        const entry = ADAPTER_MAP[reviewSource];
        if (!entry) {
            console.warn(`[Registry] Unknown reviewSource "${reviewSource}", falling back to auto.`);
        } else if (!entry.condition(shopConfig)) {
            console.warn(`[Registry] "${reviewSource}" selected but not configured, falling back to metafield.`);
            const fallback = ADAPTER_MAP["metafield"];
            return { name: fallback.name, adapter: fallback.adapter, config: fallback.buildConfig(shopConfig) };
        } else {
            return { name: entry.name, adapter: entry.adapter, config: entry.buildConfig(shopConfig) };
        }
    }

    const match = ADAPTERS.find((e) => e.condition(shopConfig));
    if (!match) {
        console.warn("[Registry] No adapter matched for shop:", shopConfig.shop);
        return { name: "noop", adapter: { getReviews: async () => [] }, config: {} };
    }
    return { name: match.name, adapter: match.adapter, config: match.buildConfig(shopConfig) };
}