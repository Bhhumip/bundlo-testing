import { S } from "../formStyles";
import { Field, Group } from "../FormControls";

const POSITION_OPTIONS = [
    { label: "Top of cart", value: "top" },
    { label: "Above subtotal", value: "subtotal" },
    { label: "Above checkout button", value: "checkout" },
];

export function DiscountCodeContentTab({ theme, update }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Visibility">
                <Field label="Enable field">
                    <input
                        type="checkbox"
                        checked={theme.enabled}
                        onChange={(e) => update("enabled", e.target.checked)}
                    />
                </Field>
            </Group>

            <Group label="Labels">
                <Field label="Heading">
                    <input
                        type="text"
                        value={theme.heading}
                        onChange={(e) => update("heading", e.target.value)}
                        style={S.textFull}
                        placeholder="e.g. Have a discount code?"
                    />
                </Field>
                <Field label="Input placeholder">
                    <input
                        type="text"
                        value={theme.placeholder}
                        onChange={(e) => update("placeholder", e.target.value)}
                        style={S.textFull}
                        placeholder="e.g. Enter code"
                    />
                </Field>
                <Field label="Button label">
                    <input
                        type="text"
                        value={theme.buttonLabel}
                        onChange={(e) => update("buttonLabel", e.target.value)}
                        style={S.textFull}
                        placeholder="e.g. Apply"
                    />
                </Field>
            </Group>

            <Group label="Messages">
                <Field label="Success message">
                    <input
                        type="text"
                        value={theme.successMessage}
                        onChange={(e) => update("successMessage", e.target.value)}
                        style={S.textFull}
                        placeholder="e.g. Discount applied!"
                    />
                </Field>
                <Field label="Error message">
                    <input
                        type="text"
                        value={theme.errorMessage}
                        onChange={(e) => update("errorMessage", e.target.value)}
                        style={S.textFull}
                        placeholder="e.g. Invalid discount code"
                    />
                </Field>
            </Group>

            <Group label="Placement in cart">
                <Field label="Insert position">
                    <select
                        value={theme.insertPosition}
                        onChange={(e) => update("insertPosition", e.target.value)}
                        style={S.select}
                    >
                        {POSITION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </Field>
            </Group>
        </div>
    );
}