import { useEffect, useState } from "react";

const LINKS = [
    { id: "bundle-types", label: "Bundle Types" },
    { id: "upsell-widgets", label: "Upsell Widgets" },
    { id: "features", label: "Features" },
    { id: "faq", label: "FAQ" },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [activeId, setActiveId] = useState("");
    function handleNavClick(e, id) {
        e.preventDefault();
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth" });
        // Keep the URL fragment in sync without letting the router's own
        // history handling (and ScrollRestoration) fight the manual scroll.
        window.history.replaceState(null, "", `#${id}`);
    }


    const handleInstallClick = (e) => {
        e.preventDefault();
        document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => document.getElementById("shop")?.focus(), 450);
    };

    // Sticky nav shadow once the page scrolls.
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Highlight the nav link for whichever section is in view.
    useEffect(() => {
        const sections = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean);
        if (!sections.length) return;

        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveId(entry.target.id);
                });
            },
            { threshold: 0.4 }
        );

        sections.forEach((s) => io.observe(s));
        return () => io.disconnect();
    }, []);

    return (
        <div className="bc-nav-outer">
            <nav className={`bc-nav ${scrolled ? "bc-nav-scrolled" : ""}`} aria-label="Primary">
                <div className="bc-nav-inner">
                    <a href="#top" className="bc-wordmark" onClick={(e) => handleNavClick(e, "top")}>
                        <img src="/Logo.jpg" alt="Propero" className="bc-nav-logo" />
                        <span>Bundlo Bundle-Builder</span>
                    </a>

                    <ul className="bc-nav-links">
                        {LINKS.map((link) => (
                            <li key={link.id}>
                                <a
                                    href={`#${link.id}`}
                                    aria-current={activeId === link.id ? "true" : undefined}
                                    className={activeId === link.id ? "bc-nav-link-active" : ""}
                                    onClick={(e) => handleNavClick(e, link.id)}
                                >
                                    {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>

                    <a className="bc-nav-cta" href="#top" onClick={handleInstallClick}>
                        Install App
                    </a>
                </div>
            </nav>
        </div>
    );
}