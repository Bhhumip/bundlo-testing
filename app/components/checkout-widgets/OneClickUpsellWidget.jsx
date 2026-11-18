export function OneClickUpsellWidget({ shop, definition }) {
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
                <s-label htmlFor="product-ids">Product IDs</s-label>
                <s-input
                  id="product-ids"
                  placeholder="Enter product IDs separated by commas"
                  type="text"
                />
                <s-text color="subdued" size="small">
                  Comma-separated list of product IDs to upsell
                </s-text>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="max-products">Maximum Products</s-label>
                <s-input
                  id="max-products"
                  placeholder="2"
                  type="number"
                  value="2"
                />
                <s-text color="subdued" size="small">
                  Maximum number of products to show in the upsell
                </s-text>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="headline">Headline</s-label>
                <s-input
                  id="headline"
                  placeholder="Add this before you complete checkout"
                  type="text"
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="subheading">Subheading</s-label>
                <s-textarea
                  id="subheading"
                  placeholder="Show a simple one-click upsell before order completion."
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="cta-label">CTA Label</s-label>
                <s-input
                  id="cta-label"
                  placeholder="Add now"
                  type="text"
                />
              </s-form-group>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-heading>Preview</s-heading>
          <s-box padding="base" border="base" borderRadius="base" background="base">
            <s-stack gap="small">
              <s-heading size="small">Add this before you complete checkout</s-heading>
              <s-paragraph>Show a simple one-click upsell before order completion.</s-paragraph>
              <s-button>Add now</s-button>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </>
  );
}

