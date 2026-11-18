import { S } from "../formStyles";
import { Field, Group } from "../FormControls";

const BORDER_RADIUS_OPTIONS = ["none", "base", "large"];
const SPACING_OPTIONS = ["tight", "base", "loose"];

export function OrderNoteStyleTab({ mode, theme, update }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Shape">
                <Field label="Border radius">
                    <select
                        value={theme.borderRadius}
                        onChange={(e) => update("borderRadius", e.target.value)}
                        style={S.select}
                    >
                        {BORDER_RADIUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </Field>
            </Group>

            <Group label="Spacing">
                <Field label="Gap">
                    <select
                        value={theme.gap}
                        onChange={(e) => update("gap", e.target.value)}
                        style={S.select}
                    >
                        {SPACING_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Padding">
                    <select
                        value={theme.padding}
                        onChange={(e) => update("padding", e.target.value)}
                        style={S.select}
                    >
                        {SPACING_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </Field>
            </Group>

            <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                {mode === "checkout" ? "In checkout, colours and borders follow your Shopify branding. Only these layout tokens are configurable here." : "Colours and borders follow  your cart drawer theme.Only these layout tokens are configurable here."}

            </span>
        </div>
    );
}