import { S } from "./formStyles";
import { Field, Group } from "./FormControls";

export function FreeShippingProgressTab({ theme, update, mode }) {
  const appearance = theme.appearance || {};
  const labels = theme.labels || {};
  const placement = theme.placement || {};

  const updateNested = (group, key, value) => {
    update(group, { ...(theme[group] || {}), [key]: value });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Group label="Progress Bar Appearance">
        <Field label="Filled color">
          <input type="color" value={appearance.filledColor || "#111827"}
            onChange={(e) => updateNested("appearance", "filledColor", e.target.value)}
            style={S.colorInput} />
        </Field>
        <Field label="Empty color">
          <input type="color" value={appearance.emptyColor || "#D1D5DB"}
            onChange={(e) => updateNested("appearance", "emptyColor", e.target.value)}
            style={S.colorInput} />
        </Field>
        <Field label="Animation">
          <select value={appearance.animation || "smooth"}
            onChange={(e) => updateNested("appearance", "animation", e.target.value)}
            style={S.select}>
            <option value="smooth">Smooth</option>
            <option value="none">None</option>
          </select>
        </Field>
        <Field label="Show milestones">
          <input type="checkbox" checked={appearance.showMilestones ?? true}
            onChange={(e) => updateNested("appearance", "showMilestones", e.target.checked)} />
        </Field>
        <Field label="Compact mode">
          <input type="checkbox" checked={appearance.compactMode ?? false}
            onChange={(e) => updateNested("appearance", "compactMode", e.target.checked)} />
        </Field>
      </Group>

      <Group label="Progress Messages">
        {[
          ["beforeGoal", "Before goal"],
          ["progress", "Progress"],
          ["afterGoal", "After goal"],
          ["footer", "Footer"],
        ].map(([key, label]) => (
          <Field key={key} label={label}>
            <input value={labels[key] || ""}
              onChange={(e) => updateNested("labels", key, e.target.value)}
              style={S.input} />
          </Field>
        ))}
      </Group>

      {mode !== "checkout" && (
        <Group label="Cart Placement">
          {[
            ["showOnCartPage", "Show on cart page"],
            ["showOnCartDrawer", "Show in cart drawer"],
            ["showOnProductPage", "Show on product page"],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <input type="checkbox" checked={placement[key] ?? false}
                onChange={(e) => updateNested("placement", key, e.target.checked)} />
            </Field>
          ))}
          <Field label="Insert position">
            <select value={placement.insertPosition || "afterbegin"}
              onChange={(e) => updateNested("placement", "insertPosition", e.target.value)}
              style={S.select}>
              <option value="afterbegin">Beginning</option>
              <option value="beforeend">End</option>
            </select>
          </Field>
        </Group>
      )}
    </div>
  );
}

