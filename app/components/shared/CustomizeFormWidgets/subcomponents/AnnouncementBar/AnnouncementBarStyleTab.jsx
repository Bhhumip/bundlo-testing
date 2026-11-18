import { S } from "../formStyles";
import { Field, Group } from "../FormControls";

export function AnnouncementBarStyleTab({ theme, update }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Colors">
                <Field label="Background Color">
                    <input
                        type="color"
                        value={theme.bgColor}
                        onChange={(e) => update("bgColor", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>

                <Field label="Text Color">
                    <input
                        type="color"
                        value={theme.textColor}
                        onChange={(e) => update("textColor", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>
            </Group>
        </div>
    );
}
