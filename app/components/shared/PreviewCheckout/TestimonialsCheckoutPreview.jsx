import React, { useState, useRef, useEffect } from "react";

const PLACEHOLDER =
    "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";

const MOCK_REVIEWS = [
    { id: 1, author: "Bhumika Pawar", rating: 3, title: "Needs Improvement", body: "The product is okay but could be better. Packaging was nice though.", image: PLACEHOLDER },
    { id: 2, author: "Rahul Sharma", rating: 5, title: "Absolutely love it!", body: "Best purchase I've made this year. Will definitely buy again.", image: PLACEHOLDER },
    { id: 3, author: "Priya Mehta", rating: 4, title: "Great quality", body: "Very happy with this. Fast delivery and good quality overall.", image: null },
    { id: 4, author: "Amit Joshi", rating: 5, title: "Highly recommend", body: "Exceeded my expectations. The whole family loves it.", image: PLACEHOLDER },
];

const BORDER_RADIUS_MAP = { none: 0, base: 6, large: 12 };
const GAP_MAP = { tight: 6, base: 12, loose: 20 };
const PADDING_MAP = { tight: 8, base: 12, loose: 20 };
const TITLE_SIZE_MAP = { small: 11, base: 13, large: 15 };

function StarRating({ rating, maxRating = 5, size = 13 }) {
    return (
        <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
            {Array.from({ length: maxRating }).map((_, i) => (
                <svg key={i} width={size} height={size} viewBox="0 0 24 24"
                    fill={i < Math.floor(rating) ? "#f59e0b" : "none"}
                    stroke="#f59e0b" strokeWidth="1.5" style={{ flexShrink: 0 }}>
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
            ))}
        </div>
    );
}

