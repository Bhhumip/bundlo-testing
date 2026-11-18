export function ShippingMethodRulesWidget({ shop, definition }) {
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
          <s-heading>Shipping Method Rules</s-heading>
          
          <s-box padding="base" border="base" borderRadius="base" background="base">
            <s-stack gap="base">
              <s-form-group>
                <s-label htmlFor="methods">Eligible Shipping Methods</s-label>
                <s-textarea
                  id="methods"
                  placeholder="Standard Shipping, Express Shipping, Free Shipping (comma-separated)"
                />
                <s-text color="subdued" size="small">
                  Enter shipping method names or leave empty to apply to all methods
                </s-text>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="rule-type">Rule Type</s-label>
                <s-select id="rule-type" value="include">
                  <s-option value="include">Show widget for these methods</s-option>
                  <s-option value="exclude">Hide widget for these methods</s-option>
                </s-select>
              </s-form-group>

              <s-heading size="small">Widget Behavior</s-heading>
              <s-form-group>
                <s-checkbox id="adjust-offer">
                  <s-text>Adjust offer based on shipping cost</s-text>
                </s-checkbox>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="headline">Headline</s-label>
                <s-input
                  id="headline"
                  placeholder="Shipping-based logic active"
                  type="text"
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="subheading">Subheading</s-label>
                <s-textarea
                  id="subheading"
                  placeholder="Customize checkout offers by delivery method."
                />
              </s-form-group>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-heading>Preview</s-heading>
          <s-box padding="base" border="base" borderRadius="base" background="base" tone="info">
            <s-stack gap="small">
              <s-heading size="small">Shipping-based logic active</s-heading>
              <s-paragraph color="subdued">Customize checkout offers by delivery method.</s-paragraph>
              <s-button tone="info">Review logic</s-button>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </>
  );
}

