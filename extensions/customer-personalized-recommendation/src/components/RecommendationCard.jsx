import { useState } from "preact/hooks";
import { DEFAULT_THEME } from "../config/theme.js";
import { resolveTheme } from "../config/resolveTheme.js";
import { WidgetShell, CardList, ProductRow, ProductGridCard } from "./SharedCard.jsx";
import { PageNav } from "./PageNav.jsx";


const PLACEHOLDER = "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";

export function RecommendationCard({ item, rt, onAdd, onRemove, showError }) {
    const [adding, setAdding] = useState(false);
    const [status, setStatus] = useState("idle");

    async function handleAdd() {
        if (!item.variantId) return;
        setAdding(true);
        await onAdd(item.variantId, {
            onSuccess: () => {
                setAdding(false);
                setStatus("added");
                setTimeout(() => onRemove(item), 800);
            },
            onError: () => { setAdding(false); setStatus("idle"); },
        });
    }

    //.log("[Card] item:", JSON.stringify(item), "rt.isGrid:", rt.isGrid);


    //.log(
    // "[CARD]",
    //JSON.stringify(item, null, 2)
    //); 

    if (status === "added") {
        return (
            <s-box background="base" border="base" borderRadius={rt.borderRadius} padding={rt.cardPadding}>
                <s-grid gridTemplateColumns={`${rt.imgCol} 1fr`} gap="base" alignItems="center">
                    <s-image src={item.image ?? PLACEHOLDER} alt={item.title} aspectRatio="1" borderRadius={rt.borderRadius} />
                    <s-stack gap="none">
                        <s-text tone="subdued">✓ Added to cart</s-text>
                        <s-text type="strong">{item.title}</s-text>
                    </s-stack>
                </s-grid>
            </s-box>
        );
    }

    //console.log("[BUTTON DEBUG]","theme:",rt.buttonVariant);
    const addButton = (
        <s-button variant={rt.buttonVariant} loading={adding} disabled={!item.variantId} onClick={handleAdd}>
            + Add
        </s-button>
    );

    // ── Grid/horizontal card (stacked layout) ────────────────────────────────
    if (rt.isGrid || rt.isHorizontal) {
        return (
            <ProductGridCard
                image={item.image}
                title={item.title}
                price={item.price}
                currencyCode={item.currencyCode}
                rt={rt}
                rightSlot={addButton}
            />
        );
    }

    // ── Vertical card (row layout) ───────────────────────────────────────────
    return (
        <ProductRow
            image={item.image}
            title={item.title}
            price={item.price}
            currencyCode={item.currencyCode}
            rt={rt}
            rightSlot={addButton}
        />
    );
}