export function TestimonialsCheckoutPreview({ theme, isMobileView }) {
    const [currentPage, setCurrentPage] = useState(0);
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const {
        testimonialsTitle = "What customers are saying",
        showReviewImage = true,
        showReviewTitle = true,
        showReviewBody = true,
        showReviewAuthor = true,
        showOverallRating = true,
        paginationStyle = "arrows",
        reviewsPerPage = 1,
        textAlignment = "left",
        buttonVariant = "outline",
        borderRadius = "large",
        gap = "base",
        padding = "base",
        titleSize = "base",
        layoutDirection = "vertical",
        itemsPerRow = 2,
        reviewsToShow = 4,
    } = theme;

    const radiusPx = BORDER_RADIUS_MAP[borderRadius] ?? 12;
    const gapPx = GAP_MAP[gap] ?? 12;
    const paddingPx = PADDING_MAP[padding] ?? 12;
    const titlePx = TITLE_SIZE_MAP[titleSize] ?? 13;

    const C = {
        title: "#191919",
        body: "#6b7280",
        border: "#e0e0e0",
        cardBg: "#ffffff",
        widgetBg: "#f9fafb",
        btn: "#262626",
    };

    const avgRating = (MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / MOCK_REVIEWS.length).toFixed(1);

    const isCarousel = layoutDirection === "horizontal";
    const displayList = MOCK_REVIEWS.slice(0, Math.min(reviewsToShow, MOCK_REVIEWS.length));
    const totalPages = Math.ceil(displayList.length / reviewsPerPage);

    // For vertical/grid: apply pagination
    const pagedList = (paginationStyle !== "none" && !isCarousel)
        ? displayList.slice(currentPage * reviewsPerPage, currentPage * reviewsPerPage + reviewsPerPage)
        : displayList;

    // Carousel scroll tracking
    const updateScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 2);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !isCarousel) return;
        updateScroll();
        el.addEventListener("scroll", updateScroll, { passive: true });
        return () => el.removeEventListener("scroll", updateScroll);
    }, [isCarousel]);

    useEffect(() => {
        if (isCarousel) setTimeout(updateScroll, 50);
    }, [isCarousel]);

    // Reset page when layout changes
    useEffect(() => { setCurrentPage(0); }, [layoutDirection, reviewsPerPage, reviewsToShow]);

    const doScroll = (dir) => {
        const el = scrollRef.current;
        if (el) el.scrollBy({ left: dir * 280, behavior: "smooth" });
    };

    const btnStyle = {
        fontSize: "11px",
        padding: "4px 12px",
        borderRadius: `${radiusPx}px`,
        cursor: "pointer",
        fontWeight: 500,
        border: buttonVariant === "plain" ? "none" : `1px solid ${C.btn}`,
        background: buttonVariant === "filled" ? C.btn : "transparent",
        color: buttonVariant === "filled" ? "#fff" : C.btn,
        whiteSpace: "nowrap",
    };

    // ── Review card ───────────────────────────────────────────────────────
    const ReviewCard = ({ review, carousel = false }) => (
        <div style={{
            background: C.cardBg,
            border: `1px solid ${C.border}`,
            borderRadius: `${radiusPx}px`,
            padding: `${paddingPx}px`,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "row",
            gap: `${gapPx}px`,
            alignItems: "flex-start",
            // Carousel: fixed width so cards peek
            ...(carousel ? { flex: "0 0 260px" } : { width: "100%" }),
        }}>
            {/* Avatar */}
            {showReviewImage && (
                review.image
                    ? <img src={review.image} alt={review.author} style={{
                        width: "44px", height: "44px", objectFit: "cover",
                        borderRadius: `${radiusPx * 0.6}px`, flexShrink: 0, background: "#eee",
                    }} />
                    : <div style={{
                        width: "44px", height: "44px", flexShrink: 0,
                        borderRadius: `${radiusPx * 0.6}px`, background: "#e5e7eb",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "16px", color: "#9ca3af", fontWeight: 600,
                    }}>{review.author[0]}</div>
            )}

            {/* Content */}
            <div style={{
                flex: 1, minWidth: 0,
                display: "flex", flexDirection: "column", gap: "3px",
                textAlign: textAlignment,
                alignItems: textAlignment === "center" ? "center" : textAlignment === "right" ? "flex-end" : "flex-start",
            }}>
                <StarRating rating={review.rating} size={titlePx} />
                {showReviewTitle && (
                    <span style={{ fontSize: `${titlePx}px`, fontWeight: 600, color: C.title }}>
                        {review.title}
                    </span>
                )}
                {showReviewBody && (
                    <span style={{ fontSize: "11px", color: C.body, lineHeight: 1.4 }}>
                        {review.body}
                    </span>
                )}
                {showReviewAuthor && (
                    <span style={{ fontSize: "11px", color: C.body, fontStyle: "italic", marginTop: "2px" }}>
                        — {review.author}
                    </span>
                )}
            </div>
        </div>
    );

    // ── VERTICAL (stacked, paginated) ─────────────────────────────────────
    const renderVertical = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: `${gapPx}px` }}>
            {pagedList.map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
    );

    // ── GRID (n-column, paginated) ────────────────────────────────────────
    const cols = isMobileView ? 1 : Math.max(1, Math.min(3, Number(itemsPerRow) || 2));
    const renderGrid = () => (
        <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: `${gapPx}px`,
        }}>
            {pagedList.map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
    );

    // ── HORIZONTAL CAROUSEL ───────────────────────────────────────────────
    const renderCarousel = () => (
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "6px" }}>
            <button
                onClick={() => doScroll(-1)}
                disabled={!canScrollLeft}
                style={{
                    ...btnStyle,
                    padding: "5px 10px",
                    opacity: canScrollLeft ? 1 : 0.3,
                    cursor: canScrollLeft ? "pointer" : "default",
                    flexShrink: 0,
                }}
            >❮</button>

            <div ref={scrollRef} style={{
                display: "flex",
                flexDirection: "row",
                gap: `${gapPx}px`,
                overflowX: "auto",
                scrollbarWidth: "none",
                flex: 1,
                minWidth: 0,
                WebkitOverflowScrolling: "touch",
            }}>
                {displayList.map((r) => <ReviewCard key={r.id} review={r} carousel />)}
            </div>

            <button
                onClick={() => doScroll(1)}
                disabled={!canScrollRight}
                style={{
                    ...btnStyle,
                    padding: "5px 10px",
                    opacity: canScrollRight ? 1 : 0.3,
                    cursor: canScrollRight ? "pointer" : "default",
                    flexShrink: 0,
                }}
            >❯</button>
        </div>
    );

    // ── Pagination (vertical + grid only) ────────────────────────────────
    const renderPagination = () => {
        if (isCarousel || paginationStyle === "none" || totalPages <= 1) return null;
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "4px" }}>
                {paginationStyle === "arrows" && (
                    <>
                        <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            style={{ ...btnStyle, opacity: currentPage === 0 ? 0.35 : 1, cursor: currentPage === 0 ? "default" : "pointer" }}>
                            ← Prev
                        </button>
                        <span style={{ fontSize: "11px", color: C.body }}>
                            {currentPage + 1} / {totalPages}
                        </span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                            style={{ ...btnStyle, opacity: currentPage >= totalPages - 1 ? 0.35 : 1, cursor: currentPage >= totalPages - 1 ? "default" : "pointer" }}>
                            Next →
                        </button>
                    </>
                )}
                {paginationStyle === "dots" && Array.from({ length: totalPages }).map((_, i) => (
                    <div key={i} onClick={() => setCurrentPage(i)} style={{
                        width: i === currentPage ? "18px" : "7px",
                        height: "7px", borderRadius: "9999px",
                        background: i === currentPage ? C.btn : C.border,
                        cursor: "pointer", transition: "all .2s",
                    }} />
                ))}
            </div>
        );
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
            <div style={{
                background: C.widgetBg,
                border: `1px solid ${C.border}`,
                borderRadius: `${radiusPx}px`,
                padding: `${paddingPx}px`,
                boxSizing: "border-box",
                display: "flex", flexDirection: "column",
                gap: `${gapPx}px`,
            }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                    <span style={{ fontSize: `${titlePx}px`, fontWeight: 700, color: C.title }}>
                        {testimonialsTitle}
                    </span>
                    {showOverallRating && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <StarRating rating={parseFloat(avgRating)} size={titlePx} />
                            <span style={{ fontSize: "11px", color: C.body }}>
                                {avgRating} · {MOCK_REVIEWS.length} reviews
                            </span>
                        </div>
                    )}
                </div>

                <div style={{ height: "1px", background: C.border }} />

                {/* Layout */}
                {isCarousel
                    ? renderCarousel()
                    : layoutDirection === "grid"
                        ? renderGrid()
                        : renderVertical()
                }

                {/* Pagination */}
                {renderPagination()}
            </div>
        </div>
    );
}