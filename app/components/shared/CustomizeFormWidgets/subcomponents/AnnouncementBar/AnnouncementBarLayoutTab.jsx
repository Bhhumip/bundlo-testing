import { Field, Group } from "../FormControls";

export function AnnouncementBarLayoutTab({ theme, update }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Position">
                <Field label="Home Page Position">
                    <select
                        value={theme.homePosition}
                        onChange={(e) => update("homePosition", e.target.value)}
                    >
                        <option value="top">Top</option>
                        <option value="below_header">Below Header</option>
                    </select>
                </Field>

                <Field label="Cart Page Position">
                    <select
                        value={theme.cartPosition}
                        onChange={(e) => update("cartPosition", e.target.value)}
                    >
                        <option value="top">Top</option>
                        <option value="below_header">Below Header</option>
                    </select>
                </Field>
            </Group>

            <Group label="Spacing">
                <Field label="Margin">
                    <input
                        type="number"
                        min="0"
                        max="50"
                        value={theme.margin}
                        onChange={(e) => update("margin", Number(e.target.value))}
                    />
                </Field>

                <Field label="Padding">
                    <input
                        type="number"
                        min="0"
                        max="40"
                        value={theme.padding}
                        onChange={(e) => update("padding", Number(e.target.value))}
                    />
                </Field>
            </Group>
        </div>
    );
}
