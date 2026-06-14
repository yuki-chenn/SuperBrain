import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetRuleVersionApi, adminUpdateRuleVersionApi, adminActivateRuleVersionApi } from '../../features/games/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
export default function RuleVersionDetailPage({ ruleVersionId: idProp }) {
    const id = idProp || '';
    const { openTab } = useTabStore();
    const queryClient = useQueryClient();
    const { data: item, isLoading } = useQuery({ queryKey: ['admin-rule-version', id], queryFn: () => adminGetRuleVersionApi(id), enabled: !!id });
    const [name, setName] = useState('');
    const [engineKey, setEngineKey] = useState('');
    const [engineVersion, setEngineVersion] = useState('');
    const [configStr, setConfigStr] = useState('{}');
    const [dirty, setDirty] = useState(false);
    useEffect(() => {
        if (item) {
            setName(item.name);
            setEngineKey(item.engineKey);
            setEngineVersion(item.engineVersion || '');
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
            return adminUpdateRuleVersionApi(id, { name, engineKey, engineVersion: engineVersion || null, config });
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-rule-version', id] }); queryClient.invalidateQueries({ queryKey: ['admin-rule-versions'] }); setDirty(false); },
    });
    const activateMutation = useMutation({ mutationFn: () => adminActivateRuleVersionApi(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-rule-version', id] }); queryClient.invalidateQueries({ queryKey: ['admin-rule-versions'] }); } });
    if (isLoading)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u52A0\u8F7D\u4E2D..." });
    if (!item)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u672A\u627E\u5230" });
    return (_jsxs("div", { className: "p-6 max-w-5xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: ["\u89C4\u5219 v", item.version] }), _jsx(Badge, { variant: item.status === 'ACTIVE' ? 'success' : 'default', children: item.status }), _jsx(Badge, { variant: item.validationStatus === 'VALID' ? 'success' : item.validationStatus === 'INVALID' ? 'danger' : 'default', children: item.validationStatus })] }), _jsxs("div", { className: "flex gap-2", children: [item.status !== 'ACTIVE' && _jsx(Button, { size: "sm", onClick: () => activateMutation.mutate(), children: "\u6FC0\u6D3B" }), dirty && _jsx(Button, { onClick: () => updateMutation.mutate(), disabled: updateMutation.isPending, children: updateMutation.isPending ? '保存中...' : '保存' })] })] }), item.game && _jsxs("div", { className: "text-sm text-[var(--sb-text-muted)]", children: ["\u6E38\u620F: ", _jsx("button", { className: "text-[var(--sb-primary)] hover:underline cursor-pointer bg-transparent border-none text-sm", onClick: () => openTab({ id: `/games/${item.game.id}`, title: `游戏 - ${item.game.title}`, path: `/games/${item.game.id}` }), children: item.game.title })] }), updateMutation.isError && _jsx("p", { className: "text-sm text-[var(--sb-danger)]", children: updateMutation.error?.message || '保存失败' }), _jsxs(Card, { children: [_jsx("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u57FA\u672C\u4FE1\u606F" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Input, { label: "\u540D\u79F0", value: name, onChange: (e) => { setName(e.target.value); setDirty(true); } }), _jsx(Input, { label: "\u5F15\u64CE Key", value: engineKey, onChange: (e) => { setEngineKey(e.target.value); setDirty(true); } }), _jsx(Input, { label: "\u5F15\u64CE\u7248\u672C", value: engineVersion, onChange: (e) => { setEngineVersion(e.target.value); setDirty(true); }, placeholder: "\u53EF\u9009" }), _jsx(Input, { label: "Schema \u7248\u672C", value: String(item.schemaVersion), disabled: true })] })] }), _jsxs(Card, { children: [_jsx("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u5F15\u64CE\u914D\u7F6E (JSON)" }), _jsx("textarea", { className: "w-full h-64 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg p-3 font-mono text-sm text-[var(--sb-text-primary)] resize-y", value: configStr, onChange: (e) => { setConfigStr(e.target.value); setDirty(true); } })] }), item.validationReport && Object.keys(item.validationReport).length > 0 && (_jsxs(Card, { children: [_jsx("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u9A8C\u8BC1\u62A5\u544A" }), _jsx("pre", { className: "text-xs text-[var(--sb-text-secondary)] bg-[var(--sb-bg-muted)] p-3 rounded-lg overflow-auto", children: JSON.stringify(item.validationReport, null, 2) })] }))] }));
}
//# sourceMappingURL=rule-version-detail.js.map