import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetDifficultyApi, adminUpdateDifficultyApi, adminActivateDifficultyApi, adminListContentPoliciesApi, adminListChallengePoliciesApi, adminUpdateContentPolicyApi, adminUpdateChallengePolicyApi } from '../../features/games/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
export default function DifficultyDetailPage({ difficultyId: idProp }) {
    const id = idProp || '';
    const { openTab } = useTabStore();
    const queryClient = useQueryClient();
    const { data: item, isLoading } = useQuery({ queryKey: ['admin-difficulty', id], queryFn: () => adminGetDifficultyApi(id), enabled: !!id });
    // Fetch all policies for this game to allow association
    const gameId = item?.gameId || '';
    const { data: allCps } = useQuery({ queryKey: ['admin-cps-for-game', gameId], queryFn: () => adminListContentPoliciesApi({ gameId }), enabled: !!gameId });
    const { data: allChps } = useQuery({ queryKey: ['admin-chps-for-game', gameId], queryFn: () => adminListChallengePoliciesApi({ gameId }), enabled: !!gameId });
    const [label, setLabel] = useState('');
    const [sortOrder, setSortOrder] = useState('0');
    const [maxDurationMs, setMaxDurationMs] = useState('');
    const [configStr, setConfigStr] = useState('{}');
    const [dirty, setDirty] = useState(false);
    useEffect(() => {
        if (item) {
            setLabel(item.label);
            setSortOrder(String(item.sortOrder));
            setMaxDurationMs(item.maxDurationMs != null ? String(item.maxDurationMs) : '');
            setConfigStr(JSON.stringify(item.config ?? {}, null, 2));
            setDirty(false);
        }
    }, [item?.id]);
    const updateMutation = useMutation({
        mutationFn: () => {
            let config;
            try {
                config = JSON.parse(configStr);
            }
            catch {
                return Promise.reject(new Error('JSON 格式错误'));
            }
            return adminUpdateDifficultyApi(id, { label, sortOrder: parseInt(sortOrder), maxDurationMs: maxDurationMs ? parseInt(maxDurationMs) : null, config });
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-difficulty', id] }); queryClient.invalidateQueries({ queryKey: ['admin-difficulties'] }); setDirty(false); },
    });
    const activateMutation = useMutation({
        mutationFn: () => adminActivateDifficultyApi(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-difficulty', id] }); queryClient.invalidateQueries({ queryKey: ['admin-difficulties'] }); },
    });
    if (isLoading)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u52A0\u8F7D\u4E2D..." });
    if (!item)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u672A\u627E\u5230" });
    const STATUS_LABELS = { DRAFT: '草稿', ACTIVE: '激活', INACTIVE: '停用', ARCHIVED: '归档' };
    return (_jsxs("div", { className: "p-6 max-w-5xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: item.label }), _jsx(Badge, { variant: item.status === 'ACTIVE' ? 'success' : 'default', children: STATUS_LABELS[item.status] || item.status }), _jsxs("span", { className: "text-sm text-[var(--sb-text-muted)]", children: ["v", item.version] })] }), _jsxs("div", { className: "flex gap-2", children: [item.status !== 'ACTIVE' && _jsx(Button, { size: "sm", onClick: () => activateMutation.mutate(), children: "\u6FC0\u6D3B" }), dirty && _jsx(Button, { onClick: () => updateMutation.mutate(), disabled: updateMutation.isPending, children: updateMutation.isPending ? '保存中...' : '保存' })] })] }), item.game && (_jsxs("div", { className: "text-sm text-[var(--sb-text-muted)]", children: ["\u6E38\u620F: ", _jsx("button", { className: "text-[var(--sb-primary)] hover:underline cursor-pointer bg-transparent border-none text-sm", onClick: () => openTab({ id: `/games/${item.game.id}`, title: `游戏 - ${item.game.title}`, path: `/games/${item.game.id}` }), children: item.game.title })] })), updateMutation.isError && _jsx("p", { className: "text-sm text-[var(--sb-danger)]", children: updateMutation.error?.message || '保存失败' }), _jsxs(Card, { children: [_jsx("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u57FA\u672C\u4FE1\u606F" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Input, { label: "Key", value: item.key, disabled: true }), _jsx(Input, { label: "\u6807\u7B7E", value: label, onChange: (e) => { setLabel(e.target.value); setDirty(true); } }), _jsx(Input, { label: "\u6392\u5E8F\u6743\u91CD", type: "number", value: sortOrder, onChange: (e) => { setSortOrder(e.target.value); setDirty(true); } }), _jsx(Input, { label: "\u6700\u5927\u65F6\u957F (ms)", type: "number", value: maxDurationMs, onChange: (e) => { setMaxDurationMs(e.target.value); setDirty(true); }, placeholder: "\u4E0D\u9650" })] })] }), _jsxs(Card, { children: [_jsx("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u914D\u7F6E (JSON)" }), _jsx("textarea", { className: "w-full h-48 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg p-3 font-mono text-sm text-[var(--sb-text-primary)] resize-y", value: configStr, onChange: (e) => { setConfigStr(e.target.value); setDirty(true); } })] }), _jsxs(Card, { children: [_jsx("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u5173\u8054\u7B56\u7565" }), _jsxs("div", { className: "grid grid-cols-2 gap-6", children: [_jsx(SinglePolicyLinker, { label: "\u9898\u5E93\u7B56\u7565 (ContentPolicy)", linkedItem: (item.contentPolicies || [])[0] || null, allItems: allCps?.items || [], displayField: (cp) => `${cp.contentMode} / ${cp.selectionStrategy}`, onLink: (cpId) => adminUpdateContentPolicyApi(cpId, { difficultyId: id }).then(() => { queryClient.invalidateQueries({ queryKey: ['admin-difficulty', id] }); queryClient.invalidateQueries({ queryKey: ['admin-cps-for-game', gameId] }); }), onUnlink: (cpId) => adminUpdateContentPolicyApi(cpId, { difficultyId: null }).then(() => { queryClient.invalidateQueries({ queryKey: ['admin-difficulty', id] }); queryClient.invalidateQueries({ queryKey: ['admin-cps-for-game', gameId] }); }), onEdit: (cpId) => openTab({ id: `/content-policies/${cpId}`, title: `题库策略`, path: `/content-policies/${cpId}` }) }), _jsx(SinglePolicyLinker, { label: "\u6311\u6218\u7B56\u7565 (ChallengePolicy)", linkedItem: (item.challengePolicies || [])[0] || null, allItems: allChps?.items || [], displayField: (cp) => cp.mode, onLink: (cpId) => adminUpdateChallengePolicyApi(cpId, { difficultyId: id }).then(() => { queryClient.invalidateQueries({ queryKey: ['admin-difficulty', id] }); queryClient.invalidateQueries({ queryKey: ['admin-chps-for-game', gameId] }); }), onUnlink: (cpId) => adminUpdateChallengePolicyApi(cpId, { difficultyId: null }).then(() => { queryClient.invalidateQueries({ queryKey: ['admin-difficulty', id] }); queryClient.invalidateQueries({ queryKey: ['admin-chps-for-game', gameId] }); }), onEdit: (cpId) => openTab({ id: `/challenge-policies/${cpId}`, title: `挑战策略`, path: `/challenge-policies/${cpId}` }) })] })] })] }));
}
// ─── Single policy linker (one-to-one) ────────────────────────────
function SinglePolicyLinker({ label, linkedItem, allItems, displayField, onLink, onUnlink, onEdit, }) {
    const [selected, setSelected] = useState('');
    const [loading, setLoading] = useState(false);
    // Items not linked to any difficulty (or linked to this one)
    const available = allItems.filter((item) => !('difficultyId' in item) || !item.difficultyId || item.id === linkedItem?.id);
    const handleLink = async () => {
        if (!selected)
            return;
        setLoading(true);
        try {
            // If already linked, unlink old first
            if (linkedItem)
                await onUnlink(linkedItem.id);
            await onLink(selected);
            setSelected('');
        }
        finally {
            setLoading(false);
        }
    };
    const handleUnlink = async () => {
        if (!linkedItem)
            return;
        setLoading(true);
        try {
            await onUnlink(linkedItem.id);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-[var(--sb-text-secondary)] mb-2", children: label }), linkedItem ? (_jsxs("div", { className: "flex items-center justify-between py-2 px-3 bg-[var(--sb-bg-muted)] rounded-lg mb-2", children: [_jsx("button", { className: "text-sm text-[var(--sb-primary)] hover:underline cursor-pointer bg-transparent border-none p-0", onClick: () => onEdit(linkedItem.id), children: displayField(linkedItem) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Badge, { variant: linkedItem.status === 'ACTIVE' ? 'success' : 'default', children: linkedItem.status }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => onEdit(linkedItem.id), children: "\u7F16\u8F91" }), _jsx(Button, { size: "sm", variant: "ghost", className: "text-[var(--sb-danger)]", disabled: loading, onClick: handleUnlink, children: "\u89E3\u9664" })] })] })) : (_jsx("p", { className: "text-xs text-[var(--sb-text-muted)] mb-2", children: "\u6682\u672A\u5173\u8054" })), available.length > 0 && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { value: selected, onChange: (e) => setSelected(e.target.value), className: "flex-1 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer", children: [_jsx("option", { value: "", children: linkedItem ? '更换关联...' : '选择策略关联...' }), available.filter((item) => item.id !== linkedItem?.id).map((item) => (_jsxs("option", { value: item.id, children: [displayField(item), " [", item.status, "]"] }, item.id)))] }), _jsx(Button, { size: "sm", disabled: !selected || loading, onClick: handleLink, children: loading ? '...' : (linkedItem ? '更换' : '关联') })] }))] }));
}
//# sourceMappingURL=difficulty-detail.js.map