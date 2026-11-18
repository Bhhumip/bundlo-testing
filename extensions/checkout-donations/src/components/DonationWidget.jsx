import { useState } from "preact/hooks";

export function DonationWidget({ theme, busy, showError, existingAmount, onDonate, onRemove }) {
    const [selectedTier, setSelectedTier] = useState(null);
    const [customAmount, setCustomAmount] = useState("");

    const activeAmount = customAmount ? parseFloat(customAmount) : selectedTier;
    const fmt = (v) => shopify.i18n.formatCurrency(v, { currency: shopify.cost.totalAmount.value.currencyCode });
    const isValidCustom =
        !customAmount ||
        (parseFloat(customAmount) >= theme.customMinAmount &&
            parseFloat(customAmount) <= theme.customMaxAmount);

    const buttonVariantToken =
        { filled: "primary", outline: "secondary", plain: "plain" }[theme.buttonVariant] ?? "secondary";

    function selectTier(amount) {
        setSelectedTier(amount);
        setCustomAmount("");
    }

    return (
        <s-stack gap="small">

            {/* Header — divider + icon + label, sits outside any card,
                same treatment as "Reorder your favourites" */}
            <s-grid gridTemplateColumns="1fr auto 1fr" gap="small" alignItems="center">
                <s-divider />
                <s-text tone="subdued" size="small">❤ Donation</s-text>
                <s-divider />
            </s-grid>

            {/* Headline sits outside the card, like the reference's section title */}
            <s-stack gap="none">
                <s-heading>{theme.headline}</s-heading>
                {theme.subheading && (
                    <s-text tone="subdued" size="small">{theme.subheading}</s-text>
                )}
            </s-stack>

            {!existingAmount && (
                <>
                    {/* Tier cards — each amount is its own bordered, rounded card,
                        exactly like each product in the reference widget. The s-box
                        gives it card chrome; the s-button inside handles selection
                        state and click behavior, filling the card completely. */}
                    <s-grid
                        gridTemplateColumns={`repeat(${theme.donationTiers.length}, 1fr)`}
                        gap="small"
                    >
                        {theme.donationTiers.map((amt) => (
                            <s-box
                                key={amt}
                                border={selectedTier === amt ? "strong" : "base"}
                                borderRadius="large"
                                padding="none"
                                background="base"
                            >
                                <s-button
                                    variant={selectedTier === amt ? "primary" : "plain"}
                                    onClick={() => selectTier(amt)}
                                    disabled={busy}
                                    inlineSize="fill"
                                >
                                    {fmt(amt)}
                                </s-button>
                            </s-box>
                        ))}
                    </s-grid>

                    {theme.allowCustomAmount && (
                        <s-box border="base" borderRadius="large" padding="base" background="base">
                            <s-text-field
                                label="Custom amount"
                                type="number"
                                value={customAmount}
                                onInput={(e) => {
                                    setCustomAmount(e.target.value);
                                    setSelectedTier(null);
                                }}
                                error={
                                    !isValidCustom
                                        ? `Enter between ${fmt(theme.customMinAmount)} and ${fmt(theme.customMaxAmount)}`
                                        : undefined
                                }
                            />
                        </s-box>
                    )}
                </>
            )}

            {theme.impactMessage && (
                <s-text tone="subdued" size="small">✨ {theme.impactMessage}</s-text>
            )}

            {/* Bottom card — the confirmed state or the CTA. Always its own
                bordered card, matching the "card per action" language of the
                reference rather than a flat inline row. */}
            {existingAmount ? (
                <s-box border="base" borderRadius="large" padding="base" background="subdued">
                    <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
                        <s-stack gap="none">
                            <s-text size="small" tone="subdued">✓ You're donating</s-text>
                            <s-text type="strong">{fmt(existingAmount)}</s-text>
                        </s-stack>
                        <s-button variant="plain" onClick={onRemove} disabled={busy}>
                            Remove
                        </s-button>
                    </s-grid>
                </s-box>
            ) : (
                <s-box border="base" borderRadius="large" padding="none">
                    <s-button
                        variant="primary"
                        onClick={() => activeAmount && isValidCustom && onDonate(activeAmount)}
                        disabled={busy || !activeAmount || !isValidCustom}
                        inlineSize="fill"
                    >
                        {theme.ctaLabel}
                    </s-button>
                </s-box>
            )}

            {showError && (
                <s-banner tone="critical">Couldn't update your donation. Please try again.</s-banner>
            )}

        </s-stack>
    );
}

