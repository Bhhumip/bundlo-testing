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

const MOCK_ITEMS = [
    // to show discountValue badge 
    { title: "Vitamin C Serum ", price: "499", image: PLACEHOLDER, discountValue: 15 },
    { title: "Night Cream", price: "349", image: PLACEHOLDER, discountValue: 10 },
];

export function RecommendationCardPreview({ theme, isMobileView }) {
    // const scrollRef = useRef(null);
    // const [canScrollLeft, setCanScrollLeft] = useState(false);
    // const [canScrollRight, setCanScrollRight] = useState(false);

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
        badgeColor = "#22c55e",
        titleColor = "#191919",
        titleSize = 13,
        priceColor = "#6b7280",
        showPrice = true,
        showBadge = true,
        showDivider = true,
        titleRecommendations = "You may also like",
        // Position tab keys
        layoutDirection = "vertical",
        itemsPerRow = 2,
        gap = "normal",
        padding = 12,
        alignment = "left",
        widgetMaxWidth = "100%",
        textAlignment = "left",
        cardAlignment = "top",
        imageRatio = "1:1",
    } = theme;

    const gapPx = gap === "tight" ? 6 : gap === "loose" ? 16 : 10;
    const alignSelf = alignment === "center" ? "center" : alignment === "right" ? "flex-end" : "flex-start";
    const maxWidth = widgetMaxWidth === "100%" ? "100%" : widgetMaxWidth;
    const isStretch = cardAlignment === "stretch";
    // grid aur horizontal handle
    const isGrid = layoutDirection === "grid";
    const isHorizontal = layoutDirection === "horizontal";
    const cols = isMobileView ? 1 : Math.min(4, Number(itemsPerRow) || 2);

    // Mobile scroll + horizontal show arrows logic
    // const {
    //     mobileLayout = "stack",
    //     showScrollArrows = false,
    // } = theme;
    // const isMobileScroll = isMobileView && mobileLayout === "scroll";
    // const isSlider = isMobileView
    //     ? isMobileScroll
    //     : (isHorizontal && showScrollArrows);

    // const isMobileStack = isMobileView && mobileLayout === "stack";
