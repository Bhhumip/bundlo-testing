import Reveal from "./Reveal";

const FEATURES = [
    {
        num: "01",
        title: "Flexible discount engine",
        desc: "Fixed prices, percentage tiers, add-ons, and free-gift thresholds — configured per bundle.",
    },
    {
        num: "02",
        title: "Theme-native design",
        desc: "Widgets inherit your store's fonts and colors automatically, with full CSS override support.",
    },
    {
        num: "03",
        title: "Analytics dashboard",
        desc: "Track views, conversions, and revenue per bundle and widget.",
    },
    {
        num: "04",
        title: "Works on any page",
        desc: "Embed on product pages or launch a dedicated bundle landing page — your choice per bundle.",
    },
];

export default function Features() {
    return (
        <section id="features">
            <div className="bc-wrap">
                <Reveal as="p" className="bc-section-eyebrow">
                    Why Bundlo?
                </Reveal>
                <Reveal as="h2" className="bc-section-title">
                    Built for how you actually sell
                </Reveal>
                <Reveal as="p" className="bc-section-sub">
                    Every bundle type and upsell widget runs on the same engine, so
                    pricing and inventory stay in sync everywhere.
                </Reveal>

                <div className="bc-feature-grid">
                    {FEATURES.map((feature) => (
                        <Reveal key={feature.num} as="article" className="bc-feature-item">
                            <p className="bc-feature-num">{feature.num}</p>
                            <h4>{feature.title}</h4>
                            <p>{feature.desc}</p>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}