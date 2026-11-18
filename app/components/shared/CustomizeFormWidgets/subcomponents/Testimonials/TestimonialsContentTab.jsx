import { S } from "../formStyles";
import { Field, Group } from "../FormControls";

export function TestimonialsContentTab({ theme, update }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Title">
                <Field label="Title size">
                    <select
                        value={theme.titleSize}
                        onChange={(e) => update("titleSize", Number(e.target.value))}
                        style={S.select}
                    >
                        <option value={11}>Small</option>
                        <option value={13}>Medium</option>
                        <option value={15}>Large</option>
                    </select>
                </Field>
            </Group>

            <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                In checkout, text colors and fonts are controlled by your Shopify checkout branding.
            </span>

            <Group label="JudgeMe API">
                <Field label="Private JudgeMe Token">
                    <input
                        type="text"
                        value={theme.judgeMePrivateToken ?? ""}
                        onChange={(e) => update("judgeMePrivateToken", e.target.value)}
                        style={S.textFull}
                        placeholder="Enter private JudgeMe token"
                    />
                </Field>
                <Field label="Public JudgeMe Token">
                    <input
                        type="text"
                        value={theme.judgeMePublicToken ?? ""}
                        onChange={(e) => update("judgeMePublicToken", e.target.value)}
                        style={S.textFull}
                        placeholder="Enter public JudgeMe token"
                    />
                </Field>
            </Group>
        </div>
    );
}