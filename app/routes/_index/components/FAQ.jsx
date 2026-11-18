import { useState } from "react";
import Reveal from "./Reveal";

const FAQS = [
    {
        q: "What bundle types can I create?",
        a: "Six types: fixed bundles, mix & match, volume bundles, multi-product multivariate bundles, single-product multivariate bundles, and build-your-own-box.",
    },
    {
        q: "Do I need to edit my theme code?",
        a: "No. Bundles and widgets are added through the app and inherit your theme's styling automatically.",
    },
    {
        q: "Can I run bundles on a product page and a standalone landing page?",
        a: "Yes — each bundle can be embedded on a product page, launched as its own landing page, or both.",
    },
    {
        q: "What upsell widgets are included?",
        a: "Frequently bought together, personalized recommendations, an order note widget, reviews, and testimonials, with more planned.",
    },
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState(null);

    const toggle = (index) => {
        setOpenIndex((current) => (current === index ? null : index));
    };

    return (
        <section id="faq">
            <div className="bc-wrap">
                <Reveal as="p" className="bc-section-eyebrow">
                    FAQ
                </Reveal>
                <Reveal as="h2" className="bc-section-title">
                    Frequently asked questions
                </Reveal>

                <Reveal className="bc-faq-list">
                    {FAQS.map((item, i) => {
                        const isOpen = openIndex === i;
                        return (
                            <div key={item.q} className={`bc-faq-item ${isOpen ? "bc-faq-item-open" : ""}`}>
                                <button
                                    className="bc-faq-q"
                                    onClick={() => toggle(i)}
                                    aria-expanded={isOpen}
                                    aria-controls={`faq-answer-${i}`}
                                >
                                    {item.q}
                                    <span className="bc-faq-icon" aria-hidden="true">+</span>
                                </button>
                                {/* Height animates via CSS grid-template-rows (0fr → 1fr) so we
                                    never need to measure scrollHeight or touch layout in JS. */}
                                <div className="bc-faq-a" id={`faq-answer-${i}`} role="region">
                                    <p>{item.a}</p>
                                </div>
                            </div>
                        );
                    })}
                </Reveal>
            </div>
        </section>
    );
}