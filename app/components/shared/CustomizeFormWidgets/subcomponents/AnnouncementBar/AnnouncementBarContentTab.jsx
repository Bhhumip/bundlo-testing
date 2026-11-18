import { S } from "../formStyles";
import { Field, Group } from "../FormControls";

export function AnnouncementBarContentTab({ theme, update }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Announcement Bar">
                <Field label="Enable">
                    <input
                        type="checkbox"
                        checked={theme.enableBar}
                        onChange={(e) => update("enableBar", e.target.checked)}
                    />
                </Field>

                <Field label="Number of Messages">
                    <input
                        type="number"
                        min="1"
                        max="5"
                        value={theme.messageCount}
                        onChange={(e) =>
                            update(
                                "messageCount",
                                Math.min(5, Math.max(1, Number(e.target.value)))
                            )
                        }
                    />
                </Field>

                <Field label="Message 1">
                    <input
                        type="text"
                        value={theme.text1}
                        onChange={(e) => update("text1", e.target.value)}
                        style={S.textFull}
                    />
                </Field>

                {theme.messageCount >= 2 && (
                    <Field label="Message 2">
                        <input
                            type="text"
                            value={theme.text2}
                            onChange={(e) => update("text2", e.target.value)}
                            style={S.textFull}
                        />
                    </Field>
                )}

                {theme.messageCount >= 3 && (
                    <Field label="Message 3">
                        <input
                            type="text"
                            value={theme.text3}
                            onChange={(e) => update("text3", e.target.value)}
                            style={S.textFull}
                        />
                    </Field>
                )}

                {theme.messageCount >= 4 && (
                    <Field label="Message 4">
                        <input
                            type="text"
                            value={theme.text4}
                            onChange={(e) => update("text4", e.target.value)}
                            style={S.textFull}
                        />
                    </Field>
                )}

                {theme.messageCount >= 5 && (
                    <Field label="Message 5">
                        <input
                            type="text"
                            value={theme.text5}
                            onChange={(e) => update("text5", e.target.value)}
                            style={S.textFull}
                        />
                    </Field>
                )}

                <Field label="Enable Auto Scroll">
                    <input
                        type="checkbox"
                        checked={theme.enableScroll}
                        onChange={(e) => update("enableScroll", e.target.checked)}
                    />
                </Field>
            </Group>

            <Group label="Visibility">
                <Field label="Show on Home Page">
                    <input
                        type="checkbox"
                        checked={theme.showHome}
                        onChange={(e) => update("showHome", e.target.checked)}
                    />
                </Field>

                <Field label="Show on Cart Page">
                    <input
                        type="checkbox"
                        checked={theme.showCart}
                        onChange={(e) => update("showCart", e.target.checked)}
                    />
                </Field>

                <Field label="Show in Cart Drawer">
                    <input
                        type="checkbox"
                        checked={theme.showCartDrawer}
                        onChange={(e) => update("showCartDrawer", e.target.checked)}
                    />
                </Field>
            </Group>
        </div>
    );
}
