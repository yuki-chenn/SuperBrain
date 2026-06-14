import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { adminListContentPoliciesApi, adminActivateContentPolicyApi } from '../../features/games/api';
import { GameFilter } from '../../components/admin/GameFilter';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
export default function ContentPoliciesPage({ initialGameId } = {}) {
    const { openTab } = useTabStore();
    const queryClient = useQueryClient();
    const [gameId, setGameId] = useState(initialGameId || '');
    const [statusFilter, setStatusFilter] = useState('');
    const { data, isLoading } = useQuery({
        queryKey: ['admin-content-policies', gameId, statusFilter],
        queryFn: () => adminListContentPoliciesApi({ gameId: gameId || undefined, status: statusFilter || undefined }),
    });
    const activateMutation = useMutation({
        mutationFn: adminActivateContentPolicyApi,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-content-policies'] }),
    });
    return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: "\u9898\u5E93\u914D\u7F6E" }), _jsxs(Card, { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4 mb-4", children: [_jsx(GameFilter, { value: gameId, onChange: setGameId }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer", children: [_jsx("option", { value: "", children: "\u5168\u90E8\u72B6\u6001" }), _jsx("option", { value: "DRAFT", children: "\u8349\u7A3F" }), _jsx("option", { value: "ACTIVE", children: "\u6FC0\u6D3B" }), _jsx("option", { value: "INACTIVE", children: "\u505C\u7528" })] }), data && _jsxs("span", { className: "text-sm text-[var(--sb-text-muted)] ml-auto", children: ["\u5171 ", data.total, " \u6761"] })] }), isLoading ? _jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u52A0\u8F7D\u4E2D..." }) : data && data.items.length > 0 ? (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-[var(--sb-border)]", children: [_jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u6E38\u620F" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u5185\u5BB9\u6A21\u5F0F" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u9009\u62E9\u7B56\u7565" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u72B6\u6001" }), _jsx("th", { className: "text-right py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u64CD\u4F5C" })] }) }), _jsx("tbody", { children: data.items.map((cp) => (_jsxs("tr", { className: "border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]", children: [_jsx("td", { className: "py-3 px-3 text-xs text-[var(--sb-text-primary)]", children: cp.game?.title || cp.gameId }), _jsx("td", { className: "py-3 px-3", children: _jsx(Badge, { variant: "primary", children: cp.contentMode }) }), _jsx("td", { className: "py-3 px-3 text-[var(--sb-text-secondary)]", children: cp.selectionStrategy }), _jsx("td", { className: "py-3 px-3 text-center", children: _jsx(Badge, { variant: cp.status === 'ACTIVE' ? 'success' : 'default', children: cp.status }) }), _jsxs("td", { className: "py-3 px-3 text-right space-x-1", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => openTab({ id: `/content-policies/${cp.id}`, title: `题库-${cp.game?.title || ''}-${cp.contentMode}`, path: `/content-policies/${cp.id}` }), children: "\u7F16\u8F91" }), cp.status !== 'ACTIVE' && _jsx(Button, { size: "sm", variant: "ghost", onClick: () => activateMutation.mutate(cp.id), children: "\u6FC0\u6D3B" })] })] }, cp.id))) })] }) })) : _jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u6682\u65E0\u6570\u636E" })] })] }));
}
//# sourceMappingURL=content-policies.js.map