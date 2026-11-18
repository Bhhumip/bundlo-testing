import { WidgetPlaceholderPage } from "../shared/WidgetPlaceholderPage";

export function ReplenishmentReminderWidget({ funnel, definition }) {
  return (
    <WidgetPlaceholderPage
      funnel={funnel}
      definition={definition}
      extraText="Placeholder for replenishment reminder widget configuration."
    />
  );
}
