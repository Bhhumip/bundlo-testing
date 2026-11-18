import { useState, useEffect } from "react";
import { useFetcher } from "react-router";

export function DonationProductPicker({ value, onChange }) {
    const fetcher = useFetcher();
    const creating = fetcher.state !== "idle" &&
        fetcher.formData?.get("intent") === "create-demo-donation-product";

    // Derive "is something selected" straight from the flattened value prop,
    // instead of keeping a separate, possibly-stale copy in local state.
    const selected = value?.variantId
        ? { variantId: value.variantId, title: value.title, image: value.image }
        : null;

    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data?.ok && fetcher.data?.donationProduct) {
            onChange(fetcher.data.donationProduct);
        }
    }, [fetcher.state, fetcher.data]);

    async function openPicker() {
        const result = await window.shopify.resourcePicker({
            type: "product",
            action: "select",
            filter: { variants: true },
            multiple: false,
        });
        const product = result?.[0];
        const variant = product?.variants?.[0];
        if (product && variant) {
            onChange({
                productId: product.id,
                variantId: variant.id,
                title: product.title,
                image: product.images?.[0]?.originalSrc || null,
            });
        }

        const fd = new FormData();
        fd.append("intent", "publish-donation-product");
        fd.append("productId", product.id);
        fetcher.submit(fd, { method: "post" });
    }

    function createDemoProduct() {
        const formData = new FormData();
        formData.append("intent", "create-demo-donation-product");
        fetcher.submit(formData, { method: "post" });
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "12px", color: "#374151" }}>Donation product</label>

            {selected ? (
                <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px",
                }}>
                    {selected.image && (
                        <img src={selected.image} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover" }} />
                    )}
                    <span style={{ fontSize: "12px" }}>{selected.title}</span>
                    <button type="button" onClick={openPicker} style={{ marginLeft: "auto", fontSize: "11px" }}>
                        Change
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                    <button type="button" onClick={openPicker} style={{ fontSize: "12px", padding: "6px 12px" }}>
                        Select existing product
                    </button>
                    <button type="button" onClick={createDemoProduct} disabled={creating}
                        style={{ fontSize: "12px", padding: "6px 12px" }}>
                        {creating ? "Creating…" : "Create demo donation product"}
                    </button>
                </div>
            )}
        </div>
    );
}