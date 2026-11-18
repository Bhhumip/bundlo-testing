// components/RecommendationsWidget.jsx
import { useState } from "preact/hooks";
import { resolveTheme } from "../config/resolveTheme.js";
import { WidgetShell, CardList, ProductRow, ProductGridCard } from "./SharedCard.jsx";
import { PageNav } from "./PageNav.jsx";
import { DEFAULT_THEME } from "../config/theme.js";
import { RecommendationCard } from "./RecommendationCard.jsx";

const PLACEHOLDER = "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";
const PAGE_SIZE = 3;


export function RecommendationsWidget({ recommendations, showError, onAdd, title, theme = DEFAULT_THEME }) {
    const rt = resolveTheme(theme);
    console.log("RT:", rt.imgCol, rt.isGrid, rt.isHorizontal);
    const displayTitle = title || rt.titleRecommendations;

    const [removedIds, setRemovedIds] = useState(new Set());
    const [pageIndex, setPageIndex] = useState(0);

    const visible = recommendations.filter(i => !removedIds.has(i.variantId ?? i.title));
    const totalPages = Math.ceil(visible.length / PAGE_SIZE);
    const safeIndex = Math.min(pageIndex, Math.max(0, totalPages - 1));
    const pageItems = visible.slice(safeIndex * PAGE_SIZE, safeIndex * PAGE_SIZE + PAGE_SIZE);

    function handleRemove(item) {
        setRemovedIds(prev => new Set([...prev, item.variantId ?? item.title]));
        if (pageItems.length === 1 && safeIndex > 0) setPageIndex(p => p - 1);
    }

    if (visible.length === 0) return null;
    //.log("[Debug] pageItems sample:", JSON.stringify(pageItems[0]));
    return (
        <WidgetShell
            title={displayTitle}
            rt={rt}
            pageNav={
                <PageNav
                    pageIndex={safeIndex}
                    totalPages={totalPages}
                    onPrev={() => setPageIndex(p => p <= 0 ? totalPages - 1 : p - 1)}
                    onNext={() => setPageIndex(p => p >= totalPages - 1 ? 0 : p + 1)}
                    theme={theme}
                />
            }
        >
            <CardList
                items={pageItems}
                rt={rt}
                renderCard={(item, i) => (
                    <RecommendationCard
                        key={item.variantId ?? item.title ?? i}
                        item={item}
                        rt={rt}
                        onAdd={onAdd}
                        onRemove={handleRemove}
                        showError={showError}
                    />
                )}
            />
        </WidgetShell>
    );
}