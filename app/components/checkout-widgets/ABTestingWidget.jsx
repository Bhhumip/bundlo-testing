export function ABTestingWidget({ shop, definition }) {
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
          <s-heading>A/B Test Configuration</s-heading>
          
          <s-box padding="base" border="base" borderRadius="base" background="base">
            <s-stack gap="base">
              <s-heading size="small">Variant A</s-heading>
              <s-form-group>
                <s-label htmlFor="variant-a-name">Variant Name</s-label>
                <s-input
                  id="variant-a-name"
                  placeholder="Variant A"
                  type="text"
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="variant-a-headline">Headline</s-label>
                <s-input
                  id="variant-a-headline"
                  placeholder="Enter headline for Variant A"
                  type="text"
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="variant-a-subheading">Subheading</s-label>
                <s-textarea
                  id="variant-a-subheading"
                  placeholder="Enter subheading for Variant A"
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="variant-a-cta">CTA Label</s-label>
                <s-input
                  id="variant-a-cta"
                  placeholder="Add to cart"
                  type="text"
                />
              </s-form-group>

              <s-divider />

              <s-heading size="small">Variant B</s-heading>
              <s-form-group>
                <s-label htmlFor="variant-b-name">Variant Name</s-label>
                <s-input
                  id="variant-b-name"
                  placeholder="Variant B"
                  type="text"
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="variant-b-headline">Headline</s-label>
                <s-input
                  id="variant-b-headline"
                  placeholder="Enter headline for Variant B"
                  type="text"
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="variant-b-subheading">Subheading</s-label>
                <s-textarea
                  id="variant-b-subheading"
                  placeholder="Enter subheading for Variant B"
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="variant-b-cta">CTA Label</s-label>
                <s-input
                  id="variant-b-cta"
                  placeholder="Shop now"
                  type="text"
                />
              </s-form-group>

              <s-divider />

              <s-heading size="small">Test Settings</s-heading>
              <s-form-group>
                <s-label htmlFor="traffic-split">Traffic Split</s-label>
                <s-select id="traffic-split" value="50-50">
                  <s-option value="50-50">50% / 50%</s-option>
                  <s-option value="70-30">70% / 30%</s-option>
                  <s-option value="80-20">80% / 20%</s-option>
                  <s-option value="90-10">90% / 10%</s-option>
                </s-select>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="test-duration">Test Duration (days)</s-label>
                <s-input
                  id="test-duration"
                  placeholder="7"
                  type="number"
                  value="7"
                />
              </s-form-group>

              <s-form-group>
                <s-checkbox id="auto-winner">
                  <s-text>Automatically activate winning variant</s-text>
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
            <s-stack gap="base">
              <s-heading size="small">Experiment is active</s-heading>
              <s-text color="subdued">Compare variants to improve checkout conversion.</s-text>
              
              <s-stack direction="inline" gap="base">
                <s-box padding="small" border="base" borderRadius="base" background="subdued">
                  <s-stack gap="small">
                    <s-text size="small" weight="bold">Variant A (50%)</s-text>
                    <s-paragraph size="small">Variant A headline...</s-paragraph>
                  </s-stack>
                </s-box>
                
                <s-box padding="small" border="base" borderRadius="base" background="subdued">
                  <s-stack gap="small">
                    <s-text size="small" weight="bold">Variant B (50%)</s-text>
                    <s-paragraph size="small">Variant B headline...</s-paragraph>
                  </s-stack>
                </s-box>
              </s-stack>

              <s-button tone="info">View variants</s-button>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </>
  );
}

