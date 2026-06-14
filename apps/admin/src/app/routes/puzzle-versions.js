import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminListPuzzleVersionsApi, adminUpdatePuzzleVersionApi, adminValidatePuzzleVersionApi, adminPublishPuzzleVersionApi } from '../../features/puzzles/api';
import { adminListGamesApi } from '../../features/games/api';
import { GameFilter } from '../../components/admin/GameFilter';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
const VERSION_STATUS = {
    DRAFT: { label: '草稿', variant: 'default' },
    VALIDATING: { label: '验证中', variant: 'warning' },
    VALID: { label: '已验证', variant: 'success' },
    INVALID: { label: '失败', variant: 'danger' },
    PUBLISHED: { label: '已发布', variant: 'success' },
    ARCHIVED: { label: '已归档', variant: 'default' },
};
export default function PuzzleVersionsPage() {
    const { openTab } = useTabStore();
    const queryClient = useQueryClient();
    const [gameId, setGameId] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [editItem, setEditItem] = useState(null);
    const [editContentStr, setEditContentStr] = useState('');
    const { data: games } = useQuery({
        queryKey: ['admin-games-for-puzzles'],
        queryFn: () => adminListGamesApi({ status: 'PUBLISHED', pageSize: 50 }),
        staleTime: 60_000,
    });
    const { data, isLoading } = useQuery({
        queryKey: ['admin-puzzle-versions', gameId, statusFilter, page],
        queryFn: () => adminListPuzzleVersionsApi({
            gameId: gameId || undefined,
            status: statusFilter || undefined,
            page, pageSize: 50,
        }),
    });
    const updateMutation = useMutation({
        mutationFn: () => {
            const content = JSON.parse(editContentStr);
            return adminUpdatePuzzleVersionApi(editItem.id, { content });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-puzzle-versions'] });
            setEditItem(null);
        },
    });
    const validateMutation = useMutation({
        mutationFn: (versionId) => adminValidatePuzzleVersionApi(versionId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-puzzle-versions'] }),
    });
    const publishMutation = useMutation({
        mutationFn: (versionId) => adminPublishPuzzleVersionApi(versionId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-puzzle-versions'] }),
    });
    return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: "\u9898\u76EE\u7248\u672C" }), _jsxs(Card, { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4 mb-4", children: [_jsx(GameFilter, { value: gameId, onChange: (v) => { setGameId(v); setPage(1); } }), _jsxs("select", { value: statusFilter, onChange: (e) => { setStatusFilter(e.target.value); setPage(1); }, className: "bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer", children: [_jsx("option", { value: "", children: "\u5168\u90E8\u72B6\u6001" }), _jsx("option", { value: "DRAFT", children: "\u8349\u7A3F" }), _jsx("option", { value: "VALID", children: "\u5DF2\u9A8C\u8BC1" }), _jsx("option", { value: "INVALID", children: "\u9A8C\u8BC1\u5931\u8D25" }), _jsx("option", { value: "PUBLISHED", children: "\u5DF2\u53D1\u5E03" }), _jsx("option", { value: "ARCHIVED", children: "\u5DF2\u5F52\u6863" })] }), data && _jsxs("span", { className: "text-sm text-[var(--sb-text-muted)] ml-auto", children: ["\u5171 ", data.total, " \u6761"] })] }), isLoading ? (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u52A0\u8F7D\u4E2D..." })) : data && data.items.length > 0 ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-[var(--sb-border)]", children: [_jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u6E38\u620F" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u9898\u76EE" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u7248\u672C" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u5F15\u64CE" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u9A8C\u8BC1" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u72B6\u6001" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u5F53\u524D" }), _jsx("th", { className: "text-right py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u64CD\u4F5C" })] }) }), _jsx("tbody", { children: data.items.map((v) => {
                                                const game = games?.items.find((g) => g.id === v.puzzle.gameId);
                                                const vs = VERSION_STATUS[v.status];
                                                const isCurrent = v.id === v.puzzle.currentVersionId;
                                                const editable = v.status === 'DRAFT' || v.status === 'VALIDATING';
                                                return (_jsxs("tr", { className: "border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]", children: [_jsx("td", { className: "py-3 px-3 text-xs text-[var(--sb-text-primary)]", children: game?.title || v.puzzle.gameId }), _jsx("td", { className: "py-3 px-3", children: _jsx("button", { className: "text-[var(--sb-primary)] hover:underline cursor-pointer bg-transparent border-none text-sm font-medium", onClick: () => openTab({ id: `/puzzle-edit/${v.puzzle.id}`, title: `题目-${v.puzzle.title}`, path: `/puzzle-edit/${v.puzzle.id}` }), children: v.puzzle.title }) }), _jsxs("td", { className: "py-3 px-3 text-center font-mono text-[var(--sb-text-secondary)]", children: ["v", v.version] }), _jsx("td", { className: "py-3 px-3 font-mono text-xs text-[var(--sb-text-secondary)]", children: v.engineKey }), _jsx("td", { className: "py-3 px-3 text-center", children: _jsx(Badge, { variant: v.validationStatus === 'VALID' ? 'success' : v.validationStatus === 'INVALID' ? 'danger' : 'default', children: v.validationStatus }) }), _jsx("td", { className: "py-3 px-3 text-center", children: _jsx(Badge, { variant: vs?.variant || 'default', children: vs?.label || v.status }) }), _jsx("td", { className: "py-3 px-3 text-center", children: isCurrent ? _jsx(Badge, { variant: "success", children: "\u5F53\u524D" }) : '' }), _jsxs("td", { className: "py-3 px-3 text-right space-x-1", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => {
                                                                        setEditItem(v);
                                                                        setEditContentStr(JSON.stringify(v.content ?? {}, null, 2));
                                                                    }, children: "\u7F16\u8F91" }), editable && _jsx(Button, { size: "sm", variant: "ghost", onClick: () => validateMutation.mutate(v.id), children: "\u9A8C\u8BC1" }), v.validationStatus === 'VALID' && v.status !== 'PUBLISHED' && (_jsx(Button, { size: "sm", variant: "ghost", onClick: () => publishMutation.mutate(v.id), children: "\u53D1\u5E03" }))] })] }, v.id));
                                            }) })] }) }), data.total > 50 && (_jsxs("div", { className: "flex items-center justify-center gap-2 mt-4", children: [_jsx(Button, { size: "sm", variant: "secondary", disabled: page <= 1, onClick: () => setPage(p => p - 1), children: "\u4E0A\u4E00\u9875" }), _jsxs("span", { className: "text-sm text-[var(--sb-text-muted)] px-3", children: [page, " / ", Math.ceil(data.total / 50)] }), _jsx(Button, { size: "sm", variant: "secondary", disabled: page >= Math.ceil(data.total / 50), onClick: () => setPage(p => p + 1), children: "\u4E0B\u4E00\u9875" })] }))] })) : (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u6682\u65E0\u6570\u636E" }))] }), _jsx(Modal, { open: !!editItem, title: `编辑版本 v${editItem?.version || ''} - ${editItem?.engineKey || ''}`, onClose: () => setEditItem(null), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setEditItem(null), children: "\u53D6\u6D88" }), _jsx(Button, { disabled: updateMutation.isPending, onClick: () => {
                                try {
                                    JSON.parse(editContentStr);
                                }
                                catch {
                                    alert('JSON 格式错误');
                                    return;
                                }
                                updateMutation.mutate();
                            }, children: updateMutation.isPending ? '保存中...' : '保存' })] }), children: _jsxs("div", { className: "space-y-3", children: [updateMutation.isError && _jsx("p", { className: "text-sm text-[var(--sb-danger)]", children: "\u4FDD\u5B58\u5931\u8D25" }), editItem && (_jsxs("div", { className: "text-xs text-[var(--sb-text-muted)]", children: ["\u9898\u76EE: ", _jsx("span", { className: "text-[var(--sb-text-primary)]", children: editItem.puzzle.title }), _jsxs("span", { className: "ml-2 font-mono", children: ["(", editItem.puzzle.slug, ")"] })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--sb-text-secondary)] mb-1.5", children: "\u5185\u5BB9 (JSON)" }), _jsx("textarea", { className: "w-full h-80 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg p-3 font-mono text-sm text-[var(--sb-text-primary)] resize-y", value: editContentStr, onChange: (e) => setEditContentStr(e.target.value) })] })] }) })] }));
}
//# sourceMappingURL=puzzle-versions.js.map