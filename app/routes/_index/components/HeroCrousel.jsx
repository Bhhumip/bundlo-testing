import { useCallback, useEffect, useRef, useState } from "react";

const SLIDES = [
    { kind: "Bundle type", title: "Fixed Bundle", desc: "A curated set of products sold together at one fixed price.", img: "/assets/bundle-fixed.png" },
    { kind: "Bundle type", title: "Mix & Match Bundle", desc: "Shoppers pick any combination from a category to fill a set.", img: "/assets/bundle-mixmatch.png" },
    { kind: "Bundle type", title: "Volume Bundle", desc: "Automatic tiered discounts that reward buying more of one product.", img: "/assets/bundle-volume.png" },
    { kind: "Bundle type", title: "Multi-Product Multivariate Bundle", desc: "Several different products, each with its own variant picker.", img: "/assets/bundle-multivariate.png" },
    { kind: "Bundle type", title: "Single-Product Multivariate Bundle", desc: "One product, multiple variants bundled together.", img: "/assets/bundle-single-multivariate.png", a: "#6c5ce0", b: "#4a3fb0" },
    { kind: "Bundle type", title: "Build Your Own Box", desc: "An open canvas where shoppers fill a box from your catalog.", img: "/assets/bundle-buildbox.png" },
];

const AUTOPLAY_MS = 5000;

export default function HeroCrousel() {
    const [current, setCurrent] = useState(0);
    const [paused, setPaused] = useState(false);
    const timerRef = useRef(null);

    const goTo = useCallback((index) => {
        setCurrent(((index % SLIDES.length) + SLIDES.length) % SLIDES.length);
    }, []);

    useEffect(() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion || paused) return;

        timerRef.current = setInterval(() => {
            setCurrent((c) => (c + 1) % SLIDES.length);
        }, AUTOPLAY_MS);

        return () => clearInterval(timerRef.current);
    }, [paused]);

    const handlePrev = () => goTo(current - 1);
    const handleNext = () => goTo(current + 1);
    const handleDot = (index) => goTo(index);

    return (
        <section className="bc-carousel-section">
            <div className="bc-wrap">
                <div
                    className="bc-carousel"
                    role="region"
                    aria-roledescription="carousel"
                    aria-label="Bundle types and upsell widgets"
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                    onFocus={() => setPaused(true)}
                    onBlur={() => setPaused(false)}
                >
                    <div
                        className="bc-carousel-track"
                        style={{ transform: `translateX(-${current * 100}%)` }}
                    >
                        {SLIDES.map((s, i) => (
                            <div
                                className="bc-slide"
                                key={s.title}
                                aria-hidden={i !== current}
                            >
                                <div
                                    className="bc-slide-visual"
                                    style={!s.img ? { "--slide-a": s.a, "--slide-b": s.b } : undefined}
                                >
                                    {s.img ? (
                                        <img src={s.img} alt={`${s.title} preview`} loading="lazy" />
                                    ) : (
                                        <span className="bc-slide-visual-label">
                                            Image placeholder — {s.title}
                                        </span>
                                    )}
                                </div>
                                <div className="bc-slide-caption">
                                    <p className="bc-slide-kind">{s.kind}</p>
                                    <h3>{s.title}</h3>
                                    <p>{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        className="bc-carousel-arrow bc-carousel-arrow-left"
                        aria-label="Previous slide"
                        onClick={handlePrev}
                    >
                        ‹
                    </button>
                    <button
                        className="bc-carousel-arrow bc-carousel-arrow-right"
                        aria-label="Next slide"
                        onClick={handleNext}
                    >
                        ›
                    </button>
                </div>

                <div className="bc-carousel-dots" role="tablist" aria-label="Choose slide">
                    {SLIDES.map((s, i) => (
                        <button
                            key={s.title}
                            role="tab"
                            aria-selected={i === current}
                            className={`bc-carousel-dot ${i === current ? "bc-carousel-dot-active" : ""}`}
                            aria-label={`Go to slide ${i + 1}: ${s.title}`}
                            onClick={() => handleDot(i)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}