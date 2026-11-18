import { WidgetPlaceholderPage } from "../shared/WidgetPlaceholderPage";

export function ProductAddonsWidget({ funnel, definition }) {
  return (
    <WidgetPlaceholderPage
      funnel={funnel}
      definition={definition}
      extraText="Placeholder for product addons widget configuration."
    />
  );
}
