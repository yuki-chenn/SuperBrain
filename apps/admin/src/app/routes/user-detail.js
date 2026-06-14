import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetUserApi, adminBanUserApi, adminUnbanUserApi, adminUpdateUserRoleApi, adminRevokeSessionApi, adminRevokeAllSessionsApi } from '../../features/users/api';
import { adminListRolesApi, adminListUserRolesApi, adminAssignRoleApi, adminRevokeRoleApi } from '../../features/roles/api';
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
        { key: 'roles', label: '角色分配' },
        { key: 'sessions', label: `会话 (${user.sessions?.length || 0})` },
    ];
    return (_jsxs("div", { className: "p-6 max-w-5xl mx-auto space-y-6", children: [_jsx("button", { onClick: () => openTab({ id: '/users', title: '用户管理', path: '/users' }), className: "text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] cursor-pointer inline-block", children: "\u2190 \u8FD4\u56DE\u7528\u6237\u5217\u8868" }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: user.username }), _jsx("p", { className: "text-sm text-[var(--sb-text-muted)]", children: user.email })] }), _jsx("div", { className: "flex gap-2", children: user.status === 'ACTIVE' ? (_jsx(Button, { size: "sm", variant: "danger", onClick: () => banMutation.mutate(), children: "\u5C01\u7981\u7528\u6237" })) : (_jsx(Button, { size: "sm", onClick: () => unbanMutation.mutate(), children: "\u89E3\u5C01\u7528\u6237" })) })] }), _jsx(Tabs, { tabs: tabs, activeKey: activeTab, onChange: setActiveTab }), activeTab === 'info' && (_jsx(Card, { children: _jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "ID: " }), _jsx("span", { className: "font-mono text-[var(--sb-text-primary)]", children: user.id })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u89D2\u8272: " }), _jsx(Badge, { variant: user.role === 'ADMIN' ? 'primary' : 'default', children: user.role })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u72B6\u6001: " }), _jsx(Badge, { variant: user.status === 'ACTIVE' ? 'success' : 'danger', children: user.status === 'ACTIVE' ? '活跃' : '已封禁' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u6311\u6218\u6B21\u6570: " }), _jsx("span", { className: "text-[var(--sb-text-primary)]", children: user.attemptCount })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u5B8C\u6210\u6B21\u6570: " }), _jsx("span", { className: "text-[var(--sb-text-primary)]", children: user.completedCount })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u6700\u540E\u767B\u5F55: " }), _jsx("span", { className: "text-[var(--sb-text-primary)]", children: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "\u6CE8\u518C\u65F6\u95F4: " }), _jsx("span", { className: "text-[var(--sb-text-primary)]", children: new Date(user.createdAt).toLocaleString() })] })] }) })), activeTab === 'roles' && (_jsx(UserRoleAssignment, { userId: userId })), activeTab === 'sessions' && (_jsxs(Card, { children: [_jsx("div", { className: "flex justify-end mb-4", children: _jsx(Button, { size: "sm", variant: "danger", onClick: () => revokeAllMutation.mutate(), disabled: revokeAllMutation.isPending, children: "\u64A4\u9500\u5168\u90E8\u4F1A\u8BDD" }) }), user.sessions && user.sessions.length > 0 ? (_jsx("div", { className: "space-y-2", children: user.sessions.map((session) => (_jsxs("div", { className: "flex items-center justify-between py-3 px-4 border border-[var(--sb-border)] rounded-lg", children: [_jsxs("div", { className: "text-sm", children: [_jsx("div", { className: "text-[var(--sb-text-primary)]", children: session.userAgent || '未知设备' }), _jsxs("div", { className: "text-[var(--sb-text-muted)] text-xs", children: ["IP: ", session.ipAddress || '-', " | \u6700\u540E\u4F7F\u7528: ", session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : '-'] })] }), _jsx("div", { className: "flex items-center gap-2", children: session.revokedAt ? (_jsx(Badge, { variant: "danger", children: "\u5DF2\u64A4\u9500" })) : (_jsx(Button, { size: "sm", variant: "ghost", onClick: () => revokeSessionMutation.mutate(session.id), children: "\u64A4\u9500" })) })] }, session.id))) })) : (_jsx("p", { className: "text-sm text-[var(--sb-text-muted)]", children: "\u6682\u65E0\u6D3B\u8DC3\u4F1A\u8BDD" }))] }))] }));
}
// ─── Role assignment sub-component ────────────────────────────────
function UserRoleAssignment({ userId }) {
    const queryClient = useQueryClient();
    const { data: userRoles, isLoading: userRolesLoading } = useQuery({
        queryKey: ['admin-user-roles', userId],
        queryFn: () => adminListUserRolesApi(userId),
    });
    const { data: allRoles, isLoading: allRolesLoading } = useQuery({
        queryKey: ['admin-roles'],
        queryFn: adminListRolesApi,
    });
    const assignMutation = useMutation({
        mutationFn: (roleKey) => adminAssignRoleApi(userId, roleKey),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-user-roles', userId] });
            queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
        },
    });
    const revokeMutation = useMutation({
        mutationFn: (roleKey) => adminRevokeRoleApi(userId, roleKey),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-user-roles', userId] });
            queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
        },
    });
    const [selectedRole, setSelectedRole] = useState('');
    const userRoleKeys = new Set(userRoles?.map((r) => r.roleKey) || []);
    const availableRoles = allRoles?.filter((r) => !userRoleKeys.has(r.key)) || [];
    const handleAssign = () => {
        if (!selectedRole)
            return;
        assignMutation.mutate(selectedRole);
        setSelectedRole('');
    };
    if (userRolesLoading || allRolesLoading) {
        return _jsx(Card, { children: _jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-4", children: "\u52A0\u8F7D\u4E2D..." }) });
    }
    return (_jsx(Card, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-[var(--sb-text-primary)] mb-3", children: "\u5F53\u524D\u89D2\u8272" }), userRoles && userRoles.length > 0 ? (_jsx("div", { className: "flex flex-wrap gap-2", children: userRoles.map((ur) => (_jsxs("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--sb-primary-soft)] border border-[var(--sb-primary)]/20 rounded-lg", children: [_jsx("span", { className: "text-sm text-[var(--sb-primary)] font-medium", children: ur.roleName }), _jsxs("span", { className: "text-xs text-[var(--sb-text-muted)]", children: ["(", ur.roleKey, ")"] }), _jsx("button", { onClick: () => {
                                            if (confirm(`确定移除角色 "${ur.roleName}"？`))
                                                revokeMutation.mutate(ur.roleKey);
                                        }, className: "ml-1 text-[var(--sb-text-muted)] hover:text-[var(--sb-danger)] cursor-pointer text-lg leading-none border-none bg-transparent", title: "\u79FB\u9664\u89D2\u8272", children: "\u00D7" })] }, ur.roleKey))) })) : (_jsx("p", { className: "text-sm text-[var(--sb-text-muted)]", children: "\u6682\u65E0\u5206\u914D\u89D2\u8272" }))] }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-[var(--sb-text-primary)] mb-3", children: "\u6DFB\u52A0\u89D2\u8272" }), availableRoles.length > 0 ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { value: selectedRole, onChange: (e) => setSelectedRole(e.target.value), className: "flex-1 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer", children: [_jsx("option", { value: "", children: "\u9009\u62E9\u89D2\u8272..." }), availableRoles.map((r) => (_jsxs("option", { value: r.key, children: [r.name, " (", r.key, ")"] }, r.id)))] }), _jsx(Button, { size: "sm", disabled: !selectedRole || assignMutation.isPending, onClick: handleAssign, children: assignMutation.isPending ? '添加中...' : '添加' })] })) : (_jsx("p", { className: "text-sm text-[var(--sb-text-muted)]", children: "\u6240\u6709\u89D2\u8272\u5DF2\u5206\u914D" }))] }), (assignMutation.isError || revokeMutation.isError) && (_jsx("p", { className: "text-sm text-[var(--sb-danger)]", children: assignMutation.error?.body?.message || revokeMutation.error?.body?.message || '操作失败' }))] }) }));
}
//# sourceMappingURL=user-detail.js.map