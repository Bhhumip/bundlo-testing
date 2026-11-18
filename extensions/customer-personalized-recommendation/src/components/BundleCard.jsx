import { useState } from "preact/hooks";
import { ProductRow, ProductGridCard } from "./SharedCard.jsx";

const PLACEHOLDER = "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";

export function BundleCard({ bundle, i18n, showError, onAddBundle, onRemove, rt }) {
    const [adding, setAdding] = useState(false);
    const [status, setStatus] = useState("idle");

    function discountLabel() {
        if (bundle.discountType === "PERCENTAGE") return `Save ${bundle.discountValue}%`;
        if (bundle.discountType === "FIXED_AMOUNT") return `Save ${i18n.formatCurrency(bundle.discountValue)}`;
        if (bundle.discountType === "FIXED_PRICE") return `Bundle price: ${i18n.formatCurrency(bundle.fixedPrice)}`;
        return null;
    }

    const discount = discountLabel();

    async function handleAdd() {
        if (!bundle.shopifyVariantId) return;
        setAdding(true);
        await onAddBundle(bundle, {
            onSuccess: () => {
                setAdding(false);
                setStatus("added");
                setTimeout(() => onRemove(bundle), 800);
            },
            onError: () => { setAdding(false); setStatus("idle"); },
        });
    }

    if (status === "added") {
        return (
            <s-box background="base" border="base" borderRadius={rt.borderRadius} padding={rt.cardPadding}>
                <s-grid gridTemplateColumns={`${rt.imgCol} 1fr`} gap="base" alignItems="center">
                    <s-image src={bundle.image ?? PLACEHOLDER} alt={bundle.title} aspectRatio="1" borderRadius={rt.borderRadius} />
                    <s-stack gap="none">
                        <s-text tone="subdued">✓ Added to cart</s-text>
                        <s-text type="strong">{bundle.title}</s-text>
                    </s-stack>
                </s-grid>
            </s-box>
        );
    }

    const addButton = (
        <s-button variant={rt.buttonVariant} loading={adding} onClick={handleAdd}>
            + Add
        </s-button>
    );

    if (rt.isGrid || rt.isHorizontal) {
        return (
            <ProductGridCard
                image={bundle.image}
                title={bundle.title}
                price={bundle.price}
                currencyCode={bundle.currencyCode}
                badge={discount}
                rt={rt}
                rightSlot={addButton}
            />
        );
    }

    return (
        <ProductRow
            image={bundle.image}
            title={bundle.title}
            subtitle={bundle.description}
            price={bundle.price}
            currencyCode={bundle.currencyCode}
            rt={rt}
            rightSlot={addButton}
        />
    );
}