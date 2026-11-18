export function DownsellFunnelWidget({ shop, definition }) {
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
                <s-label htmlFor="fallback-product-ids">Fallback Product IDs</s-label>
                <s-input
                  id="fallback-product-ids"
                  placeholder="Enter product IDs separated by commas"
                  type="text"
                />
                <s-text color="subdued" size="small">
                  Products to offer as a lower-priced fallback
                </s-text>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="trigger-rule">Trigger Rule</s-label>
                <s-select id="trigger-rule" value="after_decline">
                  <s-option value="after_decline">After Primary Offer Decline</s-option>
                  <s-option value="after_timeout">After Timeout</s-option>
                  <s-option value="on_page_load">On Page Load</s-option>
                </s-select>
                <s-text color="subdued" size="small">
                  When should the downsell offer appear?
                </s-text>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="headline">Headline</s-label>
                <s-input
                  id="headline"
                  placeholder="Prefer a lighter option?"
                  type="text"
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="subheading">Subheading</s-label>
                <s-textarea
                  id="subheading"
                  placeholder="Use a downsell path when shoppers skip the primary offer."
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="cta-label">CTA Label</s-label>
                <s-input
                  id="cta-label"
                  placeholder="Choose this instead"
                  type="text"
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="discount">Discount (Optional)</s-label>
                <s-input
                  id="discount"
                  placeholder="e.g., 10% or $5"
                  type="text"
                />
                <s-text color="subdued" size="small">
                  Apply a discount to make the downsell more compelling
                </s-text>
              </s-form-group>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-heading>Preview</s-heading>
          <s-box padding="base" border="base" borderRadius="base" background="base" tone="warning">
            <s-stack gap="small">
              <s-heading size="small">Prefer a lighter option?</s-heading>
              <s-paragraph>Use a downsell path when shoppers skip the primary offer.</s-paragraph>
              <s-button tone="warning">Choose this instead</s-button>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </>
  );
}

