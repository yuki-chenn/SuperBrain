import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useEffect } from 'react';
import { useTabStore } from '../stores/useTabStore';
export function TabBar() {
    const { tabs, activeTabId, setActiveTab, closeTab, closeAllTabs } = useTabStore();
    const closeableCount = tabs.filter((t) => t.closeable).length;
    const scrollRef = useRef(null);
    useEffect(() => {
        const el = scrollRef.current;
        if (!el)
            return;
        const handler = (e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, []);
    return (_jsxs("div", { className: "flex items-center border-b border-[var(--sb-border)] bg-[var(--sb-bg-elevated)]", children: [_jsx("div", { ref: scrollRef, className: "w-0 flex-1 flex items-center overflow-x-auto", style: { scrollbarWidth: 'thin' }, children: tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    return (_jsxs("div", { className: `flex items-center gap-1 px-4 py-2.5 text-sm cursor-pointer border-r border-[var(--sb-border)] whitespace-nowrap select-none transition-colors shrink-0 ${isActive
                            ? 'bg-[var(--sb-bg)] text-[var(--sb-primary)] font-medium border-b-2 border-b-[var(--sb-primary)]'
                            : 'text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] hover:bg-[var(--sb-bg-muted)]'}`, onClick: () => setActiveTab(tab.id), children: [_jsx("span", { className: "max-w-[180px] truncate", children: tab.title }), tab.closeable && (_jsx("button", { onClick: (e) => {
                                    e.stopPropagation();
                                    closeTab(tab.id);
                                }, className: "ml-1 w-4 h-4 flex items-center justify-center rounded text-xs hover:bg-[var(--sb-bg-muted)] text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)]", children: "\u00D7" }))] }, tab.id));
                }) }), closeableCount > 0 && (_jsx("button", { onClick: closeAllTabs, className: "px-3 py-2.5 text-xs text-[var(--sb-text-muted)] hover:text-[var(--sb-danger)] hover:bg-[var(--sb-bg-muted)] border-l border-[var(--sb-border)] cursor-pointer shrink-0 whitespace-nowrap", title: "\u5173\u95ED\u5168\u90E8\u9875\u7B7E", children: "\u5173\u95ED\u5168\u90E8" }))] }));
}
//# sourceMappingURL=TabBar.js.map