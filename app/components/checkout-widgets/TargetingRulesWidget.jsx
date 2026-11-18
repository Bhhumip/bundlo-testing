export function TargetingRulesWidget({ shop, definition }) {
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
          <s-heading>Targeting Configuration</s-heading>
          
          <s-box padding="base" border="base" borderRadius="base" background="base">
            <s-stack gap="base">
              <s-heading size="small">UTM Parameters</s-heading>
              <s-form-group>
                <s-label htmlFor="utm-source">UTM Source</s-label>
                <s-input
                  id="utm-source"
                  placeholder="e.g., facebook, email, organic"
                  type="text"
                />
                <s-text color="subdued" size="small">
                  Target visitors from specific traffic sources
                </s-text>
              </s-form-group>

              <s-heading size="small">Order Value Targeting</s-heading>
              <s-form-group>
                <s-label htmlFor="min-order-value">Minimum Order Value</s-label>
                <s-input
                  id="min-order-value"
                  placeholder="e.g., 50"
                  type="number"
                />
                <s-text color="subdued" size="small">
                  Only show this widget when cart value is at least this amount
                </s-text>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="max-order-value">Maximum Order Value (Optional)</s-label>
                <s-input
                  id="max-order-value"
                  placeholder="e.g., 500"
                  type="number"
                />
              </s-form-group>

              <s-heading size="small">Geographic Targeting</s-heading>
              <s-form-group>
                <s-label htmlFor="countries-csv">Countries (ISO codes)</s-label>
                <s-textarea
                  id="countries-csv"
                  placeholder="US, CA, GB, AU (comma-separated)"
                />
                <s-text color="subdued" size="small">
                  Leave empty to target all countries
                </s-text>
              </s-form-group>

              <s-heading size="small">Customer Targeting</s-heading>
              <s-form-group>
                <s-checkbox id="returning-only">
                  <s-text>Show only to returning customers</s-text>
                </s-checkbox>
              </s-form-group>

              <s-form-group>
                <s-checkbox id="new-only">
                  <s-text>Show only to new customers</s-text>
                </s-checkbox>
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
              <s-heading size="small">Smart targeting enabled</s-heading>
              <s-stack gap="small">
                <s-text size="small">
                  <strong>Targeting:</strong> US, CA | Min order: $50 | Source: facebook
                </s-text>
              </s-stack>
              <s-button tone="info">Review rules</s-button>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </>
  );
}

