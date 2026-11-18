// FbtStyleTab.jsx — dedicated Style tab for FBT widget.
// Only shows FBT-specific title presets.
import { S } from "../formStyles";
import { Field, Group } from "../FormControls";
import { styles } from "../formStyles";

const FBT_PRESETS = [
    "Frequently bought together",
    "Complete the look",
    "Pairs well with",
    "Often bought together",
];

export function FbtStyleTab({ mode, theme, update, setPreviewCondition }) {
    const isCheckout = mode === "checkout";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Widget title">
                <div style={styles.conditionBlock}>
                    <div style={{ ...styles.conditionHeader, borderLeft: "3px solid #6366f1" }}>
                        <span style={styles.conditionName}>FBT widget</span>
                        <span style={styles.conditionHint}>shown on product page</span>
                    </div>
                    <div style={styles.conditionBody}>
                        <Field label="Preset">
                            <select
                                style={S.select}
                                value={
                                    FBT_PRESETS.includes(theme.titleFbt)
                                        ? theme.titleFbt
                                        : "__custom__"
                                }
                                onChange={(e) => {
                                    if (setPreviewCondition) setPreviewCondition("fbt");
                                    if (e.target.value !== "__custom__") {
                                        update("titleFbt", e.target.value);
                                    } else {
                                        update("titleFbt", "");
                                    }
                                }}
                            >
                                {FBT_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                                <option value="__custom__">Custom…</option>
                            </select>
                        </Field>
                        {(!FBT_PRESETS.includes(theme.titleFbt) || theme.titleFbt === "") && (
                            <Field label="Custom">
                                <input
                                    type="text"
                                    style={{ ...S.textFull, borderColor: "#6366f1" }}
                                    placeholder="Frequently bought together"
                                    value={theme.titleFbt}
                                    onChange={(e) => {
                                        if (setPreviewCondition) setPreviewCondition("fbt");
                                        update("titleFbt", e.target.value);
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