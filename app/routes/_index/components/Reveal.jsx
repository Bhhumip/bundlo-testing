import { useEffect, useRef, useState } from "react";

/**
 * Wraps any element and fades/slides it in the first time it scrolls into
 * view. Mirrors the old [data-reveal] IntersectionObserver behavior from
 * the static marketing site.
 */
export default function Reveal({ as: Tag = "div", className = "", delay = 0, children, ...rest }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setVisible(true);
            return;
        }

        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setVisible(true);
                        io.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12 }
        );

        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <Tag
            ref={ref}
            className={`bc-reveal ${visible ? "bc-reveal-visible" : ""} ${className}`}
            style={delay ? { transitionDelay: `${delay}s` } : undefined}
            {...rest}
        >
            {children}
        </Tag>
    );
}