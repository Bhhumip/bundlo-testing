// DonationsStyleTab.jsx
import { Field, Group } from "../FormControls";
import { S } from "../formStyles";

export function DonationsStyleTab({ theme, update }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Button">
                <Field label="Style">
                    <select value={theme.buttonVariant} onChange={(e) => update("buttonVariant", e.target.value)} style={S.select}>
                        <option value="filled">Primary</option>
                        <option value="outline">Secondary</option>
                        <option value="plain">Subtle</option>
                    </select>
                </Field>
            </Group>

            <Group label="Card">
                <Field label="Corner radius">
                    <select value={theme.borderRadius} onChange={(e) => update("borderRadius", e.target.value)} style={S.select}>
                        <option value="none">Sharp</option>
                        <option value="base">Soft</option>
                        <option value="large">Rounded</option>
                    </select>
                </Field>
                <Field label="Spacing">
                    <select value={theme.gap} onChange={(e) => update("gap", e.target.value)} style={S.select}>
                        <option value="tight">Tight</option>
                        <option value="base">Base</option>
                        <option value="loose">Loose</option>
                    </select>
                </Field>
            </Group>

            <span style={{ fontSize: 11, color: "#9ca3af" }}>
                In checkout, colors follow your Shopify checkout branding. Only shape and spacing are configurable here.
            </span>
        </div>
    );
}