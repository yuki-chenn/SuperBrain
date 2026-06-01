import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTabStore } from '../stores/useTabStore';
export function TabBar() {
    const { tabs, activeTabId, setActiveTab, closeTab } = useTabStore();
    return (_jsx("div", { className: "flex items-center border-b border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] overflow-x-auto scrollbar-none", children: tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (_jsxs("div", { className: `flex items-center gap-1 px-4 py-2.5 text-sm cursor-pointer border-r border-[var(--sb-border)] whitespace-nowrap select-none transition-colors shrink-0 ${isActive
                    ? 'bg-[var(--sb-bg)] text-[var(--sb-primary)] font-medium border-b-2 border-b-[var(--sb-primary)]'
                    : 'text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] hover:bg-[var(--sb-bg-muted)]'}`, onClick: () => setActiveTab(tab.id), children: [_jsx("span", { className: "max-w-[150px] truncate", children: tab.title }), tab.closeable && (_jsx("button", { onClick: (e) => {
                            e.stopPropagation();
                            closeTab(tab.id);
                        }, className: "ml-1 w-4 h-4 flex items-center justify-center rounded text-xs hover:bg-[var(--sb-bg-muted)] text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)]", children: "\u00D7" }))] }, tab.id));
        }) }));
}
//# sourceMappingURL=TabBar.js.map