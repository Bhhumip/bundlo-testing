// StyleTab.jsx — generic default Style tab.
// Widget-specific Style tabs (FBT, CPR, Donations) live in their own folders
// and are wired via TabConfig. This generic version is only used as a fallback.
import { S } from "./formStyles";
import { Field, Group, ColorSwatch } from "./FormControls";

export function StyleTab({ mode, theme, update }) {
    const isCheckout = mode === "checkout";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {!isCheckout && (
                <>
                    <Group label="Background (Storefront)">
                        <Field label="Widget bg">
                            <input
                                type="color"
                                value={theme.widgetBackground}
                                onChange={(e) => update("widgetBackground", e.target.value)}
                                style={S.colorInput}
                            />
                        </Field>
                        <Field label="Card bg">
                            <input
                                type="color"
                                value={theme.cardBackground}
                                onChange={(e) => update("cardBackground", e.target.value)}
                                style={S.colorInput}
                            />
                        </Field>
                    </Group>

                    <Group label="Border (Storefront)">
                        <Field label="Color">
                            <input
                                type="color"
                                value={theme.borderColor}
                                onChange={(e) => update("borderColor", e.target.value)}
                                style={S.colorInput}
                            />
                        </Field>
                        <Field label="Width">
                            <div style={S.rangeWrapper}>
                                <input
                                    type="range"
                                    min={0}
                                    max={3}
                                    step={1}
                                    value={theme.borderWidth}
                                    onChange={(e) => update("borderWidth", Number(e.target.value))}
                                    style={{ width: "90px" }}
                                />
                                <span style={S.rangeVal}>{theme.borderWidth}px</span>
                            </div>
                        </Field>
                        <Field label="Radius">
                            <select
                                value={theme.borderRadius}
                                onChange={(e) => update("borderRadius", Number(e.target.value))}
                                style={S.select}
                            >
                                <option value={0}>Sharp</option>
                                <option value={6}>Soft</option>
                                <option value={12}>Rounded</option>
                                <option value={20}>Pill</option>
                            </select>
                        </Field>
                    </Group>

                    <Group label="Badge color (Storefront)">
                        <ColorSwatch
                            colors={["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280"]}
                            value={theme.badgeColor}
                            onChange={(c) => update("badgeColor", c)}
                        />
                    </Group>
                </>
            )}

            {isCheckout && (
                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                    In checkout, colors and borders follow your Shopify checkout branding.
                </span>
            )}
        </div>
    );
}