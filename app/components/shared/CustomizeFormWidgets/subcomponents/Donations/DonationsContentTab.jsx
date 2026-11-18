import { S } from "../formStyles";
import { Field, Group } from "../FormControls";
import { DonationProductPicker } from "./DonationProductPicker";

export function DonationsContentTab({ theme, update }) {
    console.log("[DonationsContentTab] rendering with theme:", theme);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <Group label="Cause">
                <Field label="Charity / cause name">
                    <input
                        type="text"
                        value={theme.charityName}
                        onChange={(e) => update("charityName", e.target.value)}
                        style={S.textFull}
                        placeholder="e.g. St. Jude Children's Research Hospital"
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
                    />
                </Field>
                <Field label="Subheading">
                    <textarea
                        value={theme.subheading}
                        onChange={(e) => update("subheading", e.target.value)}
                        rows={2}
                        style={S.textarea}
                    />
                </Field>
                <Field label="CTA label">
                    <input
                        type="text"
                        value={theme.ctaLabel}
                        onChange={(e) => update("ctaLabel", e.target.value)}
                        style={S.textFull}
                    />
                </Field>
                <Field label="Impact message (optional)">
                    <textarea
                        value={theme.impactMessage}
                        onChange={(e) => update("impactMessage", e.target.value)}
                        rows={2}
                        style={S.textarea}
                        placeholder="e.g. Your donation helps provide hope and healing to children"
                    />
                </Field>
                <Field label="Learn more URL (optional)">
                    <input
                        type="url"
                        value={theme.learnMoreUrl}
                        onChange={(e) => update("learnMoreUrl", e.target.value)}
                        style={S.textFull}
                        placeholder="https://..."
                    />
                </Field>
            </Group>

            <Group label="Donation amounts">
                <Field label="Preset tiers">
                    <input
                        type="text"
                        value={theme.donationTiers.join(",")}
                        onChange={(e) => {
                            const tiers = e.target.value
                                .split(",")
                                .map((v) => parseFloat(v.trim()))
                                .filter((n) => !Number.isNaN(n) && n > 0);
                            update("donationTiers", tiers);
                        }}
                        style={S.textFull}
                        placeholder="10,20,50"
                    />
                </Field>
                <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                    Comma-separated amounts shown as buttons at checkout.
                </span>

                <Field label="Allow custom amount">
                    <input
                        type="checkbox"
                        checked={theme.allowCustomAmount}
                        onChange={(e) => update("allowCustomAmount", e.target.checked)}
                    />
                </Field>

                {theme.allowCustomAmount && (
                    <>
                        <Field label="Minimum custom amount">
                            <input
                                type="number"
                                value={theme.customMinAmount}
                                onChange={(e) => update("customMinAmount", Number(e.target.value))}
                                style={{ ...S.textFull, width: "80px" }}
                            />
                        </Field>
                        <Field label="Maximum custom amount">
                            <input
                                type="number"
                                value={theme.customMaxAmount}
                                onChange={(e) => update("customMaxAmount", Number(e.target.value))}
                                style={{ ...S.textFull, width: "80px" }}
                            />
                        </Field>
                    </>
                )}
            </Group>

            <Group label="Product">
                <DonationProductPicker
                    value={{
                        variantId: theme.donationVariantId, title: theme.donationProductTitle, image: theme.donationProductImage
                    }}

                    onChange={(picked) => {
                        update("donationVariantId", picked.variantId);       // string, used by extension
                        update("donationProductTitle", picked.title);         // for redisplay in the picker UI
                        update("donationProductImage", picked.image);
                    }}
                />
                <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                    This product's variant gets added to cart with a price matching the donation amount.
                </span>
            </Group>
        </div>
    );
}