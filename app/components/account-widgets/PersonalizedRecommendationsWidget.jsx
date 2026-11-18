export function PersonalizedRecommendationsWidget({ funnel, definition }) {
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
          <s-heading>Recommendation Settings</s-heading>
          <s-box padding="base" border="base" borderRadius="base" background="base">
            <s-stack gap="base">
              <s-form-group>
                <s-label htmlFor="strategy">Recommendation strategy</s-label>
                <s-select id="strategy" value="account_history">
                  <s-option value="account_history">Account history</s-option>
                  <s-option value="recent_orders">Recent orders</s-option>
                  <s-option value="popular_with_similar_customers">Popular with similar customers</s-option>
                </s-select>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="fallback-product-ids">Fallback product IDs</s-label>
                <s-input id="fallback-product-ids" type="text" placeholder="123,456,789" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="max-products">Maximum products</s-label>
                <s-input id="max-products" type="number" placeholder="6" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="headline">Headline</s-label>
                <s-input id="headline" type="text" placeholder="Recommended for you" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="subheading">Subheading</s-label>
                <s-textarea id="subheading" placeholder="Personalized picks based on your shopping history." />
              </s-form-group>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </>
  );
}
