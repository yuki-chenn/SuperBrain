import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery } from '@tanstack/react-query';
import { adminListPuzzlesApi } from '../../features/puzzles/api';
import { adminListGamesApi, adminListDifficultiesApi } from '../../features/games/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
const STATUS_LABELS = {
    DRAFT: { label: '草稿', variant: 'default' },
    PUBLISHED: { label: '已发布', variant: 'success' },
    ARCHIVED: { label: '已归档', variant: 'danger' },
    DISABLED: { label: '已禁用', variant: 'warning' },
};
export default function PuzzleListPage({ gameId: gameIdProp }) {
    const gameId = gameIdProp || '';
    const { openTab } = useTabStore();
    const [difficultyId, setDifficultyId] = useState('');
    const [page, setPage] = useState(1);
    const { data: games } = useQuery({
        queryKey: ['admin-games-for-puzzles'],
        queryFn: () => adminListGamesApi({ status: 'PUBLISHED', pageSize: 50 }),
        staleTime: 60_000,
    });
    const game = games?.items.find((g) => g.id === gameId);
    const { data: difficulties } = useQuery({
        queryKey: ['admin-difficulties-for-game', gameId],
        queryFn: () => adminListDifficultiesApi({ gameId, status: 'ACTIVE' }),
        enabled: !!gameId,
        staleTime: 60_000,
    });
    const { data, isLoading } = useQuery({
        queryKey: ['admin-puzzles', gameId, difficultyId, page],
        queryFn: () => adminListPuzzlesApi({ gameId, page, pageSize: 20 }),
        enabled: !!gameId,
    });
    // Filter by difficulty client-side (backend doesn't support difficultyId filter)
    const filtered = data?.items.filter((p) => !difficultyId || p.difficultyId === difficultyId) || [];
    return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto space-y-6", children: [_jsxs("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: ["\u9898\u5E93-", game?.title || gameId] }), _jsxs(Card, { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4 mb-4", children: [_jsxs("select", { value: difficultyId, onChange: (e) => { setDifficultyId(e.target.value); setPage(1); }, className: "bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer", children: [_jsx("option", { value: "", children: "\u5168\u90E8\u96BE\u5EA6" }), difficulties?.items.map((d) => (_jsxs("option", { value: d.id, children: [d.label, " (", d.key, ")"] }, d.id)))] }), data && _jsxs("span", { className: "text-sm text-[var(--sb-text-muted)] ml-auto", children: ["\u5171 ", filtered.length, " \u9898"] })] }), isLoading ? (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u52A0\u8F7D\u4E2D..." })) : filtered.length > 0 ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-[var(--sb-border)]", children: [_jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u6807\u9898" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "Slug" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u96BE\u5EA6" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u5F53\u524D\u7248\u672C" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u72B6\u6001" }), _jsx("th", { className: "text-right py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u64CD\u4F5C" })] }) }), _jsx("tbody", { children: filtered.map((p) => {
                                                const diff = difficulties?.items.find((d) => d.id === p.difficultyId);
                                                const st = STATUS_LABELS[p.status];
                                                return (_jsxs("tr", { className: "border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]", children: [_jsx("td", { className: "py-3 px-3 text-[var(--sb-text-primary)] font-medium", children: p.title }), _jsx("td", { className: "py-3 px-3 font-mono text-xs text-[var(--sb-text-secondary)]", children: p.slug }), _jsx("td", { className: "py-3 px-3 text-xs text-[var(--sb-text-secondary)]", children: diff ? diff.label : '-' }), _jsx("td", { className: "py-3 px-3 text-center font-mono text-xs text-[var(--sb-text-secondary)]", children: p.currentVersionId ? '已绑定' : '-' }), _jsx("td", { className: "py-3 px-3 text-center", children: _jsx(Badge, { variant: st?.variant || 'default', children: st?.label || p.status }) }), _jsx("td", { className: "py-3 px-3 text-right", children: _jsx(Button, { size: "sm", variant: "ghost", onClick: () => {
                                                                    openTab({ id: `/puzzle-edit/${p.id}`, title: `题目-${p.title}`, path: `/puzzle-edit/${p.id}` });
                                                                }, children: "\u7F16\u8F91" }) })] }, p.id));
                                            }) })] }) }), data && data.total > 20 && (_jsxs("div", { className: "flex items-center justify-center gap-2 mt-4", children: [_jsx(Button, { size: "sm", variant: "secondary", disabled: page <= 1, onClick: () => setPage(p => p - 1), children: "\u4E0A\u4E00\u9875" }), _jsxs("span", { className: "text-sm text-[var(--sb-text-muted)] px-3", children: [page, " / ", Math.ceil(data.total / 20)] }), _jsx(Button, { size: "sm", variant: "secondary", disabled: page >= Math.ceil(data.total / 20), onClick: () => setPage(p => p + 1), children: "\u4E0B\u4E00\u9875" })] }))] })) : (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u6682\u65E0\u9898\u76EE" }))] })] }));
}
//# sourceMappingURL=puzzle-list.js.map