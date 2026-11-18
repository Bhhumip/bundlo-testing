//  FBT DiscountFunctionSettings.jsx
import "@shopify/ui-extensions/preact";
import {render} from "preact";
import {useMemo, useState} from "preact/hooks";

export default async () => {
  render(<App />, document.body);
};

function App() {
  const { data, applyMetafieldChange } = shopify;

  const initial = useMemo(() => {
    try {
      const raw = data?.metafields?.find(
    (m) => m.key === "function-configuration"
)?.value;
      return JSON.parse(raw || "{}").percentage ?? 10;
    } catch {
      return 10;
    }
  }, [data]);

  const [percentage, setPercentage] = useState(String(initial));
  console.log("STATE =", percentage);

  async function save() {
  console.log("Saving:", percentage);

  await applyMetafieldChange({
    type: "updateMetafield",
    namespace: "$app",
    key: "function-configuration",
    valueType: "json",
   value: JSON.stringify({
  percentage: Number(percentage),
}),
  });
  console.log("Saved");
}
  return (
    <s-function-settings
  onSubmit={(e) => {
    e.waitUntil?.(save());
  }}
  onReset={() => setPercentage(initial)}
>
      <s-heading>FBT Discount Settings</s-heading>
      <s-section>
       <s-number-field
  label="Discount Percentage"
  name="percentage"
  value={String(percentage)}
  min={1}
  max={100}
  suffix="%"
  onChange={(event) => {
  console.log("EVENT", event);

  console.log("VALUE =", event.currentTarget.value);

  setPercentage(event.currentTarget.value);
}}
/>
      </s-section>
    </s-function-settings>
  );
}
