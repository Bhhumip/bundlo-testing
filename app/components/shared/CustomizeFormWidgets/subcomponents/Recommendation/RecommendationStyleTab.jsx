// RecommendationStyleTab.jsx — dedicated Style tab for CPR (Customer Personalized Recommendation) widget.
// Shows 4 title preset blocks: Bundle, Recommendations, Order history, Best sellers.
import { S } from "../formStyles";
import { Field, Group } from "../FormControls";
import { styles } from "../formStyles";

const BUNDLE_PRESETS = [
    "Complete the bundle",
    "Bundle & save",
    "Add the full set",
    "Complete your order",
];

const REC_PRESETS = [
    "You may also like",
    "Recommended for you",
    "Picked just for you",
    "Customers also bought",
];

const ORDER_PRESETS = [
    "Buy again",
    "Reorder your favourites",
    "Stock up again",
    "Previously purchased",
];

const BEST_PRESETS = [
    "Popular right now",
    "Best sellers",
    "Trending today",
    "Shop favourites",
];

export function RecommendationStyleTab({ mode, theme, update, setPreviewCondition }) {
    const isCheckout = mode === "checkout";
console.log("[RecommendationStyleTab] rendering", { mode, theme });
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Widget title">
                {/* Bundle */}
                <div style={styles.conditionBlock}>
                    <div style={{ ...styles.conditionHeader, borderLeft: "3px solid #8b5cf6" }}>
                        <span style={styles.conditionName}>Bundle widget</span>
                        <span style={styles.conditionHint}>when bundles are found</span>
                    </div>
                    <div style={styles.conditionBody}>
                        <Field label="Preset">
                            <select
                                style={S.select}
                                value={
                                    BUNDLE_PRESETS.includes(theme.titleBundle)
                                        ? theme.titleBundle
                                        : "__custom__"
                                }
                                onChange={(e) => {
                                    if (setPreviewCondition) setPreviewCondition("bundle");
                                    if (e.target.value !== "__custom__") {
                                        update("titleBundle", e.target.value);
                                    } else {
                                        update("titleBundle", "");
                                    }
                                }}
                            >
                                {BUNDLE_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                                <option value="__custom__">Custom…</option>
                            </select>
                        </Field>
                        {(!BUNDLE_PRESETS.includes(theme.titleBundle) || theme.titleBundle === "") && (
                            <Field label="Custom">
                                <input
                                    type="text"
                                    style={{ ...S.textFull, borderColor: "#3b82f6" }}
                                    placeholder="Complete the bundle"
                                    value={theme.titleBundle}
                                    onChange={(e) => {
                                        if (setPreviewCondition) setPreviewCondition("bundle");
                                        update("titleBundle", e.target.value);
                                    }}
                                />
                            </Field>
                        )}
                    </div>
                </div>

                {/* Recommendations */}
                <div style={styles.conditionBlock}>
                    <div style={{ ...styles.conditionHeader, borderLeft: "3px solid #3b82f6" }}>
                        <span style={styles.conditionName}>Recommendations</span>
                        <span style={styles.conditionHint}>personalised picks</span>
                    </div>
                    <div style={styles.conditionBody}>
                        <Field label="Preset">
                            <select
                                style={S.select}
                                value={
                                    REC_PRESETS.includes(theme.titleRecommendations)
                                        ? theme.titleRecommendations
                                        : "__custom__"
                                }
                                onChange={(e) => {
                                    if (setPreviewCondition) setPreviewCondition("recommendations");
                                    if (e.target.value !== "__custom__") {
                                        update("titleRecommendations", e.target.value);
                                    } else {
                                        update("titleRecommendations", "");
                                    }
                                }}
                            >
                                {REC_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                                <option value="__custom__">Custom…</option>
                            </select>
                        </Field>
                        {(!REC_PRESETS.includes(theme.titleRecommendations) || theme.titleRecommendations === "") && (
                            <Field label="Custom">
                                <input
                                    type="text"
                                    style={{ ...S.textFull, borderColor: "#3b82f6" }}
                                    placeholder="You may also like"
                                    value={theme.titleRecommendations}
                                    onChange={(e) => {
                                        if (setPreviewCondition) setPreviewCondition("recommendations");
                                        update("titleRecommendations", e.target.value);
                                    }}
                                />
                            </Field>
                        )}
                    </div>
                </div>

                {/* Order history */}
                <div style={styles.conditionBlock}>
                    <div style={{ ...styles.conditionHeader, borderLeft: "3px solid #10b981" }}>
                        <span style={styles.conditionName}>Order history</span>
                        <span style={styles.conditionHint}>based on past purchases</span>
                    </div>
                    <div style={styles.conditionBody}>
                        <Field label="Preset">
                            <select
                                style={S.select}
                                value={
                                    ORDER_PRESETS.includes(theme.titleOrderHistory)
                                        ? theme.titleOrderHistory
                                        : "__custom__"
                                }
                                onChange={(e) => {
                                    if (setPreviewCondition) setPreviewCondition("orderHistory");
                                    if (e.target.value !== "__custom__") {
                                        update("titleOrderHistory", e.target.value);
                                    } else {
                                        update("titleOrderHistory", "");
                                    }
                                }}
                            >
                                {ORDER_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                                <option value="__custom__">Custom…</option>
                            </select>
                        </Field>
                        {(!ORDER_PRESETS.includes(theme.titleOrderHistory) || theme.titleOrderHistory === "") && (
                            <Field label="Custom">
                                <input
                                    type="text"
                                    style={{ ...S.textFull, borderColor: "#3b82f6" }}
                                    placeholder="Buy again"
                                    value={theme.titleOrderHistory}
                                    onChange={(e) => {
                                        if (setPreviewCondition) setPreviewCondition("orderHistory");
                                        update("titleOrderHistory", e.target.value);
                                    }}
                                />
                            </Field>
                        )}
                    </div>
                </div>

                {/* Best sellers */}
                <div style={styles.conditionBlock}>
                    <div style={{ ...styles.conditionHeader, borderLeft: "3px solid #f59e0b" }}>
                        <span style={styles.conditionName}>Best sellers</span>
                        <span style={styles.conditionHint}>fallback — no history found</span>
                    </div>
                    <div style={styles.conditionBody}>
                        <Field label="Preset">
                            <select
                                style={S.select}
                                value={
                                    BEST_PRESETS.includes(theme.titleBestSellers)
                                        ? theme.titleBestSellers
                                        : "__custom__"
                                }
                                onChange={(e) => {
                                    if (setPreviewCondition) setPreviewCondition("bestSellers");
                                    if (e.target.value !== "__custom__") {
                                        update("titleBestSellers", e.target.value);
                                    } else {
                                        update("titleBestSellers", "");
                                    }
                                }}
                            >
                                {BEST_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                                <option value="__custom__">Custom…</option>
                            </select>
                        </Field>
                        {(!BEST_PRESETS.includes(theme.titleBestSellers) || theme.titleBestSellers === "") && (
                            <Field label="Custom">
                                <input
                                    type="text"
                                    style={{ ...S.textFull, borderColor: "#3b82f6" }}
                                    placeholder="Popular right now"
                                    value={theme.titleBestSellers}
                                    onChange={(e) => {
                                        if (setPreviewCondition) setPreviewCondition("bestSellers");
                                        update("titleBestSellers", e.target.value);
                                    }}
                                />
                            </Field>
                        )}
                    </div>
                </div>
            </Group>

            {isCheckout && (
                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                    In checkout, colors and borders follow your Shopify checkout branding.
                    Only layout and content are configurable here.
                </span>
            )}
        </div>
    );
}