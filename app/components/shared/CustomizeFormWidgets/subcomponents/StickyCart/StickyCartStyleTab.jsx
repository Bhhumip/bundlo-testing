import { S } from "../formStyles";
import { Field, Group } from "../FormControls";

export function StickyCartStyleTab({ theme, update }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Sticky Cart">
                <Field label="Background Color">
                    <input
                        type="color"
                        value={theme.bgColor}
                        onChange={(e) => update("bgColor", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>

                <Field label="Button Background">
                    <input
                        type="color"
                        value={theme.buttonBg}
                        onChange={(e) => update("buttonBg", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>

                <Field label="Button Text Color">
                    <input
                        type="color"
                        value={theme.buttonText}
                        onChange={(e) => update("buttonText", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>
            </Group>
        </div>
    );
}
