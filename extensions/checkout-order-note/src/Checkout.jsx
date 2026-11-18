import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { APP_URL } from "../../constants.js";

export default function () {
  render(<OrderNote />, document.body);
}

function OrderNote() {
  const [theme, setTheme] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Seed straight from the shared cart/checkout note signal — this is the
  // same field the cart-page/cart-drawer embed writes to via /cart/update.js,
  // so whatever the buyer typed there already shows up here.
  const [note, setNote] = useState(shopify.note?.value ?? "");
  const debounceRef = useRef(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        //const storeDomain = shopify.shop.myshopifyDomain;
        const token = await shopify.sessionToken.get();
        console.log("token present:", !!token, token?.length);

        const res = await fetch(
          `${APP_URL}/api/widget-theme?widgetKey=order_notes&surface=CHECKOUT`,
          { headers: { Authorization: `Bearer ${token}` } }   // backticks, not ' or "
        );
        const data = await res.json().catch(() => ({}));
        setTheme(data.theme);
        setEnabled(Boolean(data.enabled));
        console.log("[OrderNote] config loaded:", data);
      } catch (err) {
        console.error("[OrderNote] failed to load config:", err);
      } finally {
        setLoaded(true);
      }
    }
    loadConfig();
  }, []);

  if (!loaded) return null;
  if (!enabled) return null; // fail closed — merchant hasn't enabled this widget

  function handleChange(value) {
    setNote(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      shopify.applyNoteChange({
        type: "updateNote",
        note: value,
      });
    }, 400);
  }

  return (
    <s-stack direction="block" gap={theme?.gap ?? "base"}>
      <s-text emphasis="bold">{theme?.label ?? "Order note"}</s-text>
      <s-text-area
        label=""
        placeholder={theme?.placeholder ?? "Add a note for your order"}
        value={note}
        maxLength={theme?.maxLength ?? 300}
        onChange={(e) => handleChange(e.target.value)}
        onInput={(e) => handleChange(e.target.value)}
      />
      {theme?.maxLength && (
        <s-text size="small" color="subdued">
          {note.length}/{theme.maxLength}
        </s-text>
      )}
    </s-stack>
  );
}