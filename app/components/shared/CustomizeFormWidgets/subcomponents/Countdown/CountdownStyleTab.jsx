import { S } from "../formStyles";
import { Field, Group } from "../FormControls";

const BORDER_STYLE_OPTIONS = ["solid", "dashed", "dotted", "none"];

export function CountdownStyleTab({ theme, update }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Colors">
                <Field label="Message text">
                    <input
                        type="color"
                        value={theme.messageTextColor}
                        onChange={(e) => update("messageTextColor", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>
                <Field label="Background">
                    <input
                        type="color"
                        value={theme.backgroundColor}
                        onChange={(e) => update("backgroundColor", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>
                <Field label="Timer">
                    <input
                        type="color"
                        value={theme.timerColor}
                        onChange={(e) => update("timerColor", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>
            </Group>

            <Group label="Font">
                <Field label="Size">
                    <div style={S.rangeWrapper}>
                        <input
                            type="range"
                            min={8}
                            max={72}
                            step={1}
                            value={theme.fontSize}
                            onChange={(e) => update("fontSize", Number(e.target.value))}
                            style={{ width: "90px" }}
                        />
                        <span style={S.rangeVal}>{theme.fontSize}px</span>
                    </div>
                </Field>
                <Field label="Bold">
                    <input
                        type="checkbox"
                        checked={theme.fontBold}
                        onChange={(e) => update("fontBold", e.target.checked)}
                    />
                </Field>
            </Group>

            <Group label="Border">
                <Field label="Style">
                    <select
                        value={theme.borderStyle}
                        onChange={(e) => update("borderStyle", e.target.value)}
                        style={S.select}
                    >
                        {BORDER_STYLE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Width">
                    <div style={S.rangeWrapper}>
                        <input
                            type="range"
                            min={0}
                            max={20}
                            step={1}
                            value={theme.borderWidth}
                            onChange={(e) => update("borderWidth", Number(e.target.value))}
                            style={{ width: "90px" }}
                        />
                        <span style={S.rangeVal}>{theme.borderWidth}px</span>
                    </div>
                </Field>
                <Field label="Radius">
                    <div style={S.rangeWrapper}>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={theme.borderRadius}
                            onChange={(e) => update("borderRadius", Number(e.target.value))}
                            style={{ width: "90px" }}
                        />
                        <span style={S.rangeVal}>{theme.borderRadius}px</span>
                    </div>
                </Field>
                <Field label="Color">
                    <input
                        type="color"
                        value={theme.borderColor}
                        onChange={(e) => update("borderColor", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>
            </Group>

            <Group label="Spacing">
                <Field label="Padding">
                    <div style={S.rangeWrapper}>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={theme.padding}
                            onChange={(e) => update("padding", Number(e.target.value))}
                            style={{ width: "90px" }}
                        />
                        <span style={S.rangeVal}>{theme.padding}px</span>
                    </div>
                </Field>
                <Field label="Margin">
                    <div style={S.rangeWrapper}>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={theme.margin}
                            onChange={(e) => update("margin", Number(e.target.value))}
                            style={{ width: "90px" }}
                        />
                        <span style={S.rangeVal}>{theme.margin}px</span>
                    </div>
                </Field>
            </Group>



            <Group label="Custom CSS">
                <textarea
                    value={theme.customCSS}
                    onChange={(e) => update("customCSS", e.target.value)}
                    rows={4}
                    style={S.textarea}
                    placeholder=".countdown-widget { font-family: serif; }"
                />
                <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                    Applied to the countdown widget wrapper on checkout.
                </span>
            </Group>
        </div>
    );
}