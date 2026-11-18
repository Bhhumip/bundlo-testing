import Reveal from "./Reveal";

export default function GalleryBanner() {
    return (
        <section id="gallery">
            <div className="bc-wrap">
                <Reveal className="bc-gallery-banner">
                    <div className="bc-banner-bg">
                        <img src="/assets/bundle-mixmatch.jpg" alt="" loading="lazy" />
                    </div>
                    <div className="bc-banner-scrim" aria-hidden="true" />

                    <div className="bc-banner-copy">
                        <h3>See these bundle types live</h3>
                        <p>
                            Browse example bundles and upsell widgets built with
                            Bundlecraft on real product pages.
                        </p>
                    </div>
                    <a className="bc-gallery-btn" href="#">
                        Explore Gallery →
                    </a>
                </Reveal>
            </div>
        </section>
    );
}