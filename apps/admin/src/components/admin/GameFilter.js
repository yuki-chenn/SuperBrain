import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { adminListGamesApi } from '../../features/games/api';
export function GameFilter({ value, onChange, className = '' }) {
    const { data } = useQuery({
        queryKey: ['admin-games-filter'],
        queryFn: () => adminListGamesApi({ pageSize: 200 }),
        staleTime: 60_000,
    });
    return (_jsxs("select", { value: value, onChange: (e) => onChange(e.target.value), className: `bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer ${className}`, children: [_jsx("option", { value: "", children: "\u5168\u90E8\u6E38\u620F" }), data?.items.map((g) => (_jsxs("option", { value: g.id, children: [g.title, " (", g.slug, ")"] }, g.id)))] }));
}
//# sourceMappingURL=GameFilter.js.map