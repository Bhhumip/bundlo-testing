import { S } from "../formStyles";
import { Field, Group } from "../FormControls";

export function CountdownPositionTab({ theme, update }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Placement">
                <Field label="Show on cart page">
                    <input
                        type="checkbox"
                        checked={theme.showOnCartPage}
                        onChange={(e) => update("showOnCartPage", e.target.checked)}
                    />
                </Field>
                <Field label="Show in cart drawer">
                    <input
                        type="checkbox"
                        checked={theme.showInCartDrawer}
                        onChange={(e) => update("showInCartDrawer", e.target.checked)}
                    />
                </Field>
            </Group>

            <Group label="Cart page position">
                <Field label="Top (%)">
                    <div style={S.rangeWrapper}>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={theme.cartPageTopPosition}
                            onChange={(e) => update("cartPageTopPosition", Number(e.target.value))}
                            style={{ width: "90px" }}
                        />
                        <span style={S.rangeVal}>{theme.cartPageTopPosition}%</span>
                    </div>
                </Field>
                <Field label="Left (%)">
                    <div style={S.rangeWrapper}>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={theme.cartPageLeftPosition}
                            onChange={(e) => update("cartPageLeftPosition", Number(e.target.value))}
                            style={{ width: "90px" }}
                        />
                        <span style={S.rangeVal}>{theme.cartPageLeftPosition}%</span>
                    </div>
                </Field>
            </Group>
        </div>
    );
}