const isSlider = false;
//const isMobileStack = false;
    
    const widgetStyle = {
        background: widgetBackground,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: `${borderRadius}px`,
        padding: `${padding}px`,
        //display: isMobileStack ? "flex" : (isGrid ? "grid" : "flex"),
        display: isGrid ? "grid" : "flex",
        //gridTemplateColumns: (isGrid && !isMobileStack) ? `repeat(${cols}, minmax(0, 1fr))` : undefined,
        gridTemplateColumns: isGrid
    ? `repeat(${cols}, minmax(0, 1fr))`
    : undefined,
        //flexDirection: isMobileStack ? "column" : (isSlider ? "row" : isGrid ? undefined : (isHorizontal ? "row" : "column")),
        flexDirection: isGrid? undefined: (isHorizontal ? "row" : "column"),
        //alignItems: isSlider ? "center" : (isStretch ? "stretch" : "start"),
        alignItems: isStretch ? "stretch" : "start",
        //flexWrap: (isHorizontal && !isMobileStack) ? "wrap" : undefined,
        flexWrap: isHorizontal ? "wrap" : undefined,
        gap: `${gapPx}px`,
        boxSizing: "border-box",
        width: "100%",
        overflow: "hidden",
    };
    const cardStyle = {
        background: cardBackground,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: `${borderRadius}px`,
        padding: `${padding}px`,
    };
    const btnStyle = {
        fontSize: "11px",
        padding: "5px 10px",
        borderRadius: `${buttonRadius}px`,
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontWeight: 500,
        border: buttonVariant === "plain"
            ? "none"
            : `${borderWidth}px solid ${buttonColor}`,
        background: buttonVariant === "filled" ? buttonColor : "transparent",
        color: buttonVariant === "filled" ? "#fff" : buttonColor,
        flexShrink: 0,
    };
    const ratioPadding = imageRatio === "4:5" ? "125%" : imageRatio === "16:9" ? "56.25%" : "100%";
    const aspectRatio =
    imageRatio === "4:5"
        ? "4 / 5"
        : imageRatio === "16:9"
            ? "16 / 9"
            : "1 / 1";

    // Scroll functions for slider mode
    // const updateScrollState = () => {
    //     const el = scrollRef.current;
    //     if (!el) return;
    //     // setCanScrollLeft(el.scrollLeft > 2);
    //     // setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
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

    // const ArrowBtn = ({ dir, disabled }) => (
    //     <div
    //         onClick={() => !disabled && doScroll(dir)}
    //         style={{
    //             width: "24px", height: "24px", borderRadius: "50%",
    //             background: disabled ? "#f3f4f6" : "#fff",
    //             border: `1px solid ${disabled ? "#e5e7eb" : "#d1d5db"}`,
    //             boxShadow: disabled ? "none" : "0 2px 4px rgba(0,0,0,.1)",
    //             display: "flex", alignItems: "center", justifyContent: "center",
    //             fontSize: "11px", fontWeight: "bold",
    //             color: disabled ? "#d1d5db" : "#374151",
    //             cursor: disabled ? "default" : "pointer",
    //             flexShrink: 0, userSelect: "none",
    //         }}
    //     >
    //         {dir === -1 ? "❮" : "❯"}
    //     </div>
    // );

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: alignSelf, width: "100%"  }}>
            <div style={{ width: maxWidth, maxWidth: "100%",display: "flex", flexDirection: "column", gap: "6px" }}>
                {/* widget title */}
                <p
                    style={{
                        fontSize: `${titleSize}px`,
                        color: titleColor,
                        fontWeight: 600,
                        textAlign: textAlignment,
                        margin: "0 0 4px",
                    }}
                >
                    {titleRecommendations}
                </p>

                <div style={widgetStyle}>
                    {/* {isSlider && (
                        <>
                            <ArrowBtn dir={-1} disabled={!canScrollLeft} />
                        </>
                    )} */}
                    <div
                        //ref={isSlider ? scrollRef : null}
                        ref={null}
                        // style={isSlider ? {
                        //     display: "flex", flexDirection: "row",
                        //     alignItems: isStretch ? "stretch" : "flex-start",
                        //     flex: 1, minWidth: 0, overflowX: "auto",
                        //     scrollbarWidth: "none", gap: `${gapPx}px`,
                        // } : { display: "contents" }}
                        style={{ display: "contents" }}
                    >
                   {MOCK_ITEMS.map((item, i) => {
                        const isCenterText = textAlignment === "center";
                        const isRightText = textAlignment === "right";
                        const forceColumn = isSlider || isGrid ||isHorizontal;
                        const innerDir = forceColumn ? "column" : "row";
                        const innerAlign = forceColumn
    ? (isRightText
        ? "flex-end"
        : isCenterText
        ? "center"
        : "flex-start")
    : "flex-start";

                        return (
                        <div key={i} style={{
                           // flex: isSlider? `0 0 ${isMobileView ? "75%" : "45%"}`: (isHorizontal? `0 0 calc((100% - ${(cols - 1) * gapPx}px) / ${cols})`: undefined),
                            flex: isHorizontal? `0 0 calc((100% - ${(cols - 1) * gapPx}px) / ${cols})`: undefined,
                            minWidth: 0,
                            display: "flex",
                            flexDirection: "column",
                            alignSelf: isStretch ? "stretch" : "flex-start",
                        }}>
                            <div style={{ ...cardStyle, flex: isStretch ? "1 1 auto" : "0 0 auto" }}>

    <div
        style={{
            display: "flex",
            flexDirection: innerDir,
            gap: "10px",
            alignItems: innerAlign,
            width: "100%",
        }}
    >
                                    <div
                                        style={{
                                            position: "relative",
                                            width: `${imageSize}px`,
                                            margin:
    forceColumn
        ? "0 auto"
        : undefined,
                                            flexShrink: 0,
                                        }}
                                    >
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            style={{
                                                width: "100%",
                                                height: "auto",
                                                aspectRatio,
                                                borderRadius: `${imageRadius}px`,
                                                objectFit: "cover",
                                                background: "#eee",
                                                display: "block",
                                            }}
                                        />
                                    </div>
                                        <div
                                            style={{
                                                flex: 1,
                                                minWidth: 0,
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "3px",
                                                alignItems: isRightText
                                                ? "flex-end"
                                                : isCenterText
                                                    ? "center"
                                                    : "flex-start",
                                                textAlign: textAlignment,
                                            }}
                                        >
                                        <span
                                            style={{
                                                fontSize: `${titleSize}px`,
                                                fontWeight: 600,
                                                color: titleColor,
                                            }}
                                        >
                                            {item.title}
                                        </span>
                                        {showPrice && (
                                            <span style={{ fontSize: "12px", color: priceColor }}>
                                                Rs. {item.price}
                                            </span>
                                        )}
                                        {showBadge && item.discountValue && (
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    fontSize: "10px",
                                                    padding: "1px 7px",
                                                    borderRadius: "10px",
                                                    background: `${badgeColor}22`,
                                                    color: badgeColor,
                                                    fontWeight: 500,
                                                    width: "fit-content",
                                                    marginTop: "2px",
                                                }}
                                            >
                                                Save {item.discountValue}%
                                            </span>
                                        )}
                                    </div>
                                     {!forceColumn && (
                                        <button style={btnStyle}>+ Add</button>
                                    )}

                            </div>

                                   {/* GRID/HORIZONTAL BUTTON */}
                                    {forceColumn && (
                                        <div
                                            style={{
                                                marginTop: "8px",
                                                display: "flex",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <button style={btnStyle}>+ Add</button>
                                        </div>
                                    )}

                                </div>

                                {/* DIVIDER YAHAN HOGA — CARD KE BAHAR */}
                                {showDivider && i < MOCK_ITEMS.length - 1 && (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: priceColor,
                                        fontSize: "13px",
                                        flexShrink: 0,
                                        ...(isHorizontal
                                            ? { padding: "8px 0", width: "100%", justifyContent: "center" }
                                            : isGrid
                                                ? { padding: "0 4px", alignSelf: "center" }
                                                : { margin: "6px 0", width: "100%", gap: "6px", flex: "0 0 auto" }
                                        ),
                                    }}
                                >
                                    {isHorizontal || isGrid ? (
                                        <span>＋</span>
                                    ) : (
                                        <>
                                            <div style={{ flex: 1, height: "0.5px", background: borderColor }} />
                                            <span style={{ fontSize: "10px" }}>＋</span>
                                            <div style={{ flex: 1, height: "0.5px", background: borderColor }} />
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        );
                    })}
                    </div>
                    {/* {isSlider && (
                        <ArrowBtn dir={1} disabled={!canScrollRight} />
                    )} */}
                </div>
            </div>
        </div>
    );
}