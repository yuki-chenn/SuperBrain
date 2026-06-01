import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuthStore } from '../features/auth/auth-store';
export function AdminTopbar() {
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    return (_jsxs("header", { className: "h-16 shrink-0 border-b border-[var(--sb-border)] bg-[var(--sb-bg-elevated)]/80 backdrop-blur-xl flex items-center justify-between px-6", children: [_jsx("div", { className: "text-sm text-[var(--sb-text-muted)]", children: "SuperBrain \u7BA1\u7406\u540E\u53F0" }), _jsx("div", { className: "flex items-center gap-4", children: user && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-sm text-[var(--sb-text-secondary)]", children: user.username }), _jsx("button", { onClick: () => logout(), className: "text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] bg-transparent border-none cursor-pointer transition-colors", children: "\u9000\u51FA" })] })) })] }));
}
//# sourceMappingURL=AdminTopbar.js.map