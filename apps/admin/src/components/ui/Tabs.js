import { jsx as _jsx } from "react/jsx-runtime";
export function Tabs({ tabs, activeKey, onChange, className = '' }) {
    return (_jsx("div", { className: `flex gap-2 border-b border-[var(--sb-border)] pb-2 ${className}`, children: tabs.map((tab) => (_jsx("button", { onClick: () => onChange(tab.key), className: `px-4 py-2 rounded-t text-sm font-medium cursor-pointer border-none transition-[var(--sb-transition)] ${activeKey === tab.key
                ? 'bg-[var(--sb-bg-elevated)] text-[var(--sb-text-primary)] shadow-sm'
                : 'bg-transparent text-[var(--sb-text-muted)] hover:text-[var(--sb-text-secondary)]'}`, children: tab.label }, tab.key))) }));
}
//# sourceMappingURL=Tabs.js.map