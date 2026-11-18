export function PaymentMethodRulesWidget({ shop, definition }) {
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
          <s-heading>Payment Method Rules</s-heading>
          
          <s-box padding="base" border="base" borderRadius="base" background="base">
            <s-stack gap="base">
              <s-form-group>
                <s-label htmlFor="methods">Eligible Payment Methods</s-label>
                <s-textarea
                  id="methods"
                  placeholder="Credit Card, PayPal, Apple Pay, Google Pay (comma-separated)"
                />
                <s-text color="subdued" size="small">
                  Enter payment method names or leave empty to apply to all methods
                </s-text>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="rule-type">Rule Type</s-label>
                <s-select id="rule-type" value="include">
                  <s-option value="include">Show widget for these methods</s-option>
                  <s-option value="exclude">Hide widget for these methods</s-option>
                </s-select>
              </s-form-group>

              <s-form-group>
                <s-label>Payment Method Incentives (Optional)</s-label>
                <s-stack gap="small">
                  <s-form-group>
                    <s-label htmlFor="cc-incentive">Credit Card Incentive</s-label>
                    <s-input
                      id="cc-incentive"
                      placeholder="e.g., 2% cashback"
                      type="text"
                    />
                  </s-form-group>

                  <s-form-group>
                    <s-label htmlFor="paypal-incentive">PayPal Incentive</s-label>
                    <s-input
                      id="paypal-incentive"
                      placeholder="e.g., $5 off with PayPal"
                      type="text"
                    />
                  </s-form-group>
                </s-stack>
              </s-form-group>

              <s-heading size="small">Widget Messaging</s-heading>
              <s-form-group>
                <s-label htmlFor="headline">Headline</s-label>
                <s-input
                  id="headline"
                  placeholder="Payment-based logic active"
                  type="text"
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="subheading">Subheading</s-label>
                <s-textarea
                  id="subheading"
                  placeholder="Personalize checkout offers based on payment selection."
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
              <s-heading size="small">Payment-based logic active</s-heading>
              <s-paragraph color="subdued">Personalize checkout offers based on payment selection.</s-paragraph>
              <s-button tone="info">Review logic</s-button>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </>
  );
}

