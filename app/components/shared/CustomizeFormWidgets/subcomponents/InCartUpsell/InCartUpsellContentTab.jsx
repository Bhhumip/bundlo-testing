import { S } from "../formStyles";
import { Field, Group } from "../FormControls";

export function InCartUpsellContentTab({ theme, update }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Products">
                <Field label="Product IDs">
                    <input
                        type="text"
                        value={theme.productIds}
                        onChange={(e) => update("productIds", e.target.value)}
                        style={S.textFull}
                        placeholder="e.g. 111,222,333"
                    />
                </Field>

                <Field label="Maximum products">
                    <input
                        type="number"
                        min="1"
                        value={theme.maxProducts}
                        onChange={(e) =>
                            update("maxProducts", Number(e.target.value))
                        }
                        style={{ ...S.textFull, width: "100px" }}
                    />
                </Field>
            </Group>

            <Group label="Messaging">
                <Field label="Headline">
                    <input
                        type="text"
                        value={theme.headline}
                        onChange={(e) => update("headline", e.target.value)}
                        style={S.textFull}
                        placeholder="You may also like"
                    />
                </Field>

                <Field label="Subheading">
                    <textarea
                        value={theme.subheading}
                        onChange={(e) => update("subheading", e.target.value)}
                        style={S.textarea}
                        rows={3}
                        placeholder="Recommend relevant add-ons before checkout."
                    />
                </Field>
            </Group>
        </div>
    );
}