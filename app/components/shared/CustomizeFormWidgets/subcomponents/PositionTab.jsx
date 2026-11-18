// PositionTab.jsx — the "Position" tab of the widget customize form
import { S } from "./formStyles";
import { Field, Group } from "./FormControls";

export function PositionTab({ mode, theme, update }) {
    const isCheckout = mode === "checkout";
    const isHorizontal = theme.layoutDirection === "horizontal";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Product Layout">
                <Field label="Direction">
                    <select
                        value={theme.layoutDirection}
                        onChange={(e) => update("layoutDirection", e.target.value)}
                        style={S.select}
                    >
                        <option value="vertical">Vertical (stacked)</option>
                        <option value="horizontal">Horizontal (row)</option>
                        <option value="grid">Grid</option>
                    </select>
                </Field>

                <Field label="Items per row">
                    <select
                        value={Number(theme.itemsPerRow)}
                        onChange={(e) => update("itemsPerRow", Number(e.target.value))}
                        style={S.select}
                    >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                    </select>
                </Field>
            </Group>

            <Group label="Spacing & sizing">
                <Field label="Gap spacing">
                    <select
                        value={theme.gap}
                        onChange={(e) => update("gap", e.target.value)}
                        style={S.select}
                    >
                        <option value="tight">Tight</option>
                        <option value="normal">Normal</option>
                        <option value="loose">Loose</option>
                    </select>
                </Field>
                <Field label="Inner padding">
                    <div style={S.rangeWrapper}>
                        <input
                            type="range"
                            min={4}
                            max={32}
                            step={2}
                            value={theme.padding}
                            onChange={(e) => update("padding", Number(e.target.value))}
                            style={{ width: "90px" }}
                        />
                        <span style={S.rangeVal}>{theme.padding}px</span>
                    </div>
                </Field>
                <Field label="Image ratio">
                    <select
                        value={theme.imageRatio}
                        onChange={(e) => update("imageRatio", e.target.value)}
                        style={S.select}
                    >
                        <option value="1:1">1:1 Square</option>
                        <option value="4:5">4:5 Vertical</option>
                        <option value="16:9">16:9 Wide</option>
                    </select>
                </Field>
            </Group>

            <Group label="Outer Alignment (Widget)">
                <Field label="Widget align">
                    <select
                        value={theme.alignment}
                        onChange={(e) => update("alignment", e.target.value)}
                        style={S.select}
                    >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                    </select>
                </Field>

                <Field label="Max width">
                    <select
                        value={theme.widgetMaxWidth}
                        onChange={(e) => update("widgetMaxWidth", e.target.value)}
                        style={S.select}
                    >
                        <option value="100%">Full width</option>
                        <option value="420px">Compact (420px)</option>
                        <option value="320px">Narrow (320px)</option>
                    </select>
                </Field>
            </Group>

            <Group label="Inner Alignment (Cards)">
                <Field label="Card alignment">
                    <select
                        value={theme.cardAlignment}
                        onChange={(e) => update("cardAlignment", e.target.value)}
                        style={S.select}
                    >
                        <option value="top">Top (Compact)</option>
                        <option value="stretch">Stretch (Equal Height)</option>
                    </select>
                </Field>
                <Field label="Card text align">
                    <select
                        value={theme.textAlignment}
                        onChange={(e) => update("textAlignment", e.target.value)}
                        style={S.select}
                    >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                    </select>
                </Field>
            </Group>

            {/* <Group label="Mobile">
                <Field label="Layout on mobile">
                    <select
                        value={theme.mobileLayout}
                        onChange={(e) => update("mobileLayout", e.target.value)}
                        style={S.select}
                    >
                        <option value="stack">Stack (one per row)</option>
                        <option value="scroll">Horizontal scroll</option>
                    </select>
                </Field>
            </Group> */}

            {/* {isHorizontal && (
                <Group label="Horizontal scroll">
                    <Field label="Show arrows">
                        <input
                            type="checkbox"
                            checked={theme.showScrollArrows}
                            onChange={(e) => update("showScrollArrows", e.target.checked)}
                        />
                    </Field>
                </Group>
            )} */}

            {isCheckout && (
                <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                    In checkout, widget placement is controlled by the Shopify checkout editor.
                    These controls adjust the internal layout of this widget only.
                </span>
            )}
        </div>
    );
}