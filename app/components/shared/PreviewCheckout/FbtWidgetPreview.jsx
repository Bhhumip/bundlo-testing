//import React, { useRef, useState, useEffect } from "react";
import React from "react";
const PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#e5e7eb"/>
            <text x="50" y="55" font-family="sans-serif" font-size="12" fill="#9ca3af" text-anchor="middle">Image</text>
        </svg>
    `);

const MOCK_CART_ITEM = {
    title: "Hydrating Face Wash",
    price: "299",
    image: PLACEHOLDER,
};

const MOCK_FBT_ITEMS = [
    // to show discountValue badge 
    { title:  "Toner Mist with Rose Extract", price: "199", image: PLACEHOLDER, checked: true, discountValue: 15 },
    { title: "Aloe Gel", price: "149", image: PLACEHOLDER, checked: true, discountValue: 10 },
];

export function FbtWidgetPreview({ theme, isMobileView }) {
    // const scrollRef = useRef(null);
    // const [canScrollLeft, setCanScrollLeft] = useState(false);
    // const [canScrollRight, setCanScrollRight] = useState(false);

    const cols = isMobileView
        ? 1
        : Math.min(2, Number(theme.itemsPerRow) || 2);

    const {
        widgetBackground = "#f5f5f0",
        cardBackground = "#ffffff",
        borderColor = "#e0e0e0",
        borderWidth = 1,
        borderRadius = 12,
        buttonVariant = "outline",
        buttonColor = "#262626",
        buttonRadius = 8,
        imageRadius = 10,
        imageSize = 52,
        titleColor = "#191919",
        titleSize = 13,
        priceColor = "#6b7280",
        showPrice = true,
        showBadge = true,        // show badge 
        badgeColor = "#22c55e",  // badge color
        discountValue = 10,      // discount value to show in badge
        showDivider = true,
        titleFbt = "Frequently bought together",
        layoutDirection = "vertical",
        // showScrollArrows = false,
        // mobileLayout = "stack",
        gap = "normal",
        padding = 12,
        imageRatio = "1:1",
        cardAlignment = "top",
        textAlignment = "left",
    } = theme;

    const gapPx = gap === "tight" ? 6 : gap === "loose" ? 20 : 12;
    const gapValue = `${gapPx}px`;
    const isStretch = cardAlignment === "stretch";

    const isVertical = layoutDirection === "vertical";
    const isHorizontal = layoutDirection === "horizontal";
    const isGrid = layoutDirection === "grid";

    // const isMobileStack = isMobileView && mobileLayout === "stack";
    // const isMobileScroll = isMobileView && mobileLayout === "scroll";

    // const isSlider = isMobileView
    //     ? isMobileScroll
    //     : (isHorizontal && showScrollArrows);
    const isSlider = false;

    // const updateScrollState = () => {
    //     const el = scrollRef.current;
    //     if (!el) return;
    //     setCanScrollLeft(el.scrollLeft > 2);
    //     setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
    // };

    // useEffect(() => {
    //     const el = scrollRef.current;
    //     if (!el || !isSlider) return;
    //     updateScrollState();
    //     el.addEventListener("scroll", updateScrollState, { passive: true });
    //     return () => el.removeEventListener("scroll", updateScrollState);
    // }, [isSlider]);

    // useEffect(() => {
    //     if (isSlider) setTimeout(updateScrollState, 50);
    // }, [isSlider, cols]);

    // const doScroll = (dir) => {
    //     const el = scrollRef.current;
    //     if (!el) return;
    //     el.scrollBy({ left: dir * el.offsetWidth * 0.75, behavior: "smooth" });
    // };

    const btnStyle = {
        fontSize: "11px", padding: "5px 14px",
        borderRadius: `${buttonRadius}px`,
        cursor: "pointer", fontWeight: 500,
        border: buttonVariant === "plain"
            ? "none"
            : `${borderWidth}px solid ${buttonColor}`,
        background: buttonVariant === "filled" ? buttonColor : "transparent",
        color: buttonVariant === "filled" ? "#fff" : buttonColor,
        whiteSpace: "nowrap",
    };


    // const ArrowBtn = ({ dir, disabled }) => (
    //     <div
    //         onClick={() => !disabled && doScroll(dir)}
    //         style={{
    //             width: "24px",
    //             height: "24px",
    //             borderRadius: "50%",
    //             background: disabled ? "#f3f4f6" : "#fff",
    //             border: `1px solid ${disabled ? "#e5e7eb" : "#d1d5db"}`,
    //             boxShadow: disabled ? "none" : "0 2px 4px rgba(0,0,0,.1)",
    //             display: "flex",
    //             alignItems: "center",
    //             justifyContent: "center",
    //             fontSize: "11px",
    //             fontWeight: "bold",
    //             color: disabled ? "#d1d5db" : "#374151",
    //             cursor: disabled ? "default" : "pointer",
    //             flexShrink: 0,
    //             userSelect: "none",
    //             transition: "all .15s",
    //         }}
    //     >
    //         {dir === -1 ? "❮" : "❯"}
    //     </div>
    // );

    const ratioPadding = imageRatio === "4:5" ? "125%" : imageRatio === "16:9" ? "56.25%" : "100%";

    const PlusSep = ({ inline = false }) =>
        showDivider ? (
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                color: priceColor, fontSize: "13px", flexShrink: 0,
                ...(inline
                    ? { padding: "0 2px", alignSelf: "center" }
                    : { margin: "4px 0", width: "100%" }
                ),
            }}>＋</div>
        ) : null;

    const renderCard = (item, isAnchor = false) => {
        const isCenterText = textAlignment === "center";
        const isRightText = textAlignment === "right";

        //const forceColumn = isSlider;
        const forceColumn = false;

        const innerDir = (isCenterText || forceColumn) ? "column" : "row";
        const innerAlign = (isCenterText || forceColumn) ? "center" : "flex-start";

        return (
            <div style={{
                background: cardBackground,
                border: `${borderWidth}px solid ${borderColor}`,
                borderRadius: `${borderRadius}px`,
                padding: "10px", boxSizing: "border-box",
                width: "100%", display: "flex", flexDirection: "column",
                height: isStretch ? "100%" : "auto",
            }}>
                <div style={{
                    display: "flex", flexDirection: innerDir,
                    gap: "8px", alignItems: innerAlign,
                    flex: isStretch ? "1 1 auto" : "0 0 auto",
                    width: "100%",
                }}>
                    {!isAnchor && !isCenterText && !forceColumn && (
                        <div style={{
                            width: "14px", height: "14px", borderRadius: "3px",
                            border: `1.5px solid ${buttonColor}`,
                            background: item.checked ? buttonColor : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, marginTop: "2px",
                        }}>
                            {item.checked && <span style={{ color: "#fff", fontSize: "9px", lineHeight: 1 }}>✓</span>}
                        </div>
                    )}

                    <div style={{ position: "relative", width: forceColumn ? "100%" : `${imageSize}px`, flexShrink: 0 }}>
                        {!isAnchor && (isCenterText || forceColumn) && (
                            <div style={{
                                position: "absolute", top: "4px", left: "4px", zIndex: 2,
                                width: "14px", height: "14px", borderRadius: "3px",
                                border: `1.5px solid ${buttonColor}`,
                                background: item.checked ? buttonColor : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                {item.checked && <span style={{ color: "#fff", fontSize: "9px", lineHeight: 1 }}>✓</span>}
                            </div>
                        )}
                        <img src={item.image} alt={item.title} style={{
                            width: "100%",
                            height: forceColumn ? "auto" : (imageRatio === "1:1" ? `${imageSize}px` : "0"),
                            aspectRatio: forceColumn ? "1 / 1" : "unset",
                            paddingBottom: (!forceColumn && imageRatio !== "1:1") ? ratioPadding : "0",
                            borderRadius: `${imageRadius}px`,
                            objectFit: "cover", background: "#eee", display: "block",
                            opacity: isAnchor ? 0.5 : 1,
                        }} />
                    </div>

                    <div style={{
                        flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px",
                        alignItems: (isCenterText || forceColumn) ? "center" : isRightText ? "flex-end" : "flex-start",
                        textAlign: (forceColumn ? "center" : textAlignment),
                        width: forceColumn ? "100%" : "auto",
                    }}>
                        <span style={{
                            fontSize: `${titleSize}px`, fontWeight: 600,
                            color: titleColor, opacity: isAnchor ? 0.6 : 1,
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                        }}>
                            {item.title}
                        </span>
                        <span style={{
                            fontSize: "11px", color: priceColor,
                            marginTop: isStretch ? "auto" : "0",
                        }}>
                            {isAnchor ? "Already in cart" : showPrice ? `Rs. ${item.price}` : ""}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const allItems = [
        { ...MOCK_CART_ITEM, isAnchor: true },
        ...MOCK_FBT_ITEMS.map((i) => ({ ...i, isAnchor: false })),
    ];



    const anchorItem = allItems[0];
    const recommendationItems = allItems.slice(1);

    const renderVertical = () => (
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            {/* Only recommendation items — anchor is already rendered above,
                so we skip it here to avoid showing it twice. */}
            {recommendationItems.map((item, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <PlusSep />}
                    {renderCard(item, false)}
                </React.Fragment>
            ))}
        </div>
    );

    // const renderSlider = () => {
    //     const visibleCards = isMobileView ? 1.3 : 2;
    //     const cardWidthPercent = `calc((100% - ${(Math.ceil(visibleCards) - 1) * (gapPx + 20)}px) / ${visibleCards})`;

    //     return (
    //         <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "4px", width: "100%" }}>
    //             <ArrowBtn dir={-1} disabled={!canScrollLeft} />
    //             <div
    //                 ref={scrollRef}
    //                 style={{
    //                     display: "flex", flexDirection: "row",
    //                     alignItems: isStretch ? "stretch" : "flex-start",
    //                     flex: 1, minWidth: 0, overflowX: "auto",
    //                     scrollbarWidth: "none", gap: gapValue,
    //                 }}
    //             >
    //                 {recommendationItems.map((item, i) => (
    //                     <React.Fragment key={i}>
    //                         {i > 0 && <PlusSep inline />}
    //                         <div style={{
    //                             flex: `0 0 ${cardWidthPercent}`, minWidth: 0,
    //                             alignSelf: isStretch ? "stretch" : "flex-start",
    //                             display: "flex",
    //                         }}>
    //                             {renderCard(item, item.isAnchor)}
    //                         </div>
    //                     </React.Fragment>
    //                 ))}
    //             </div>
    //             <ArrowBtn dir={1} disabled={!canScrollRight} />
    //         </div>
    //     );
    // };

    const renderRowsOf = (numCols) => {
        const rows = [];
        // Only recommendation items — anchor is already shown above,
        // so we skip it here to avoid showing it twice.
        for (let i = 0; i < recommendationItems.length; i += numCols) {
            rows.push(recommendationItems.slice(i, i + numCols));
        }
        return (
            <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 0 }}>
                {rows.map((row, ri) => (
                    <React.Fragment key={ri}>
                        {ri > 0 && <PlusSep />}
                        <div style={{
                            display: "flex", flexDirection: "row",
                            alignItems: isStretch ? "stretch" : "flex-start",
                            width: "100%", gap: 0,
                        }}>
                            {row.map((item, ci) => (
                                <React.Fragment key={ci}>
                                    {ci > 0 && <PlusSep inline />}
                                    <div style={{
                                        flex: "1 1 0", minWidth: 0,
                                        alignSelf: isStretch ? "stretch" : "flex-start",
                                        display: "flex",
                                    }}>
                                        {renderCard(item, item.isAnchor)}
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </React.Fragment>
                ))}
            </div>
        );
    };

    const renderRecommendationGrid = () => {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
                gap: gapValue,
                width: "100%",
                alignItems: isStretch ? "stretch" : "start",
            }}
        >
            {recommendationItems.map((item, i) => (
                <div key={i} style={{
                    display: "flex",
                    height: isStretch ? "100%" : "auto",
                }}>
                    {renderCard(item, false)}
                </div>
            ))}
        </div>
    );
};

    const content = (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: gapValue,
                width: "100%",
            }}
        >
            {/* Anchor product */}
            {renderCard(anchorItem, true)}

            {/* Separator */}
            <PlusSep />

            {/* Recommendations */}
            {/* Render based on layoutDirection: vertical,
                horizontal, grid.*/}
            {/* {isSlider
                ? renderSlider()
                : isVertical
                    ? renderVertical()
                    : isHorizontal
                        ? renderRowsOf(Math.min(2, Number(theme.itemsPerRow) || 2))
                        : renderRecommendationGrid()} */}
             {isVertical
                ? renderVertical()
                : isHorizontal
                    ? renderRowsOf(Math.min(2, Number(theme.itemsPerRow) || 2))
                    : renderRecommendationGrid()}           
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
            {/* header */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 4px" }}>
                <div style={{ flex: 1, height: "0.5px", background: borderColor }} />
                <p style={{
                    fontSize: `${titleSize}px`, color: titleColor,
                    fontWeight: 600, margin: 0, whiteSpace: "nowrap",
                }}>
                    🛒 {titleFbt}
                </p>
                <div style={{ flex: 1, height: "0.5px", background: borderColor }} />
            </div>

            {/* widget body */}
            <div style={{
                background: widgetBackground,
                border: `${borderWidth}px solid ${borderColor}`,
                borderRadius: `${borderRadius}px`,
                padding: `${padding}px`,
                display: "flex", flexDirection: "column", gap: gapValue,
                width: "100%", boxSizing: "border-box", overflow: "hidden",
            }}>
                {content}

                {/* footer */}
                <div style={{ height: "0.5px", background: borderColor, margin: "2px 0" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px", alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "11px", color: priceColor }}>2 items selected</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: `${titleSize}px`, fontWeight: 600, color: titleColor }}>
                                Total: Rs. 348
                            </span>
                            {showBadge && discountValue && (
                                <span style={{
                                    display: "inline-block",
                                    fontSize: "10px",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    background: `${badgeColor}22`,
                                    color: badgeColor,
                                    fontWeight: 600,
                                }}>
                                    Save {discountValue}%
                                </span>
                            )}
                        </div>
                    </div>
                    <button style={btnStyle}>Add selected</button>
                </div>
            </div>
        </div>
    );
}