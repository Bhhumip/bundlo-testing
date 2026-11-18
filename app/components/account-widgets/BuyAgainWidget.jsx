export function BuyAgainWidget({ funnel, definition }) {
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
          <s-heading>Buy Again Configuration</s-heading>
          <s-box padding="base" border="base" borderRadius="base" background="base">
            <s-stack gap="base">
              <s-form-group>
                <s-label htmlFor="max-products">Maximum products</s-label>
                <s-input id="max-products" type="number" placeholder="8" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="lookback-days">Lookback days</s-label>
                <s-input id="lookback-days" type="number" placeholder="365" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="headline">Headline</s-label>
                <s-input id="headline" type="text" placeholder="Buy again" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="subheading">Subheading</s-label>
                <s-textarea id="subheading" placeholder="Easily repurchase items you've ordered before." />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="cta-label">CTA label</s-label>
                <s-input id="cta-label" type="text" placeholder="Add to cart" />
              </s-form-group>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </>
  );
}
