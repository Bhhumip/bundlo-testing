import { S } from "../formStyles";
import { Field, Group } from "../FormControls";

export function DiscountCodeStyleTab({ theme, update }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Input">
                <Field label="Border color">
                    <input
                        type="color"
                        value={theme.inputBorderColor}
                        onChange={(e) => update("inputBorderColor", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>
                <Field label="Border radius">
                    <div style={S.rangeWrapper}>
                        <input
                            type="range"
                            min={0}
                            max={40}
                            step={1}
                            value={theme.inputBorderRadius}
                            onChange={(e) => update("inputBorderRadius", Number(e.target.value))}
                            style={{ width: "90px" }}
                        />
                        <span style={S.rangeVal}>{theme.inputBorderRadius}px</span>
                    </div>
                </Field>
                <Field label="Height">
                    <div style={S.rangeWrapper}>
                        <input
                            type="range"
                            min={32}
                            max={72}
                            step={1}
                            value={theme.inputHeight}
                            onChange={(e) => update("inputHeight", Number(e.target.value))}
                            style={{ width: "90px" }}
                        />
                        <span style={S.rangeVal}>{theme.inputHeight}px</span>
                    </div>
                </Field>
            </Group>

            <Group label="Button">
                <Field label="Background">
                    <input
                        type="color"
                        value={theme.buttonBackground}
                        onChange={(e) => update("buttonBackground", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>
                <Field label="Text color">
                    <input
                        type="color"
                        value={theme.buttonTextColor}
                        onChange={(e) => update("buttonTextColor", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>
                <Field label="Radius">
                    <div style={S.rangeWrapper}>
                        <input
                            type="range"
                            min={0}
                            max={40}
                            step={1}
                            value={theme.buttonRadius}
                            onChange={(e) => update("buttonRadius", Number(e.target.value))}
                            style={{ width: "90px" }}
                        />
                        <span style={S.rangeVal}>{theme.buttonRadius}px</span>
                    </div>
                </Field>
            </Group>

            <Group label="Typography & spacing">
                <Field label="Font size">
                    <div style={S.rangeWrapper}>
                        <input
                            type="range"
                            min={12}
                            max={24}
                            step={1}
                            value={theme.fontSize}
                            onChange={(e) => update("fontSize", Number(e.target.value))}
                            style={{ width: "90px" }}
                        />
                        <span style={S.rangeVal}>{theme.fontSize}px</span>
                    </div>
                </Field>
                <Field label="Gap (input/button)">
                    <div style={S.rangeWrapper}>
                        <input
                            type="range"
                            min={0}
                            max={32}
                            step={1}
                            value={theme.gap}
                            onChange={(e) => update("gap", Number(e.target.value))}
                            style={{ width: "90px" }}
                        />
                        <span style={S.rangeVal}>{theme.gap}px</span>
                    </div>
                </Field>
            </Group>

            <Group label="Message colors">
                <Field label="Success">
                    <input
                        type="color"
                        value={theme.successColor}
                        onChange={(e) => update("successColor", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>
                <Field label="Error">
                    <input
                        type="color"
                        value={theme.errorColor}
                        onChange={(e) => update("errorColor", e.target.value)}
                        style={S.colorInput}
                    />
                </Field>
            </Group>
        </div>
    );
}