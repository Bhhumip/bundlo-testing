export function FrequentlyBoughtTogetherWidget({ funnel, definition }) {
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
          <s-heading>Product Bundle Settings</s-heading>
          <s-box padding="base" border="base" borderRadius="base" background="base">
            <s-stack gap="base">
              <s-form-group>
                <s-label htmlFor="product-ids">Product IDs</s-label>
                <s-input id="product-ids" type="text" placeholder="111,222,333" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="max-products">Maximum products</s-label>
                <s-input id="max-products" type="number" placeholder="3" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="discount-label">Discount label</s-label>
                <s-input id="discount-label" type="text" placeholder="Save 10% when bought together" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="headline">Headline</s-label>
                <s-input id="headline" type="text" placeholder="Frequently Bought Together" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="subheading">Subheading</s-label>
                <s-textarea id="subheading" placeholder="Show complementary items shoppers often buy with this product." />
              </s-form-group>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </>
  );
}
