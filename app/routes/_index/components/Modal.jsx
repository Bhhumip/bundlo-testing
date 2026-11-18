import { useEffect, useRef } from "react";

export default function Modal({ open, onClose, title, children }) {
    const dialogRef = useRef(null);
    const previouslyFocused = useRef(null);

    useEffect(() => {
        if (!open) return;

        previouslyFocused.current = document.activeElement;
        dialogRef.current?.focus();

        function onKeyDown(e) {
            if (e.key === "Escape") onClose();
            if (e.key === "Tab") {
                const focusables = dialogRef.current?.querySelectorAll(
                    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (!focusables?.length) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }

        document.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
            previouslyFocused.current?.focus?.();
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="bc-modal-overlay" onClick={onClose}>
            <div
                className="bc-modal"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                ref={dialogRef}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    className="bc-modal-close"
                    onClick={onClose}
                    aria-label="Close demo"
                >
                    ×
                </button>
                {children}
            </div>
        </div>
    );
}