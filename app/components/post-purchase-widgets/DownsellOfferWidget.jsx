export function DownsellOfferWidget({ funnel, definition }) {
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
          <s-heading>Downsell Offer Settings</s-heading>
          <s-box padding="base" border="base" borderRadius="base" background="base">
            <s-stack gap="base">
              <s-form-group>
                <s-label htmlFor="product-id">Product ID</s-label>
                <s-input id="product-id" type="text" placeholder="123" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="trigger-rule">Trigger rule</s-label>
                <s-select id="trigger-rule" value="after_upsell_decline">
                  <s-option value="after_upsell_decline">After upsell decline</s-option>
                  <s-option value="after_timeout">After timeout</s-option>
                </s-select>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="headline">Headline</s-label>
                <s-input id="headline" type="text" placeholder="Prefer a lighter option?" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="subheading">Subheading</s-label>
                <s-textarea id="subheading" placeholder="Offer a lower-priced fallback after the main upsell is declined." />
              </s-form-group>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </>
  );
}
