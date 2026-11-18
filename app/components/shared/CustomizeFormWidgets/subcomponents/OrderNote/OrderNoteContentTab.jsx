import { S } from "../formStyles";
import { Field, Group } from "../FormControls";

export function OrderNoteContentTab({ theme, update }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Messaging">
                <Field label="Label">
                    <input
                        type="text"
                        value={theme.label}
                        onChange={(e) => update("label", e.target.value)}
                        style={S.textFull}
                        placeholder="e.g. Order note"
                    />
                </Field>
                <Field label="Placeholder">
                    <input
                        type="text"
                        value={theme.placeholder}
                        onChange={(e) => update("placeholder", e.target.value)}
                        style={S.textFull}
                        placeholder="e.g. Add a note for your order"
                    />
                </Field>
            </Group>

            <Group label="Behavior">
                <Field label="Max length">
                    <input
                        type="number"
                        value={theme.maxLength}
                        onChange={(e) => update("maxLength", Number(e.target.value))}
                        style={{ ...S.textFull, width: "80px" }}
                    />
                </Field>
                <Field label="Required">
                    <input
                        type="checkbox"
                        checked={theme.required}
                        onChange={(e) => update("required", e.target.checked)}
                    />
                </Field>
                <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                    Maximum number of characters the buyer can enter.
                </span>

            </Group>
        </div>
    );
}