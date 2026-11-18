export function DiscountSection({
    enableDiscount,
    setEnableDiscount,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    fixedPrice,
    setFixedPrice,
}) {
    return (
        <s-section heading="Discount">
            <s-stack direction="block" gap="base">

                {/* Checkbox */}
                <s-checkbox
                    label="Apply discount"
                    checked={enableDiscount}
                    onChange={(e) => {
                        const checked = e.target.checked;
                        setEnableDiscount(checked);

                        if (checked) {
                            setDiscountType("PERCENTAGE");
                            setDiscountValue("10");
                        } else {
                            setDiscountType("NONE");
                            setDiscountValue("0");
                            setFixedPrice("");
                        }
                    }}
                />

                {/* Show fields only if enabled */}
                {enableDiscount && (
                    <>
                        <s-select
                            label="Discount type"
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value)}
                        >
                            <s-option value="PERCENTAGE">Percentage off total</s-option>
                            <s-option value="FIXED_AMOUNT">Fixed amount off total</s-option>
                            <s-option value="FIXED_PRICE">Set a fixed price</s-option>
                        </s-select>

                        {discountType === "PERCENTAGE" && (
                            <s-text-field
                                label="Discount percentage"
                                type="number"
                                value={discountValue}
                                suffix="%"
                                onInput={(e) => setDiscountValue(e.target.value)}
                            />
                        )}

                        {discountType === "FIXED_AMOUNT" && (
                            <s-text-field
                                label="Amount off"
                                type="number"
                                value={discountValue}
                                prefix="$"
                                onInput={(e) => setDiscountValue(e.target.value)}
                            />
                        )}

                        {discountType === "FIXED_PRICE" && (
                            <s-text-field
                                label="Bundle price"
                                type="number"
                                value={fixedPrice}
                                prefix="$"
                                onInput={(e) => setFixedPrice(e.target.value)}
                            />
                        )}
                    </>
                )}
            </s-stack>
        </s-section>
    );
}