import { useState, useEffect } from "react";
import Modal from "./Modal";
import Reveal from "./Reveal";

const TABS = [
    { key: "fixed", num: "01", name: "Fixed Bundle" },
    { key: "mix", num: "02", name: "Mix & Match" },
    { key: "volume", num: "03", name: "Volume Bundle" },
    { key: "multi", num: "04", name: "Multi-Product Multivariate" },
    { key: "single", num: "05", name: "Single-Product Multivariate" },
    { key: "box", num: "06", name: "Build Your Own Box" },
];

const BUNDLE_DATA = {
    fixed: {
        tag: "Fixed Bundle",
        title: "A curated set at one price",
        desc: "Specific products sold together at one fixed price. Great for gift sets and starter kits.",
        demoImage: "/assets/bundle-fixed.png",
        products: [
            { title: "Moisturizer", price: 499 },
            { title: "Sunscreen", price: 599 },
            { title: "Face Wash", price: 399 }
        ],
        discountPercent: 20,
    },
    mix: {
        tag: "Mix & Match Bundle",
        title: "Shoppers build their own set",
        desc: "Let customers pick any combination from a category to fill a set — e.g. any 3 for $30.",
        demoImage: "/assets/bundle-mixmatch.png",
        products: [
            { title: "Tone Mist", price: 249, picked: true },
            { title: "Face Wash", price: 399 },
            { title: "Moisturizer", price: 499, picked: true },
            { title: "Sunscreen", price: 599 },
            { title: "Lip Balm", price: 199, picked: true },
            { title: "Eye Cream", price: 699, picked: true },

        ],

        discountPercent: 25,
    },
    volume: {
        tag: "Volume Bundle",
        title: "Reward buying more",
        desc: "Automatic tiered discounts that reward buying more of the same product.",
        demoImage: "/assets/bundle-volume.png",
        products: [{ title: "Hydrating Serum", price: 599 }],
        tiers: [
            { label: "Buy 1", note: "Standard price", qty: 1, discountPercent: 0 },
            { label: "Buy 2", note: "Save 10%", qty: 2, discountPercent: 10 },
            { label: "Buy 3", note: "Save 20%", qty: 3, discountPercent: 20, active: true },
        ],
    },
    multi: {
        tag: "Multi-Product Multivariate",
        title: "Different products, each with variants",
        desc: "Bundle several different products, each with its own variant picker — size, color, or flavor.",
        demoImage: "/assets/bundle-multivariate.png",
        products: [
            { title: "T-Shirt", price: 599, variant: "Size: M" },
            { title: "Cap", price: 349, variant: "Color: Black" },
            { title: "Socks (Pack of 2)", price: 199, variant: "Size: L" },
        ],
        discountPercent: 15,
    },
    single: {
        tag: "Single-Product Multivariate",
        title: "One product, several variants",
        desc: "One product, multiple variants bundled together — e.g. a 3-pack in three different colors.",
        demoImage: "/assets/bundle-single-multivariate.png",
        gradient: { a: "#6c5ce0", b: "#4a3fb0" },
        products: [
            { title: "Cotton Tee — Black", price: 399 },
            { title: "Cotton Tee — White", price: 399 },
            { title: "Cotton Tee — Grey", price: 399 },
        ],
        discountPercent: 10,
    },
    box: {
        tag: "Build Your Own Box",
        title: "An open canvas to fill",
        desc: "Shoppers fill a box from your catalog, up to a set count or value — you set the rules.",
        demoImage: "/assets/bundle-buildbox.png",
        products: [
            { title: "Face Wash", price: 349, picked: true },
            { title: "Moisturizer", price: 499, picked: true },
            { title: "Sunscreen", price: 299, picked: false },
            { title: "Toner", price: 249, picked: false },
        ],
        discountPercent: 10,
    },
};

