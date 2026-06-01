import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminListGamesApi, adminPublishGameApi, adminArchiveGameApi } from '../../features/games/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { useState } from 'react';
export default function GamesPage() {
    const { openTab } = useTabStore();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('');
    const { data, isLoading } = useQuery({
        queryKey: ['admin-games', statusFilter],
        queryFn: () => adminListGamesApi({ status: statusFilter || undefined, pageSize: 50 }),
    });
    const publishMutation = useMutation({
        mutationFn: (gameId) => adminPublishGameApi(gameId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-games'] }),
    });
    const archiveMutation = useMutation({
        mutationFn: (gameId) => adminArchiveGameApi(gameId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-games'] }),
    });
    return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: "\u6E38\u620F\u7BA1\u7406" }), _jsx("div", { className: "flex items-center gap-2", children: _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer", children: [_jsx("option", { value: "", children: "\u5168\u90E8\u72B6\u6001" }), _jsx("option", { value: "DRAFT", children: "\u8349\u7A3F" }), _jsx("option", { value: "PUBLISHED", children: "\u5DF2\u53D1\u5E03" }), _jsx("option", { value: "ARCHIVED", children: "\u5DF2\u5F52\u6863" })] }) })] }), isLoading ? (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u52A0\u8F7D\u4E2D..." })) : data && data.items.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: data.items.map((game) => (_jsxs(Card, { children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-[var(--sb-text-primary)]", children: game.title }), _jsx("p", { className: "text-xs text-[var(--sb-text-muted)] font-mono", children: game.slug })] }), _jsx(Badge, { variant: game.status === 'PUBLISHED' ? 'success' : game.status === 'ARCHIVED' ? 'default' : 'warning', children: game.status === 'PUBLISHED' ? '已发布' : game.status === 'ARCHIVED' ? '已归档' : '草稿' })] }), _jsx("p", { className: "text-sm text-[var(--sb-text-muted)] mb-3 line-clamp-2", children: game.description }), _jsxs("div", { className: "flex items-center gap-4 text-xs text-[var(--sb-text-muted)] mb-4", children: [_jsxs("span", { children: ["\u9898\u76EE: ", game.puzzleCount] }), _jsxs("span", { children: ["\u6311\u6218: ", game.attemptCount] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => {
                                        const detailPath = `/games/${game.id}`;
                                        openTab({ id: detailPath, title: `游戏 - ${game.title}`, path: detailPath });
                                    }, children: "\u8BE6\u60C5" }), game.slug === 'absolute-command' && (_jsx(Button, { size: "sm", variant: "secondary", onClick: () => {
                                        openTab({ id: '/puzzles/absolute-command', title: '题库: 绝对指令', path: '/puzzles/absolute-command' });
                                    }, children: "\u9898\u5E93" })), game.status === 'DRAFT' && (_jsx(Button, { size: "sm", onClick: () => publishMutation.mutate(game.id), children: "\u53D1\u5E03" })), game.status === 'PUBLISHED' && (_jsx(Button, { size: "sm", variant: "danger", onClick: () => archiveMutation.mutate(game.id), children: "\u5F52\u6863" }))] })] }, game.id))) })) : (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u6682\u65E0\u6E38\u620F" }))] }));
}
//# sourceMappingURL=games.js.map