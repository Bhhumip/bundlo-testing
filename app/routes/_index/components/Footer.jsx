import Reveal from "./Reveal";
function handleInstallClick(e) {
    e.preventDefault();
    document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => document.getElementById("shop")?.focus(), 450);
}

function handleFooterNavClick(e, id) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth" });
    window.history.replaceState(null, "", `#${id}`);
}
export default function Footer() {
    return (
        <>
            <Reveal as="section" className="bc-footer-cta bc-wrap">
                <h2>Ready to build your first bundle?</h2>
                <p>Install Bundlo and set up your first bundle in minutes.</p>
                <a className="bc-btn-primary" href="#top" onClick={handleInstallClick}>
                    Install App
                </a>
            </Reveal>

            <footer className="bc-footer bc-wrap">
                <span>© {new Date().getFullYear()} Bundlo. All rights reserved.</span>
                <nav className="bc-footer-links" aria-label="Footer">
                    <a href="#bundle-types" onClick={(e) => handleFooterNavClick(e, "bundle-types")}>
                        Bundle Types
                    </a>
                    <a href="#upsell-widgets" onClick={(e) => handleFooterNavClick(e, "upsell-widgets")}>
                        Widgets
                    </a>
                    <a href="#faq" onClick={(e) => handleFooterNavClick(e, "faq")}>
                        FAQ
                    </a>
                </nav>
            </footer>
        </>
    );
}