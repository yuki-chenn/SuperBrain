import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetPuzzleApi, adminUpdatePuzzleApi, adminPublishPuzzleVersionApi } from '../../features/puzzles/api';
import { adminListDifficultiesApi } from '../../features/games/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
const VERSION_STATUS_LABELS = {
    DRAFT: { label: '草稿', variant: 'default' },
    VALIDATING: { label: '验证中', variant: 'warning' },
    VALID: { label: '已验证', variant: 'success' },
    INVALID: { label: '验证失败', variant: 'danger' },
    PUBLISHED: { label: '已发布', variant: 'success' },
    ARCHIVED: { label: '已归档', variant: 'default' },
};
export default function PuzzleEditPage({ puzzleId: idProp }) {
    const id = idProp || '';
    const queryClient = useQueryClient();
    const { data: puzzle, isLoading } = useQuery({
        queryKey: ['admin-puzzle', id],
        queryFn: () => adminGetPuzzleApi(id),
        enabled: !!id,
    });
    const { data: difficulties } = useQuery({
        queryKey: ['admin-difficulties-for-game', puzzle?.gameId],
        queryFn: () => adminListDifficultiesApi({ gameId: puzzle.gameId, status: 'ACTIVE' }),
        enabled: !!puzzle?.gameId,
        staleTime: 60_000,
    });
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [difficultyId, setDifficultyId] = useState('');
    const [sortOrder, setSortOrder] = useState('0');
    const [source, setSource] = useState('');
    const [currentVersionId, setCurrentVersionId] = useState('');
    const [dirty, setDirty] = useState(false);
    useEffect(() => {
        if (puzzle) {
            setTitle(puzzle.title);
            setDescription(puzzle.description || '');
            setDifficultyId(puzzle.difficultyId || '');
            setSortOrder(String(puzzle.sortOrder));
            setSource(puzzle.source || '');
            setCurrentVersionId(puzzle.currentVersionId || '');
            setDirty(false);
        }
    }, [puzzle?.id]);
    const updateMutation = useMutation({
        mutationFn: () => adminUpdatePuzzleApi(id, {
            title, description: description || undefined,
            difficultyId: difficultyId || null,
            sortOrder: parseInt(sortOrder), source: source || undefined,
        }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-puzzle', id] }); setDirty(false); },
    });
    const publishMutation = useMutation({
        mutationFn: (versionId) => adminPublishPuzzleVersionApi(versionId),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-puzzle', id] }); },
    });
    if (isLoading)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u52A0\u8F7D\u4E2D..." });
    if (!puzzle)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u672A\u627E\u5230" });
    const versions = puzzle.versions || [];
    return (_jsxs("div", { className: "p-6 max-w-5xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: puzzle.title }), _jsx(Badge, { variant: puzzle.status === 'PUBLISHED' ? 'success' : 'default', children: puzzle.status })] }), dirty && _jsx(Button, { onClick: () => updateMutation.mutate(), disabled: updateMutation.isPending, children: updateMutation.isPending ? '保存中...' : '保存' })] }), updateMutation.isError && _jsx("p", { className: "text-sm text-[var(--sb-danger)]", children: "\u4FDD\u5B58\u5931\u8D25" }), _jsxs(Card, { children: [_jsx("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u57FA\u672C\u4FE1\u606F" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Input, { label: "\u6807\u9898", value: title, onChange: (e) => { setTitle(e.target.value); setDirty(true); } }), _jsx(Input, { label: "Slug", value: puzzle.slug, disabled: true }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--sb-text-secondary)] mb-1.5", children: "\u96BE\u5EA6" }), _jsxs("select", { value: difficultyId, onChange: (e) => { setDifficultyId(e.target.value); setDirty(true); }, className: "w-full bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none", children: [_jsx("option", { value: "", children: "\u672A\u6307\u5B9A" }), difficulties?.items.map((d) => _jsxs("option", { value: d.id, children: [d.label, " (", d.key, ")"] }, d.id))] })] }), _jsx(Input, { label: "\u6392\u5E8F\u6743\u91CD", type: "number", value: sortOrder, onChange: (e) => { setSortOrder(e.target.value); setDirty(true); } }), _jsx(Input, { label: "\u6765\u6E90", value: source, onChange: (e) => { setSource(e.target.value); setDirty(true); } }), _jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: "block text-sm text-[var(--sb-text-secondary)] mb-1.5", children: "\u63CF\u8FF0" }), _jsx("textarea", { value: description, onChange: (e) => { setDescription(e.target.value); setDirty(true); }, rows: 3, className: "w-full px-3.5 py-2.5 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-[var(--sb-radius-input)] text-[var(--sb-text-primary)] focus:outline-none focus:border-[var(--sb-primary)] resize-none" })] })] })] }), _jsxs(Card, { children: [_jsx("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u5F53\u524D\u7248\u672C\u7ED1\u5B9A" }), _jsx("p", { className: "text-xs text-[var(--sb-text-muted)] mb-3", children: "\u9009\u62E9\u4E00\u4E2A\u5DF2\u53D1\u5E03\u7248\u672C\u4F5C\u4E3A\u5F53\u524D\u751F\u6548\u7248\u672C\uFF08\u4E00\u5BF9\u4E00\uFF09" }), _jsxs("select", { value: currentVersionId, onChange: (e) => {
                            const vid = e.target.value;
                            setCurrentVersionId(vid);
                            if (vid)
                                publishMutation.mutate(vid);
                        }, className: "w-full bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none", children: [_jsx("option", { value: "", children: "\u672A\u7ED1\u5B9A" }), versions.filter((v) => v.validationStatus === 'VALID' || v.status === 'PUBLISHED').map((v) => (_jsxs("option", { value: v.id, children: ["v", v.version, " - ", v.engineKey, " [", v.status, "]"] }, v.id)))] }), publishMutation.isPending && _jsx("p", { className: "text-xs text-[var(--sb-text-muted)] mt-1", children: "\u53D1\u5E03\u4E2D..." }), publishMutation.isError && _jsx("p", { className: "text-xs text-[var(--sb-danger)] mt-1", children: "\u53D1\u5E03\u5931\u8D25" })] }), _jsxs(Card, { children: [_jsx("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u7248\u672C\u5217\u8868" }), versions.length > 0 ? (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-[var(--sb-border)]", children: [_jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u7248\u672C" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u5F15\u64CE" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u9A8C\u8BC1\u72B6\u6001" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u53D1\u5E03\u72B6\u6001" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u5F53\u524D" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u521B\u5EFA\u65F6\u95F4" })] }) }), _jsx("tbody", { children: versions.map((v) => {
                                        const vs = VERSION_STATUS_LABELS[v.status];
                                        return (_jsxs("tr", { className: "border-b border-[var(--sb-border)]", children: [_jsxs("td", { className: "py-3 px-3 text-center font-mono text-[var(--sb-text-primary)]", children: ["v", v.version] }), _jsx("td", { className: "py-3 px-3 font-mono text-xs text-[var(--sb-text-primary)]", children: v.engineKey }), _jsx("td", { className: "py-3 px-3 text-center", children: _jsx(Badge, { variant: v.validationStatus === 'VALID' ? 'success' : v.validationStatus === 'INVALID' ? 'danger' : 'default', children: v.validationStatus }) }), _jsx("td", { className: "py-3 px-3 text-center", children: _jsx(Badge, { variant: vs?.variant || 'default', children: vs?.label || v.status }) }), _jsx("td", { className: "py-3 px-3 text-center", children: v.id === puzzle.currentVersionId ? _jsx(Badge, { variant: "success", children: "\u5F53\u524D" }) : '' }), _jsx("td", { className: "py-3 px-3 text-xs text-[var(--sb-text-secondary)]", children: new Date(v.createdAt).toLocaleString() })] }, v.id));
                                    }) })] }) })) : (_jsx("p", { className: "text-sm text-[var(--sb-text-muted)]", children: "\u6682\u65E0\u7248\u672C" }))] })] }));
}
//# sourceMappingURL=puzzle-edit.js.map