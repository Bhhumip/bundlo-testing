export function PriceSection({ price, setPrice, currencySymbol = "$" }) {
    return (
        <s-section heading="Price">
            <s-text-field
                label="Base Price"
                type="number"
                value={price}
                prefix={currencySymbol}
                min="0"
                placeholder="Enter bundle base price"
                onInput={(e) => setPrice(e.detail?.value ?? e.target.value)}
                help-text="Optional: Set a manual base price for the bundle."
            />
        </s-section>
    );
}