// Every visual below draws only from the brand swatch classes (bc-sw-a/b/c)
// and shared layout classes in global.css — no inline colors or sizing, so
// the six previews read as one consistent system.
function BundleVisual({ tabKey }) {
    switch (tabKey) {
        case "fixed":
            return (
                <div className="bc-row-center">
                    <div className="bc-swatch bc-sw-a" />
                    <span className="bc-plus">+</span>
                    <div className="bc-swatch bc-sw-b" />
                    <span className="bc-plus">+</span>
                    <div className="bc-swatch bc-sw-c" />
                </div>
            );
        case "mix":
            return (
                <div className="bc-mix-grid">
                    <div className="bc-swatch bc-sw-a bc-mix-pick" />
                    <div className="bc-swatch bc-sw-b" />
                    <div className="bc-swatch bc-sw-c bc-mix-pick" />
                    <div className="bc-swatch bc-sw-a" />
                    <div className="bc-swatch bc-sw-b bc-mix-pick" />
                    <div className="bc-swatch bc-sw-c" />
                    <div className="bc-swatch bc-sw-a" />
                    <div className="bc-swatch bc-sw-b" />
                </div>
            );
        case "volume":
            return (
                <div className="bc-col-center">
                    <div className="bc-tier">
                        <span>Buy 1</span>
                        <span>Standard</span>
                    </div>
                    <div className="bc-tier bc-tier-active">
                        <span>Buy 2</span>
                        <span>Save 10%</span>
                    </div>
                    <div className="bc-tier">
                        <span>Buy 3</span>
                        <span>Save 20%</span>
                    </div>
                </div>
            );
        case "multi":
            return (
                <div className="bc-col-center">
                    <div className="bc-multi-row">
                        <div className="bc-swatch bc-sw-a" />
                        <div className="bc-dots">
                            <span className="bc-dot bc-dot-on" />
                            <span className="bc-dot" />
                            <span className="bc-dot" />
                        </div>
                    </div>
                    <div className="bc-multi-row">
                        <div className="bc-swatch bc-sw-b" />
                        <div className="bc-dots">
                            <span className="bc-dot" />
                            <span className="bc-dot bc-dot-on" />
                            <span className="bc-dot" />
                        </div>
                    </div>
                    <div className="bc-multi-row">
                        <div className="bc-swatch bc-sw-c" />
                        <div className="bc-dots">
                            <span className="bc-dot" />
                            <span className="bc-dot" />
                            <span className="bc-dot bc-dot-on" />
                        </div>
                    </div>
                </div>
            );
        case "single":
            return (
                <div className="bc-col-center" style={{ alignItems: "center" }}>
                    <div className="bc-swatch bc-swatch-lg bc-sw-b" />
                    <div className="bc-single-dots">
                        <span className="bc-dot bc-sw-b" />
                        <span className="bc-dot bc-sw-a" />
                        <span className="bc-dot bc-sw-c" />
                    </div>
                </div>
            );
        case "box":
            return (
                <div className="bc-box-grid">
                    <div className="bc-box-slot bc-box-slot-filled" />
                    <div className="bc-box-slot bc-box-slot-filled" />
                    <div className="bc-box-slot" />
                    <div className="bc-box-slot" />
                    <div className="bc-box-slot" />
                    <div className="bc-box-slot" />
                </div>
            );
        default:
            return null;
    }
}

