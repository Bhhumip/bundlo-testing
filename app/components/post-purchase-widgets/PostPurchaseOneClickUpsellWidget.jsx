export function PostPurchaseOneClickUpsellWidget({ funnel, definition }) {
  return (
    <>
      <s-section>
        <s-stack gap="base">
          <s-heading>{definition.title}</s-heading>
          <s-paragraph color="subdued">{definition.description}</s-paragraph>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-heading>Upsell Settings</s-heading>
          <s-box padding="base" border="base" borderRadius="base" background="base">
            <s-stack gap="base">
              <s-form-group>
                <s-label htmlFor="product-id">Product ID</s-label>
                <s-input id="product-id" type="text" placeholder="123" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="max-quantity">Max quantity</s-label>
                <s-input id="max-quantity" type="number" placeholder="1" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="headline">Headline</s-label>
                <s-input id="headline" type="text" placeholder="Upgrade your order in one click" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="subheading">Subheading</s-label>
                <s-textarea id="subheading" placeholder="Add a high-value offer without re-entering payment details." />
              </s-form-group>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </>
  );
}
