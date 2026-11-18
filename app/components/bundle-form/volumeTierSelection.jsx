export function VolumeTierSection({
    tiers,
    addTier,
    updateTier,
    removeTier,
    errors,
    currencySymbol,
}) {
    return (
        <s-section heading="Discount tiers">
            <s-stack direction="block" gap="base">
                <s-paragraph tone="subdued">
                    Set the quantity thresholds and discounts. Each tier activates
                    when the customer adds that many or more units.
                </s-paragraph>

                {errors.volumeTiers && (
                    <s-banner tone="critical">
                        <s-paragraph>{errors.volumeTiers}</s-paragraph>
                    </s-banner>
                )}

                {tiers.map((tier, index) => (
                    <s-box
                        key={index}
                        padding="base"
                        borderWidth="base"
                        borderRadius="base"
                        background="subdued"
                    >
                        <s-stack direction="inline" gap="base">
                            <s-text-field
                                label="Min qty"
                                type="number"
                                value={String(tier.minQuantity)}
                                min="1"
                                style={{ width: "80px" }}
                                onInput={(e) => updateTier(index, "minQuantity", e.target.value)}
                            />
                            <s-select
                                label="Discount type"
                                value={tier.discountType}
                                onChange={(e) => updateTier(index, "discountType", e.target.value)}
                            >
                                <s-option value="PERCENTAGE">% off</s-option>
                                <s-option value="FIXED_AMOUNT">{currencySymbol} off per unit</s-option>
                            </s-select>
                            <s-text-field
                                label="Value"
                                type="number"
                                value={String(tier.discountValue)}
                                min="0"
                                style={{ width: "80px" }}
                                onInput={(e) => updateTier(index, "discountValue", e.target.value)}
                            />
                            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "4px" }}>
                                <s-button
                                    variant="tertiary"
                                    tone="critical"
                                    onClick={() => removeTier(index)}
                                >
                                    Remove
                                </s-button>
                            </div>
                        </s-stack>
                    </s-box>
                ))}

                <s-button variant="secondary" onClick={addTier}>
                    Add tier
                </s-button>
            </s-stack>
        </s-section>
    );
}