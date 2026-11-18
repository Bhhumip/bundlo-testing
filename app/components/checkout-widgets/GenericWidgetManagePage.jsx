import { useNavigate } from "react-router";

export function GenericWidgetManagePage({ shop, definition, backPath, surfaceName }) {
  const navigate = useNavigate();

  return (
    <s-page heading={`Manage ${definition.title}`}>
      <s-button
        slot="secondary-actions"
        variant="secondary"
        onClick={() => navigate(backPath)}
      >
        Back to {surfaceName} widgets
      </s-button>

      <s-section>
        <s-stack gap="base">
          <s-heading>{definition.title}</s-heading>
          <s-paragraph color="subdued">{definition.description}</s-paragraph>
          <s-badge tone="info">Surface: {surfaceName}</s-badge>
          <s-badge>{definition.legacyType}</s-badge>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-heading>Widget details</s-heading>
          <s-text>
            This is the dedicated manage page for the widget. Add form fields here to
            edit widget-specific settings such as offer product, messaging, and behavior.
          </s-text>

          <s-box padding="base" border="base" borderRadius="base" background="base">
            <s-stack gap="base">
              <s-form-group>
                <s-label htmlFor="headline">Headline</s-label>
                <s-input
                  id="headline"
                  placeholder={definition.defaults?.headline || "Enter headline"}
                  type="text"
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="subheading">Subheading</s-label>
                <s-textarea
                  id="subheading"
                  placeholder={definition.defaults?.subheading || "Enter subheading"}
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="cta-label">CTA Label</s-label>
                <s-input
                  id="cta-label"
                  placeholder={definition.defaults?.ctaLabel || "Enter CTA label"}
                  type="text"
                />
              </s-form-group>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}

