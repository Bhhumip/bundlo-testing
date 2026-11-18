// TextTab.jsx — the "Text" tab of the widget customize form
import { S } from "./formStyles";
import { Field, Group } from "./FormControls";

export function TextTab({ mode, theme, update }) {
    const isCheckout = mode === "checkout";

    if (isCheckout) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Group label="Title">
                    <Field label="Title size">
                        <select
                            value={theme.titleSize}
                            onChange={(e) => update("titleSize", Number(e.target.value))}
                            style={S.select}
                        >
                            <option value={11}>Small</option>
                            <option value={13}>Medium</option>
                            <option value={15}>Large</option>
                        </select>
                    </Field>
                </Group>

                <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                    In checkout, text colors and fonts are controlled by your Shopify checkout branding.
                </span>
            </div>
        );
    }

    // Storefront mode
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Title">
                <Field label="Color">
                    <input
                        type="color"
                        value={theme.titleColor}
                        onChange={(e) => update("titleColor", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>
                <Field label="Size">
                    <select
                        value={theme.titleSize}
                        onChange={(e) => update("titleSize", Number(e.target.value))}
                        style={S.select}
                    >
                        <option value={11}>Small</option>
                        <option value={13}>Medium</option>
                        <option value={15}>Large</option>
                    </select>
                </Field>
            </Group>

            <Group label="Price">
                <Field label="Color">
                    <input
                        type="color"
                        value={theme.priceColor}
                        onChange={(e) => update("priceColor", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>
            </Group>

            <Group label="Custom CSS">
                <textarea
                    value={theme.customCss}
                    onChange={(e) => update("customCss", e.target.value)}
                    rows={5}
                    style={S.textarea}
                    placeholder=".widget-title { font-family: serif; }"
                />
                <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                    Applied to the storefront widget wrapper. Does not apply to checkout.
                </span>
            </Group>
        </div>
    );
}