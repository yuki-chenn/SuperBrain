import { jsx as _jsx } from "react/jsx-runtime";
const variantStyles = {
    default: 'bg-[var(--sb-bg-muted)] text-[var(--sb-text-secondary)] border-[var(--sb-border)]',
    primary: 'bg-[var(--sb-primary-soft)] text-[var(--sb-primary)] border-[var(--sb-primary)]/20',
    success: 'bg-[var(--sb-success)]/10 text-[var(--sb-success)] border-[var(--sb-success)]/20',
    warning: 'bg-[var(--sb-warning)]/10 text-[var(--sb-warning)] border-[var(--sb-warning)]/20',
    danger: 'bg-[var(--sb-danger)]/10 text-[var(--sb-danger)] border-[var(--sb-danger)]/20',
};
export function Badge({ children, variant = 'default', className = '' }) {
    return (_jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${variantStyles[variant]} ${className}`, children: children }));
}
//# sourceMappingURL=Badge.js.map