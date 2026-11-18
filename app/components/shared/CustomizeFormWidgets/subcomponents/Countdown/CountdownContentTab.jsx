import { S } from "../formStyles";
import { Field, Group } from "../FormControls";

const EXPIRATION_OPTIONS = [
    { label: "Show expired text", value: "show_expired_text" },
    { label: "Hide countdown", value: "hide_countdown" },
];

export function CountdownContentTab({ theme, update }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Visibility">
                <Field label="Enable countdown">
                    <input
                        type="checkbox"
                        checked={theme.enabled}
                        onChange={(e) => update("enabled", e.target.checked)}
                    />
                </Field>
            </Group>

            <Group label="Messaging">
                <Field label="Main message">
                    <input
                        type="text"
                        value={theme.mainMessage}
                        onChange={(e) => update("mainMessage", e.target.value)}
                        style={S.textFull}
                        placeholder="e.g. Hurry up!! Limited in Stock!"
                    />
                </Field>
                <Field label="Item cart message">
                    <input
                        type="text"
                        value={theme.itemCartMessage}
                        onChange={(e) => update("itemCartMessage", e.target.value)}
                        style={S.textFull}
                        placeholder="e.g. Item in your cart is reserved for:"
                    />
                </Field>
            </Group>

            <Group label="Timer">
                <Field label="Duration (minutes)">
                    <input
                        type="number"
                        value={theme.countdownDuration}
                        onChange={(e) => update("countdownDuration", Number(e.target.value))}
                        style={{ ...S.textFull, width: "80px" }}
                    />
                </Field>
                <Field label="Expiration behavior">
                    <select
                        value={theme.expirationBehavior}
                        onChange={(e) => update("expirationBehavior", e.target.value)}
                        style={S.select}
                    >
                        {EXPIRATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </Field>
            </Group>

            <Group label="Extended time (after expiry)">
                <Field label="Heading">
                    <input
                        type="text"
                        value={theme.extendedTimeHeading}
                        onChange={(e) => update("extendedTimeHeading", e.target.value)}
                        style={S.textFull}
                        placeholder="e.g. Time Extended 🔥"
                    />
                </Field>
                <Field label="Message">
                    <input
                        type="text"
                        value={theme.extendedTimeMessage}
                        onChange={(e) => update("extendedTimeMessage", e.target.value)}
                        style={S.textFull}
                        placeholder="e.g. Items in your cart are reserved for:"
                    />
                </Field>
                <Field label="Extended time (seconds)">
                    <input
                        type="number"
                        value={theme.extendedTime}
                        onChange={(e) => update("extendedTime", Number(e.target.value))}
                        style={{ ...S.textFull, width: "80px" }}
                    />
                </Field>
            </Group>
        </div>
    );
}