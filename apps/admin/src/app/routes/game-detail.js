import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetGameApi, adminUpdateGameApi, adminPublishGameApi, adminArchiveGameApi, adminUpdateDimensionsApi } from '../../features/games/api';
import { useTabStore } from '../../stores/useTabStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useState, useEffect } from 'react';
const DEFAULT_DIMENSIONS = [
    { key: 'observe', label: '观察', value: 3 },
    { key: 'memory', label: '记忆', value: 3 },
    { key: 'spatial', label: '空间', value: 3 },
    { key: 'creative', label: '创造', value: 3 },
    { key: 'reasoning', label: '推理', value: 3 },
    { key: 'calculation', label: '计算', value: 3 },
];
export default function GameDetailPage({ gameId: gameIdProp } = {}) {
    const queryClient = useQueryClient();
    const { openTab } = useTabStore();
    const gameId = gameIdProp || '';
    const { data: game, isLoading } = useQuery({
        queryKey: ['admin-game', gameId],
        queryFn: () => adminGetGameApi(gameId),
        enabled: !!gameId,
    });
    const [form, setForm] = useState({ title: '', subtitle: '', description: '', source: '', coverUrl: '' });
    const [dimensions, setDimensions] = useState(DEFAULT_DIMENSIONS);
    useEffect(() => {
        if (game) {
            setForm({ title: game.title, subtitle: game.subtitle || '', description: game.description, source: game.source || '', coverUrl: game.coverUrl || '' });
            const meta = game.metadata;
            if (meta?.dimensions && Array.isArray(meta.dimensions)) {
                setDimensions(meta.dimensions.map((d) => ({
                    key: d.key,
                    label: d.label,
                    value: Math.max(1, Math.min(5, d.value)),
                })));
            }
        }
    }, [game]);
    const updateMutation = useMutation({
        mutationFn: () => adminUpdateGameApi(gameId, form),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-game', gameId] }),
    });
    const publishMutation = useMutation({
        mutationFn: () => adminPublishGameApi(gameId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-game', gameId] }),
    });
    const archiveMutation = useMutation({
        mutationFn: () => adminArchiveGameApi(gameId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-game', gameId] }),
    });
    const dimensionsMutation = useMutation({
        mutationFn: () => adminUpdateDimensionsApi(gameId, dimensions),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-game', gameId] }),
    });
    function handleDimensionChange(key, value) {
        setDimensions((prev) => prev.map((d) => (d.key === key ? { ...d, value: Math.round(value * 10) / 10 } : d)));
    }
    if (isLoading)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u52A0\u8F7D\u4E2D..." });
    if (!game)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u6E38\u620F\u672A\u627E\u5230" });
    return (_jsxs("div", { className: "p-6 max-w-4xl mx-auto space-y-6", children: [_jsx("button", { onClick: () => openTab({ id: '/games', title: '游戏管理', path: '/games' }), className: "text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] cursor-pointer inline-block", children: "\u2190 \u8FD4\u56DE\u6E38\u620F\u5217\u8868" }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: game.title }), _jsx("p", { className: "text-sm text-[var(--sb-text-muted)] font-mono", children: game.slug })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Badge, { variant: game.status === 'PUBLISHED' ? 'success' : game.status === 'ARCHIVED' ? 'default' : 'warning', children: game.status === 'PUBLISHED' ? '已发布' : game.status === 'ARCHIVED' ? '已归档' : '草稿' }), game.status === 'DRAFT' && _jsx(Button, { onClick: () => publishMutation.mutate(), children: "\u53D1\u5E03" }), game.status === 'PUBLISHED' && _jsx(Button, { variant: "danger", onClick: () => archiveMutation.mutate(), children: "\u5F52\u6863" }), game.status === 'ARCHIVED' && _jsx(Button, { onClick: () => publishMutation.mutate(), children: "\u91CD\u65B0\u53D1\u5E03" })] })] }), _jsxs(Card, { children: [_jsx("h2", { className: "text-lg font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u6E38\u620F\u4FE1\u606F" }), _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "\u6807\u9898", value: form.title, onChange: (e) => setForm(f => ({ ...f, title: e.target.value })) }), _jsx(Input, { label: "\u526F\u6807\u9898", value: form.subtitle, onChange: (e) => setForm(f => ({ ...f, subtitle: e.target.value })) }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--sb-text-secondary)] mb-1.5", children: "\u63CF\u8FF0" }), _jsx("textarea", { value: form.description, onChange: (e) => setForm(f => ({ ...f, description: e.target.value })), rows: 3, className: "w-full px-3.5 py-2.5 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-[var(--sb-radius-input)] text-[var(--sb-text-primary)] focus:outline-none focus:border-[var(--sb-primary)] resize-none" })] }), _jsx(Input, { label: "\u6765\u6E90", value: form.source, onChange: (e) => setForm(f => ({ ...f, source: e.target.value })) }), _jsx(Input, { label: "\u5C01\u9762 URL", value: form.coverUrl, onChange: (e) => setForm(f => ({ ...f, coverUrl: e.target.value })) }), _jsx(Button, { onClick: () => updateMutation.mutate(), disabled: updateMutation.isPending, children: updateMutation.isPending ? '保存中...' : '保存修改' })] })] }), _jsxs(Card, { children: [_jsx("h2", { className: "text-lg font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u516D\u7EF4\u80FD\u529B" }), _jsxs("div", { className: "space-y-4", children: [dimensions.map((dim) => (_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { className: "w-16 text-sm text-[var(--sb-text-secondary)] shrink-0", children: dim.label }), _jsx("input", { type: "range", min: 1, max: 5, step: 0.1, value: dim.value, onChange: (e) => handleDimensionChange(dim.key, parseFloat(e.target.value)), className: "flex-1 h-2 bg-[var(--sb-bg-muted)] rounded-lg appearance-none cursor-pointer accent-[var(--sb-primary)]" }), _jsx("input", { type: "number", min: 1, max: 5, step: 0.1, value: dim.value, onChange: (e) => handleDimensionChange(dim.key, parseFloat(e.target.value) || 1), className: "w-16 px-2 py-1 text-center text-sm font-mono bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded text-[var(--sb-text-primary)] outline-none focus:border-[var(--sb-primary)]" })] }, dim.key))), _jsx(Button, { onClick: () => dimensionsMutation.mutate(), disabled: dimensionsMutation.isPending, children: dimensionsMutation.isPending ? '保存中...' : '保存六维能力' })] })] }), _jsxs(Card, { children: [_jsx("h2", { className: "text-lg font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u7EDF\u8BA1\u6570\u636E" }), _jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u9898\u76EE\u6570: " }), _jsx("span", { className: "text-[var(--sb-text-primary)]", children: game.puzzleCount })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u6311\u6218\u6B21\u6570: " }), _jsx("span", { className: "text-[var(--sb-text-primary)]", children: game.attemptCount })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u521B\u5EFA\u65F6\u95F4: " }), _jsx("span", { className: "text-[var(--sb-text-primary)]", children: new Date(game.createdAt).toLocaleString() })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u66F4\u65B0\u65F6\u95F4: " }), _jsx("span", { className: "text-[var(--sb-text-primary)]", children: new Date(game.updatedAt).toLocaleString() })] })] })] })] }));
}
//# sourceMappingURL=game-detail.js.map