export default function BundleShowcase() {
    const [active, setActive] = useState("fixed");
    const [demoOpen, setDemoOpen] = useState(false);
    const [selected, setSelected] = useState({});
    const [tierIndex, setTierIndex] = useState(0);
    const data = BUNDLE_DATA[active];

    const isPickable = data.products.some((p) => "picked" in p);
    const isVolume = Boolean(data.tiers);


    useEffect(() => {
        if (!demoOpen) return;
        if (isPickable) {
            const initial = {};
            data.products.forEach((p) => {
                initial[p.title] = p.picked !== false;
            });
            setSelected(initial);
        }
        if (isVolume) {
            const defaultIndex = data.tiers.findIndex((t) => t.active);
            setTierIndex(defaultIndex >= 0 ? defaultIndex : 0);
        }
    }, [demoOpen, active]); // eslint-disable-line react-hooks/exhaustive-deps

    function toggleProduct(title) {
        setSelected((prev) => ({ ...prev, [title]: !prev[title] }));
    }

    // Derived pricing — recalculates from whatever is actually selected right now.
    let originalTotal, bundlePrice, selectedCount;

    if (isVolume) {
        const tier = data.tiers[tierIndex];
        const unitPrice = data.products[0].price;
        originalTotal = unitPrice * tier.qty;
        bundlePrice = Math.round(originalTotal * (1 - tier.discountPercent / 100));
        selectedCount = tier.qty;
    } else {
        const selectedProducts = isPickable
            ? data.products.filter((p) => selected[p.title])
            : data.products;
        originalTotal = selectedProducts.reduce((sum, p) => sum + p.price, 0);
        bundlePrice = Math.round(originalTotal * (1 - data.discountPercent / 100));
        selectedCount = selectedProducts.length;
    }
    const savings = originalTotal - bundlePrice;

    return (
        <section id="bundle-types">
            <div className="bc-wrap">
                <Reveal as="p" className="bc-section-eyebrow">
                    Bundle types
                </Reveal>
                <Reveal as="h2" className="bc-section-title">
                    Six ways to bundle products
                </Reveal>
                <Reveal as="p" className="bc-section-sub">
                    Click a type to preview how it looks and works. Each has its own
                    pricing logic and on-page experience.
                </Reveal>

                <Reveal className="bc-showcase">
                    <div className="bc-bundle-list" role="tablist" aria-label="Bundle type">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                role="tab"
                                aria-selected={active === tab.key}
                                className={`bc-bundle-tab ${active === tab.key ? "bc-bundle-tab-active" : ""}`}
                                onClick={() => setActive(tab.key)}
                            >
                                <span className="bc-bundle-tab-num">{tab.num}</span>
                                <span className="bc-bundle-tab-name">{tab.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="bc-bundle-preview" role="tabpanel">
                        <div className="bc-preview-visual" key={active}>
                            <BundleVisual tabKey={active} />
                        </div>
                        <div className="bc-preview-body" key={`${active}-body`}>
                            <p className="bc-bundle-tag">{data.tag}</p>
                            <h3>{data.title}</h3>
                            <p>{data.desc}</p>
                            <button type="button" className="bc-bundle-link" onClick={() => setDemoOpen(true)}>
                                See demo →
                            </button>
                        </div>
                    </div>
                </Reveal>
            </div>
            <Modal open={demoOpen} onClose={() => setDemoOpen(false)} title={`${data.tag} demo`}>
                <div className="bc-demo">
                    <div
                        className="bc-demo-hero"
                        style={
                            data.demoImage
                                ? { backgroundImage: `url(${data.demoImage})` }
                                : { "--slide-a": data.gradient.a, "--slide-b": data.gradient.b }
                        }
                    >
                        {!data.demoImage && (
                            <span className="bc-demo-hero-label">{data.tag}</span>
                        )}
                    </div>

                    <p className="bc-demo-tag">{data.tag}</p>
                    <h3 className="bc-demo-title">{data.title}</h3>
                    {data.tiers && (
                        <div className="bc-demo-tiers">
                            {data.tiers.map((t, i) => (
                                <button
                                    type="button"
                                    key={t.label}
                                    onClick={() => setTierIndex(i)}
                                    className={`bc-demo-tier ${i === tierIndex ? "bc-demo-tier-active" : ""}`}
                                    aria-pressed={i === tierIndex}
                                >
                                    <span>{t.label}</span>
                                    <span>{t.note}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <ul className="bc-demo-products">
                        {data.products.map((p) => (
                            <li
                                key={p.title}
                                className={`bc-demo-product ${isPickable ? "bc-demo-product-clickable" : ""} ${isPickable && !selected[p.title] ? "bc-demo-product-unpicked" : ""
                                    }`}
                                onClick={isPickable ? () => toggleProduct(p.title) : undefined}
                                role={isPickable ? "checkbox" : undefined}
                                aria-checked={isPickable ? Boolean(selected[p.title]) : undefined}
                                tabIndex={isPickable ? 0 : undefined}
                                onKeyDown={
                                    isPickable
                                        ? (e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                toggleProduct(p.title);
                                            }
                                        }
                                        : undefined
                                }
                            >
                                <span className="bc-demo-product-name">
                                    {p.title}
                                    {p.variant && <span className="bc-demo-product-variant"> · {p.variant}</span>}
                                    {isVolume && <span className="bc-demo-product-variant"> · Qty: {selectedCount}</span>}
                                </span>
                                <span className="bc-demo-product-price">₹{p.price}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="bc-demo-price-row">
                        {selectedCount === 0 ? (
                            <span className="bc-demo-price-empty">— Select an item to see price —</span>
                        ) : (
                            <>
                                {savings > 0 && (
                                    <span className="bc-demo-price-original">₹{originalTotal}</span>
                                )}
                                <span className="bc-demo-price-final">₹{bundlePrice}</span>
                                {savings > 0 && (
                                    <span className="bc-demo-savings">Save ₹{savings}</span>
                                )}
                            </>
                        )}
                    </div>
                    {isPickable && (
                        <p className={`bc-demo-hint ${selectedCount === 0 ? "bc-demo-hint-warning" : ""}`}>
                            {selectedCount === 0
                                ? "Select at least one item to see pricing"
                                : `${selectedCount} of ${data.products.length} selected — click an item to add or remove it`}
                        </p>
                    )}
                    <button
                        type="button"
                        className="bc-btn-primary bc-demo-cta"
                        disabled
                        aria-disabled="true"
                    >
                        Add bundle to cart — Demo only
                    </button>
                </div>
            </Modal>

        </section>
    );
}