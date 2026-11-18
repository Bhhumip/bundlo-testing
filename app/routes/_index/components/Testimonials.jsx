import Reveal from "./Reveal";

const TESTIMONIALS = [
    {
        quote: "[Add a real quote from a merchant about setup speed, support, or results.]",
        who: "[Store name], [Industry]",
    },
    {
        quote: "[Add a real quote about a specific bundle type or widget that worked well.]",
        who: "[Store name], [Industry]",
    },
    {
        quote: "[Add a real quote about customer support or ease of use.]",
        who: "[Store name], [Industry]",
    },
];

export default function Testimonials() {
    return (
        <section className="bc-section-alt">
            <div className="bc-wrap">
                <Reveal as="p" className="bc-section-eyebrow">
                    What merchants say
                </Reveal>
                <Reveal as="h2" className="bc-section-title">
                    Testimonials
                </Reveal>
                <Reveal as="p" className="bc-testimonial-note">
                    Placeholder cards — replace with real merchant quotes once you have
                    them. Don't publish these as-is.
                </Reveal>

                <div className="bc-testimonial-grid">
                    {TESTIMONIALS.map((t, i) => (
                        <Reveal key={i} as="figure" className="bc-testimonial-card">
                            <blockquote className="bc-testimonial-quote">"{t.quote}"</blockquote>
                            <figcaption className="bc-testimonial-who">— {t.who}</figcaption>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}