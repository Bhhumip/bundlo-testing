import { Field, Group } from "../FormControls";

export function DiscountCodePositionTab({ theme, update }) {
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
        </div>
    );
}