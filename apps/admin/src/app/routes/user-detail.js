import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetUserApi, adminBanUserApi, adminUnbanUserApi, adminUpdateUserRoleApi, adminRevokeSessionApi, adminRevokeAllSessionsApi } from '../../features/users/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { useState } from 'react';
export default function UserDetailPage({ userId: userIdProp }) {
    const { openTab } = useTabStore();
    const userId = userIdProp || '';
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('info');
    const { data: user, isLoading } = useQuery({
        queryKey: ['admin-user', userId],
        queryFn: () => adminGetUserApi(userId),
        enabled: !!userId,
    });
    const banMutation = useMutation({
        mutationFn: () => adminBanUserApi(userId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-user', userId] }),
    });
    const unbanMutation = useMutation({
        mutationFn: () => adminUnbanUserApi(userId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-user', userId] }),
    });
    const roleMutation = useMutation({
        mutationFn: (role) => adminUpdateUserRoleApi(userId, role),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-user', userId] }),
    });
    const revokeSessionMutation = useMutation({
        mutationFn: (sessionId) => adminRevokeSessionApi(userId, sessionId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-user', userId] }),
    });
    const revokeAllMutation = useMutation({
        mutationFn: () => adminRevokeAllSessionsApi(userId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-user', userId] }),
    });
    if (isLoading)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u52A0\u8F7D\u4E2D..." });
    if (!user)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u7528\u6237\u672A\u627E\u5230" });
    const tabs = [
        { key: 'info', label: '基本信息' },
        { key: 'sessions', label: `会话 (${user.sessions?.length || 0})` },
    ];
    return (_jsxs("div", { className: "p-6 max-w-5xl mx-auto space-y-6", children: [_jsx("button", { onClick: () => openTab({ id: '/users', title: '用户管理', path: '/users' }), className: "text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] cursor-pointer inline-block", children: "\u2190 \u8FD4\u56DE\u7528\u6237\u5217\u8868" }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: user.username }), _jsx("p", { className: "text-sm text-[var(--sb-text-muted)]", children: user.email })] }), _jsxs("div", { className: "flex gap-2", children: [user.role === 'USER' && _jsx(Button, { size: "sm", onClick: () => roleMutation.mutate('ADMIN'), children: "\u8BBE\u4E3A\u7BA1\u7406\u5458" }), user.role === 'ADMIN' && _jsx(Button, { size: "sm", variant: "secondary", onClick: () => roleMutation.mutate('USER'), children: "\u53D6\u6D88\u7BA1\u7406\u5458" }), user.status === 'ACTIVE' ? (_jsx(Button, { size: "sm", variant: "danger", onClick: () => banMutation.mutate(), children: "\u5C01\u7981\u7528\u6237" })) : (_jsx(Button, { size: "sm", onClick: () => unbanMutation.mutate(), children: "\u89E3\u5C01\u7528\u6237" }))] })] }), _jsx(Tabs, { tabs: tabs, activeKey: activeTab, onChange: setActiveTab }), activeTab === 'info' && (_jsx(Card, { children: _jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "ID: " }), _jsx("span", { className: "font-mono text-[var(--sb-text-primary)]", children: user.id })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u89D2\u8272: " }), _jsx(Badge, { variant: user.role === 'ADMIN' ? 'primary' : 'default', children: user.role })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u72B6\u6001: " }), _jsx(Badge, { variant: user.status === 'ACTIVE' ? 'success' : 'danger', children: user.status === 'ACTIVE' ? '活跃' : '已封禁' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u6311\u6218\u6B21\u6570: " }), _jsx("span", { className: "text-[var(--sb-text-primary)]", children: user.attemptCount })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u5B8C\u6210\u6B21\u6570: " }), _jsx("span", { className: "text-[var(--sb-text-primary)]", children: user.completedCount })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u6700\u540E\u767B\u5F55: " }), _jsx("span", { className: "text-[var(--sb-text-primary)]", children: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u6CE8\u518C\u65F6\u95F4: " }), _jsx("span", { className: "text-[var(--sb-text-primary)]", children: new Date(user.createdAt).toLocaleString() })] })] }) })), activeTab === 'sessions' && (_jsxs(Card, { children: [_jsx("div", { className: "flex justify-end mb-4", children: _jsx(Button, { size: "sm", variant: "danger", onClick: () => revokeAllMutation.mutate(), disabled: revokeAllMutation.isPending, children: "\u64A4\u9500\u5168\u90E8\u4F1A\u8BDD" }) }), user.sessions && user.sessions.length > 0 ? (_jsx("div", { className: "space-y-2", children: user.sessions.map((session) => (_jsxs("div", { className: "flex items-center justify-between py-3 px-4 border border-[var(--sb-border)] rounded-lg", children: [_jsxs("div", { className: "text-sm", children: [_jsx("div", { className: "text-[var(--sb-text-primary)]", children: session.userAgent || '未知设备' }), _jsxs("div", { className: "text-[var(--sb-text-muted)] text-xs", children: ["IP: ", session.ipAddress || '-', " | \u6700\u540E\u4F7F\u7528: ", session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : '-'] })] }), _jsx("div", { className: "flex items-center gap-2", children: session.revokedAt ? (_jsx(Badge, { variant: "danger", children: "\u5DF2\u64A4\u9500" })) : (_jsx(Button, { size: "sm", variant: "ghost", onClick: () => revokeSessionMutation.mutate(session.id), children: "\u64A4\u9500" })) })] }, session.id))) })) : (_jsx("p", { className: "text-sm text-[var(--sb-text-muted)]", children: "\u6682\u65E0\u6D3B\u8DC3\u4F1A\u8BDD" }))] }))] }));
}
//# sourceMappingURL=user-detail.js.map