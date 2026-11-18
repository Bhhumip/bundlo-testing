export function WidgetPlaceholderPage({definition, extraText }) {
  return (
    <>
      <s-section>
        <s-stack gap="base">
          <s-heading>{definition.title}</s-heading>
          <s-paragraph color="subdued">{definition.description}</s-paragraph>
          <s-text color="subdued">
            Manage widget settings for {definition.key} on the {definition?.surface || "this"} surface.
          </s-text>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-heading>Widget settings</s-heading>
          <s-text>{extraText || "Use this placeholder component to add widget-specific fields later."}</s-text>
        </s-stack>
      </s-section>
    </>
  );
}
