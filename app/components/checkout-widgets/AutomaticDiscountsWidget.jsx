export function AutomaticDiscountsWidget({ shop, definition }) {
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
          <s-heading>Widget Configuration</s-heading>
          
          <s-box padding="base" border="base" borderRadius="base" background="base">
            <s-stack gap="base">
              <s-form-group>
                <s-label htmlFor="discount-code">Discount Code</s-label>
                <s-input
                  id="discount-code"
                  placeholder="e.g., SAVE10"
                  type="text"
                />
                <s-text color="subdued" size="small">
                  The discount code to automatically apply
                </s-text>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="discount-value-label">Discount Value Label</s-label>
                <s-input
                  id="discount-value-label"
                  placeholder="10% off"
                  type="text"
                />
                <s-text color="subdued" size="small">
                  How to display the discount (e.g., "10% off" or "$5 off")
                </s-text>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="headline">Headline</s-label>
                <s-input
                  id="headline"
                  placeholder="Discount applied automatically"
                  type="text"
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="subheading">Subheading</s-label>
                <s-textarea
                  id="subheading"
                  placeholder="Encourage conversion with a clear automatic discount message."
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="cta-label">CTA Label</s-label>
                <s-input
                  id="cta-label"
                  placeholder="View savings"
                  type="text"
                />
              </s-form-group>

              <s-form-group>
                <s-checkbox id="auto-apply">
                  <s-text>Automatically apply discount to cart</s-text>
                </s-checkbox>
              </s-form-group>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-heading>Preview</s-heading>
          <s-box padding="base" border="base" borderRadius="base" background="base" tone="success">
            <s-stack gap="small">
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                <s-stack gap="small">
                  <s-heading size="small">Discount applied automatically</s-heading>
                  <s-paragraph color="subdued">Encourage conversion with a clear automatic discount message.</s-paragraph>
                </s-stack>
                <s-badge tone="success">10% off</s-badge>
              </s-stack>
              <s-button tone="success">View savings</s-button>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </>
  );
}

