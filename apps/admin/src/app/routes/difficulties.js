import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { adminListDifficultiesApi, adminActivateDifficultyApi } from '../../features/games/api';
import { GameFilter } from '../../components/admin/GameFilter';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
const STATUS_LABELS = {
    DRAFT: { label: '草稿', variant: 'default' },
    ACTIVE: { label: '激活', variant: 'success' },
    INACTIVE: { label: '停用', variant: 'warning' },
    ARCHIVED: { label: '归档', variant: 'danger' },
};
export default function DifficultiesPage({ initialGameId } = {}) {
    const { openTab } = useTabStore();
    const queryClient = useQueryClient();
    const [gameId, setGameId] = useState(initialGameId || '');
    const [statusFilter, setStatusFilter] = useState('');
    const { data, isLoading } = useQuery({
        queryKey: ['admin-difficulties', gameId, statusFilter],
        queryFn: () => adminListDifficultiesApi({ gameId: gameId || undefined, status: statusFilter || undefined }),
    });
    const activateMutation = useMutation({
        mutationFn: adminActivateDifficultyApi,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-difficulties'] }),
    });
    return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: "\u96BE\u5EA6\u914D\u7F6E" }), _jsxs(Card, { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4 mb-4", children: [_jsx(GameFilter, { value: gameId, onChange: (v) => { setGameId(v); } }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer", children: [_jsx("option", { value: "", children: "\u5168\u90E8\u72B6\u6001" }), _jsx("option", { value: "DRAFT", children: "\u8349\u7A3F" }), _jsx("option", { value: "ACTIVE", children: "\u6FC0\u6D3B" }), _jsx("option", { value: "INACTIVE", children: "\u505C\u7528" })] }), data && _jsxs("span", { className: "text-sm text-[var(--sb-text-muted)] ml-auto", children: ["\u5171 ", data.total, " \u6761"] })] }), isLoading ? (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u52A0\u8F7D\u4E2D..." })) : data && data.items.length > 0 ? (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-[var(--sb-border)]", children: [_jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u6E38\u620F" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "Key" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u6807\u7B7E" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u7248\u672C" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u9650\u65F6(ms)" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u72B6\u6001" }), _jsx("th", { className: "text-right py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u64CD\u4F5C" })] }) }), _jsx("tbody", { children: data.items.map((d) => (_jsxs("tr", { className: "border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]", children: [_jsx("td", { className: "py-3 px-3 text-[var(--sb-text-primary)] text-xs", children: d.game?.title || d.gameId }), _jsx("td", { className: "py-3 px-3 font-mono text-xs text-[var(--sb-text-primary)]", children: d.key }), _jsx("td", { className: "py-3 px-3 text-[var(--sb-text-primary)]", children: d.label }), _jsxs("td", { className: "py-3 px-3 text-center text-[var(--sb-text-secondary)]", children: ["v", d.version] }), _jsx("td", { className: "py-3 px-3 text-center text-[var(--sb-text-secondary)]", children: d.maxDurationMs ?? '-' }), _jsx("td", { className: "py-3 px-3 text-center", children: _jsx(Badge, { variant: STATUS_LABELS[d.status]?.variant || 'default', children: STATUS_LABELS[d.status]?.label || d.status }) }), _jsxs("td", { className: "py-3 px-3 text-right space-x-1", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => openTab({ id: `/difficulties/${d.id}`, title: `难度 - ${d.label}`, path: `/difficulties/${d.id}` }), children: "\u7F16\u8F91" }), d.status !== 'ACTIVE' && (_jsx(Button, { size: "sm", variant: "ghost", onClick: () => activateMutation.mutate(d.id), children: "\u6FC0\u6D3B" }))] })] }, d.id))) })] }) })) : (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u6682\u65E0\u6570\u636E" }))] })] }));
}
//# sourceMappingURL=difficulties.js.map