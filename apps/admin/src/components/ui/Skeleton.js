import { jsx as _jsx } from "react/jsx-runtime";
export function Skeleton({ className = '' }) {
    return _jsx("div", { className: `animate-pulse bg-[var(--sb-bg-muted)] rounded ${className}` });
}
export function TableSkeleton({ rows = 5 }) {
    return (_jsx("div", { className: "space-y-3", children: Array.from({ length: rows }, (_, i) => (_jsx(Skeleton, { className: "h-12 w-full" }, i))) }));
}
//# sourceMappingURL=Skeleton.js.map