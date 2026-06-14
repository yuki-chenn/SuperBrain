import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetContentPolicyApi, adminUpdateContentPolicyApi, adminActivateContentPolicyApi } from '../../features/games/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
export default function ContentPolicyDetailPage({ contentPolicyId: idProp }) {
    const id = idProp || '';
    const { openTab } = useTabStore();
    const queryClient = useQueryClient();
    const { data: item, isLoading } = useQuery({ queryKey: ['admin-content-policy', id], queryFn: () => adminGetContentPolicyApi(id), enabled: !!id });
    const [contentMode, setContentMode] = useState('CURATED');
    const [selectionStrategy, setSelectionStrategy] = useState('RANDOM');
    const [generatorKey, setGeneratorKey] = useState('');
    const [generatorConfigStr, setGeneratorConfigStr] = useState('{}');
    const [puzzlePoolFilterStr, setPuzzlePoolFilterStr] = useState('{}');
    const [scheduleGranularity, setScheduleGranularity] = useState('');
    const [allowRepeatedPuzzle, setAllowRepeatedPuzzle] = useState(true);
    const [repeatCooldownHours, setRepeatCooldownHours] = useState('');
    const [weightConfigStr, setWeightConfigStr] = useState('{}');
    const [dirty, setDirty] = useState(false);
    useEffect(() => {
        if (item) {
            setContentMode(item.contentMode);
            setSelectionStrategy(item.selectionStrategy);
            setGeneratorKey(item.generatorKey || '');
            setGeneratorConfigStr(JSON.stringify(item.generatorConfig ?? {}, null, 2));
            setPuzzlePoolFilterStr(JSON.stringify(item.puzzlePoolFilter ?? {}, null, 2));
            setScheduleGranularity(item.scheduleGranularity || '');
            setAllowRepeatedPuzzle(item.allowRepeatedPuzzle);
            setRepeatCooldownHours(item.repeatCooldownHours != null ? String(item.repeatCooldownHours) : '');
            setWeightConfigStr(JSON.stringify(item.weightConfig ?? {}, null, 2));
            setDirty(false);
        }
    }, [item?.id]);
    const updateMutation = useMutation({
        mutationFn: () => {
            let generatorConfig, puzzlePoolFilter, weightConfig;
            try {
                generatorConfig = JSON.parse(generatorConfigStr);
                puzzlePoolFilter = JSON.parse(puzzlePoolFilterStr);
                weightConfig = JSON.parse(weightConfigStr);
            }
            catch {
                return Promise.reject(new Error('JSON 格式错误'));
            }
            return adminUpdateContentPolicyApi(id, { contentMode, selectionStrategy, generatorKey: generatorKey || null, generatorConfig, puzzlePoolFilter, scheduleGranularity: scheduleGranularity || null, allowRepeatedPuzzle, repeatCooldownHours: repeatCooldownHours ? parseInt(repeatCooldownHours) : null, weightConfig });
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-content-policy', id] }); queryClient.invalidateQueries({ queryKey: ['admin-content-policies'] }); setDirty(false); },
    });
    const activateMutation = useMutation({ mutationFn: () => adminActivateContentPolicyApi(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-content-policy', id] }); queryClient.invalidateQueries({ queryKey: ['admin-content-policies'] }); } });
    if (isLoading)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u52A0\u8F7D\u4E2D..." });
    if (!item)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u672A\u627E\u5230" });
    return (_jsxs("div", { className: "p-6 max-w-5xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: "\u9898\u5E93\u7B56\u7565" }), _jsx(Badge, { variant: item.status === 'ACTIVE' ? 'success' : 'default', children: item.status })] }), _jsxs("div", { className: "flex gap-2", children: [item.status !== 'ACTIVE' && _jsx(Button, { size: "sm", onClick: () => activateMutation.mutate(), children: "\u6FC0\u6D3B" }), dirty && _jsx(Button, { onClick: () => updateMutation.mutate(), disabled: updateMutation.isPending, children: updateMutation.isPending ? '保存中...' : '保存' })] })] }), item.game && _jsxs("div", { className: "text-sm text-[var(--sb-text-muted)]", children: ["\u6E38\u620F: ", _jsx("button", { className: "text-[var(--sb-primary)] hover:underline cursor-pointer bg-transparent border-none text-sm", onClick: () => openTab({ id: `/games/${item.game.id}`, title: `游戏 - ${item.game.title}`, path: `/games/${item.game.id}` }), children: item.game.title })] }), item.difficultyId && _jsxs("div", { className: "text-sm text-[var(--sb-text-muted)]", children: ["\u96BE\u5EA6: ", _jsx("button", { className: "text-[var(--sb-primary)] hover:underline cursor-pointer bg-transparent border-none text-sm", onClick: () => openTab({ id: `/difficulties/${item.difficultyId}`, title: `难度`, path: `/difficulties/${item.difficultyId}` }), children: item.difficultyId })] }), updateMutation.isError && _jsx("p", { className: "text-sm text-[var(--sb-danger)]", children: updateMutation.error?.message || '保存失败' }), _jsxs(Card, { children: [_jsx("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u57FA\u672C\u914D\u7F6E" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--sb-text-secondary)] mb-1.5", children: "\u5185\u5BB9\u6A21\u5F0F" }), _jsxs("select", { value: contentMode, onChange: (e) => { setContentMode(e.target.value); setDirty(true); }, className: "w-full bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none", children: [_jsx("option", { value: "GENERATED", children: "GENERATED" }), _jsx("option", { value: "CURATED", children: "CURATED" }), _jsx("option", { value: "SCHEDULED", children: "SCHEDULED" }), _jsx("option", { value: "MIXED", children: "MIXED" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--sb-text-secondary)] mb-1.5", children: "\u9009\u62E9\u7B56\u7565" }), _jsxs("select", { value: selectionStrategy, onChange: (e) => { setSelectionStrategy(e.target.value); setDirty(true); }, className: "w-full bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none", children: [_jsx("option", { value: "RANDOM", children: "RANDOM" }), _jsx("option", { value: "ROUND_ROBIN", children: "ROUND_ROBIN" }), _jsx("option", { value: "MANUAL", children: "MANUAL" }), _jsx("option", { value: "DAILY", children: "DAILY" }), _jsx("option", { value: "WEEKLY", children: "WEEKLY" }), _jsx("option", { value: "MONTHLY", children: "MONTHLY" }), _jsx("option", { value: "WEIGHTED_RANDOM", children: "WEIGHTED_RANDOM" })] })] }), _jsx(Input, { label: "\u751F\u6210\u5668 Key", value: generatorKey, onChange: (e) => { setGeneratorKey(e.target.value); setDirty(true); }, placeholder: "\u53EF\u9009" }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--sb-text-secondary)] mb-1.5", children: "\u8C03\u5EA6\u7C92\u5EA6" }), _jsxs("select", { value: scheduleGranularity, onChange: (e) => { setScheduleGranularity(e.target.value); setDirty(true); }, className: "w-full bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none", children: [_jsx("option", { value: "", children: "\u4E0D\u9002\u7528" }), _jsx("option", { value: "DAILY", children: "DAILY" }), _jsx("option", { value: "WEEKLY", children: "WEEKLY" }), _jsx("option", { value: "MONTHLY", children: "MONTHLY" }), _jsx("option", { value: "SEASONAL", children: "SEASONAL" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: allowRepeatedPuzzle, onChange: (e) => { setAllowRepeatedPuzzle(e.target.checked); setDirty(true); }, className: "cursor-pointer" }), _jsx("span", { className: "text-sm text-[var(--sb-text-primary)]", children: "\u5141\u8BB8\u91CD\u590D\u9898\u76EE" })] }), _jsx(Input, { label: "\u91CD\u590D\u51B7\u5374 (\u5C0F\u65F6)", type: "number", value: repeatCooldownHours, onChange: (e) => { setRepeatCooldownHours(e.target.value); setDirty(true); }, placeholder: "\u4E0D\u9650" })] })] }), _jsxs(Card, { children: [_jsx("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u751F\u6210\u5668\u914D\u7F6E (JSON)" }), _jsx("textarea", { className: "w-full h-32 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg p-3 font-mono text-sm text-[var(--sb-text-primary)] resize-y", value: generatorConfigStr, onChange: (e) => { setGeneratorConfigStr(e.target.value); setDirty(true); } })] }), _jsxs(Card, { children: [_jsx("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u9898\u5E93\u8FC7\u6EE4 (JSON)" }), _jsx("textarea", { className: "w-full h-32 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg p-3 font-mono text-sm text-[var(--sb-text-primary)] resize-y", value: puzzlePoolFilterStr, onChange: (e) => { setPuzzlePoolFilterStr(e.target.value); setDirty(true); } })] }), _jsxs(Card, { children: [_jsx("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u6743\u91CD\u914D\u7F6E (JSON)" }), _jsx("textarea", { className: "w-full h-32 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg p-3 font-mono text-sm text-[var(--sb-text-primary)] resize-y", value: weightConfigStr, onChange: (e) => { setWeightConfigStr(e.target.value); setDirty(true); } })] })] }));
}
//# sourceMappingURL=content-policy-detail.js.map