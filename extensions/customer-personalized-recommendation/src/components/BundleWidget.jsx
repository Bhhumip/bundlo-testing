// components/BundleWidget.jsx
import { useState } from "preact/hooks";
import { resolveTheme } from "../config/resolveTheme.js";
import { WidgetShell, CardList } from "./SharedCard.jsx";
import { BundleCard } from "./BundleCard.jsx";
import { PageNav } from "./PageNav.jsx";
import { DEFAULT_THEME } from "../config/theme.js";

const PAGE_SIZE = 3;

export function BundleWidget({ bundles, i18n, showError, onAdd, theme = DEFAULT_THEME }) {
    const rt = resolveTheme(theme);

    const [pageIndex, setPageIndex] = useState(0);
    const [removedIds, setRemovedIds] = useState(new Set());

    const visible = bundles.filter(b => !removedIds.has(b.shopifyVariantId ?? b.title));
    const totalPages = Math.ceil(visible.length / PAGE_SIZE);
    const safeIndex = Math.min(pageIndex, Math.max(0, totalPages - 1));
    const pageItems = visible.slice(safeIndex * PAGE_SIZE, safeIndex * PAGE_SIZE + PAGE_SIZE);

    function handleRemove(bundle) {
        setRemovedIds(prev => new Set([...prev, bundle.shopifyVariantId ?? bundle.title]));
        if (pageItems.length === 1 && safeIndex > 0) setPageIndex(p => p - 1);
    }

    if (visible.length === 0) return null;

    return (
        <WidgetShell
            title={rt.titleBundle}
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
                renderCard={(bundle, i) => (
                    <BundleCard
                        key={bundle.shopifyVariantId ?? i}
                        bundle={bundle}
                        i18n={i18n}
                        showError={showError}
                        onAddBundle={onAdd}
                        onRemove={handleRemove}
                        rt={rt}
                    />
                )}
            />
        </WidgetShell>
    );
}