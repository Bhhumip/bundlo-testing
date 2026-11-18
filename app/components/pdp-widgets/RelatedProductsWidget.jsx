export function RelatedProductsWidget({ funnel, definition }) {
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
          <s-heading>Related Products Configuration</s-heading>
          <s-box padding="base" border="base" borderRadius="base" background="base">
            <s-stack gap="base">
              <s-form-group>
                <s-label htmlFor="rules-json">Rules JSON</s-label>
                <s-textarea id="rules-json" placeholder='[{"tag":"bestseller"}]' />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="fallback-product-ids">Fallback product IDs</s-label>
                <s-input id="fallback-product-ids" type="text" placeholder="123,456" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="max-products">Maximum products</s-label>
                <s-input id="max-products" type="number" placeholder="4" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="headline">Headline</s-label>
                <s-input id="headline" type="text" placeholder="You may also like" />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="subheading">Subheading</s-label>
                <s-textarea id="subheading" placeholder="Suggest related products that fit this product context." />
              </s-form-group>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </>
  );
}
