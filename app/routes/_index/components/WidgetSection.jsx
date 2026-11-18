import Reveal from "./Reveal";

const WIDGETS = [
    {
        icon: "FBT",
        title: "Frequently Bought Together",
        desc: "Show related products shoppers often add alongside the item they're viewing, with one combined add-to-cart.",
    },
    {
        icon: "◆",
        title: "Personalized Recommendations",
        desc: "Surface products tailored to each shopper's browsing and purchase history.",
    },
    {
        icon: "✎",
        title: "Order Note Widget",
        desc: "Let customers leave gift messages or special instructions right on the product or cart page.",
    },
    {
        icon: "⧗",
        title: "Countdown Timer",
        desc: "Create urgency with a countdown as shoppers review their cart.",
    },
    {
        icon: "▤",
        title: "Announcement Bar",
        desc: "Use a slim cart message bar for timely updates and promotions.",
    },
    {
        icon: '"',
        title: "Testimonials",
        desc: "Feature customer quotes and social proof near your bundle and upsell widgets.",
    },
];

// .bc-widget-grid sets perspective: 900px specifically so this tilt reads as
// a real 3D rotation rather than a flat skew — the two are meant to pair.
// Guards added: skip for touch/pen input (no hover state to leave, so a
// stuck transform was possible) and respect prefers-reduced-motion.
function handleTiltMove(e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(700px) rotateX(${py * -6}deg) rotateY(${px * 8}deg) translateY(-2px)`;
}

function handleTiltLeave(e) {
    e.currentTarget.style.transform = "";
}

export default function WidgetSection() {
    return (
        <section id="upsell-widgets" className="bc-section-alt">
            <div className="bc-wrap">
                <Reveal as="p" className="bc-section-eyebrow">
                    Upsell widgets
                </Reveal>
                <Reveal as="h2" className="bc-section-title">
                    Grow the cart after the bundle
                </Reveal>
                <Reveal as="p" className="bc-section-sub">
                    Drop-in widgets that sit alongside your bundles to lift average
                    order value and build trust at checkout.
                </Reveal>

                <div className="bc-widget-grid">
                    {WIDGETS.map((w) => (
                        <Reveal
                            key={w.title}
                            as="article"
                            className="bc-widget-card"
                            onPointerMove={handleTiltMove}
                            onPointerLeave={handleTiltLeave}
                        >
                            <div className="bc-widget-icon" aria-hidden="true">{w.icon}</div>
                            <h4 className="bc-widget-title">{w.title}</h4>
                            <p className="bc-widget-desc">{w.desc}</p>
                        </Reveal>
                    ))}
                    <Reveal as="div" className="bc-widget-card bc-widget-card-soon">
                        More widgets coming soon
                        <br />

                    </Reveal>
                </div>
            </div>
        </section>
    );
}