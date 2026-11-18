// LayoutTab.jsx — the "Layout" tab of the widget customize form
import { S } from "./formStyles";
import { Field, Group } from "./FormControls";

export function LayoutTab({ mode, theme, update }) {
    const isCheckout = mode === "checkout";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Button">
                <Field label="Style">
                    <select
                        value={theme.buttonVariant}
                        onChange={(e) => update("buttonVariant", e.target.value)}
                        style={S.select}
                    >
                        <option value="filled">Primary</option>
                        <option value="outline">Secondary</option>
                        {/* <option value="plain">Subtle</option> */}
                    </select>
                </Field>

                {!isCheckout && (
                    <>
                        <Field label="Color (Storefront)">
                            <input
                                type="color"
                                value={theme.buttonColor}
                                onChange={(e) => update("buttonColor", e.target.value)}
                                style={S.colorInput}
                            />
                        </Field>
                        <Field label="Radius (Storefront)">
                            <div style={S.rangeWrapper}>
                                <input
                                    type="range"
                                    min={0}
                                    max={20}
                                    step={2}
                                    value={theme.buttonRadius}
                                    onChange={(e) => update("buttonRadius", Number(e.target.value))}
                                    style={{ width: "90px" }}
                                />
                                <span style={S.rangeVal}>{theme.buttonRadius}px</span>
                            </div>
                        </Field>
                    </>
                )}
            </Group>

            <Group label="Image">
                <Field label="Radius">
                    <select
                        value={theme.imageRadius}
                        onChange={(e) => update("imageRadius", Number(e.target.value))}
                        style={S.select}
                    >
                        <option value={0}>Sharp</option>
                        <option value={6}>Soft</option>
                        <option value={10}>Rounded</option>
                        <option value={9999}>Circle</option>
                    </select>
                </Field>
                <Field label="Size">
                    <select
                        value={theme.imageSize}
                        onChange={(e) => update("imageSize", Number(e.target.value))}
                        style={S.select}
                    >
                        <option value={40}>Small</option>
                        <option value={52}>Medium</option>
                        <option value={68}>Large</option>
                    </select>
                </Field>
            </Group>

            <Group label="Show / Hide">
                <Field label="Price">
                    <input
                        type="checkbox"
                        checked={theme.showPrice}
                        onChange={(e) => update("showPrice", e.target.checked)}
                    />
                </Field>
                <Field label="Discount badge">
                    <input
                        type="checkbox"
                        checked={theme.showBadge}
                        onChange={(e) => update("showBadge", e.target.checked)}
                    />
                </Field>
                <Field label="Divider lines">
                    <input
                        type="checkbox"
                        checked={theme.showDivider}
                        onChange={(e) => update("showDivider", e.target.checked)}
                    />
                </Field>
            </Group>
        </div>
    );
}