import Reveal from "./Reveal";

export default function Hero({ children }) {
    return (
        <div className="bc-hero-photo-wrap" id="top">
            <div className="bc-hero-bg-img">
                <img src="/assets/bundle-hero.png" alt="" loading="eager" />
            </div>
            <div className="bc-hero-scrim" aria-hidden="true" />

            <div className="bc-hero-top bc-wrap">
                <Reveal as="p" className="bc-eyebrow">
                    Bundles &amp; upsell widgets for Shopify
                </Reveal>
                <Reveal as="h1" className="bc-h1" delay={0.06}>
                    Every way to bundle. One app.
                </Reveal>
                <Reveal as="p" className="bc-hero-text" delay={0.12}>
                    Fixed bundles, mix &amp; match, volume tiers, multivariate sets, and
                    build-your-own-box — plus upsell widgets that keep the cart growing.
                </Reveal>

                <Reveal delay={0.18}>{children}</Reveal>
            </div>
        </div>
    );
}