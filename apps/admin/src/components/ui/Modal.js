import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
export function Modal({ open, title, onClose, children, footer }) {
    useEffect(() => {
        if (!open)
            return;
        const handler = (e) => { if (e.key === 'Escape')
            onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [_jsx("div", { className: "absolute inset-0 bg-black/40", onClick: onClose }), _jsxs("div", { className: "relative bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)] rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-[var(--sb-border)]", children: [_jsx("h2", { className: "text-lg font-semibold text-[var(--sb-text-primary)]", children: title }), _jsx("button", { onClick: onClose, className: "text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] cursor-pointer text-xl leading-none border-none bg-transparent p-1", children: "\u00D7" })] }), _jsx("div", { className: "px-6 py-4 overflow-y-auto flex-1", children: children }), footer && (_jsx("div", { className: "px-6 py-3 border-t border-[var(--sb-border)] flex justify-end gap-2", children: footer }))] })] }));
}
//# sourceMappingURL=Modal.js.map