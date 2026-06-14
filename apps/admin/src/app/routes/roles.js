import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminListRolesApi, adminCreateRoleApi } from '../../features/roles/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
const ROLE_KEY_REGEX = /^[a-z][a-z0-9_]*$/;
export default function RolesPage() {
    const { openTab } = useTabStore();
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const { data: roles, isLoading } = useQuery({
        queryKey: ['admin-roles'],
        queryFn: adminListRolesApi,
    });
    const createMutation = useMutation({
        mutationFn: adminCreateRoleApi,
        onSuccess: (newRole) => {
            queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
            setShowCreate(false);
            openTab({ id: `/roles/${newRole.id}`, title: `角色 - ${newRole.name}`, path: `/roles/${newRole.id}` });
        },
    });
    return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: "\u89D2\u8272\u914D\u7F6E" }), _jsx(Button, { size: "sm", onClick: () => setShowCreate(true), children: "\u65B0\u5EFA\u89D2\u8272" })] }), _jsx(Card, { children: isLoading ? (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u52A0\u8F7D\u4E2D..." })) : roles && roles.length > 0 ? (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-[var(--sb-border)]", children: [_jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "Key" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u540D\u79F0" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u63CF\u8FF0" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u7C7B\u578B" }), _jsx("th", { className: "text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u6743\u9650\u6570" })] }) }), _jsx("tbody", { children: roles.map((role) => (_jsxs("tr", { className: "border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)] cursor-pointer", onClick: () => openTab({ id: `/roles/${role.id}`, title: `角色 - ${role.name}`, path: `/roles/${role.id}` }), children: [_jsx("td", { className: "py-3 px-3 font-mono text-xs text-[var(--sb-text-primary)]", children: role.key }), _jsx("td", { className: "py-3 px-3 text-[var(--sb-text-primary)] font-medium", children: role.name }), _jsx("td", { className: "py-3 px-3 text-[var(--sb-text-secondary)] text-xs max-w-xs truncate", children: role.description || '-' }), _jsx("td", { className: "py-3 px-3 text-center", children: role.isSystem ? _jsx(Badge, { variant: "warning", children: "\u7CFB\u7EDF" }) : _jsx(Badge, { children: "\u81EA\u5B9A\u4E49" }) }), _jsx("td", { className: "py-3 px-3 text-center text-[var(--sb-text-secondary)]", children: role.permissionKeys.length })] }, role.id))) })] }) })) : (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u6682\u65E0\u89D2\u8272" })) }), _jsx(CreateRoleModal, { open: showCreate, onClose: () => setShowCreate(false), onSubmit: (body) => createMutation.mutate(body), loading: createMutation.isPending, error: createMutation.isError ? createMutation.error?.body?.message || '创建失败' : null })] }));
}
function CreateRoleModal({ open, onClose, onSubmit, loading, error, }) {
    const [key, setKey] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const valid = ROLE_KEY_REGEX.test(key) && name.trim().length > 0;
    return (_jsx(Modal, { open: open, title: "\u65B0\u5EFA\u89D2\u8272", onClose: onClose, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, children: "\u53D6\u6D88" }), _jsx(Button, { disabled: !valid || loading, onClick: () => onSubmit({ key, name, description: description || undefined }), children: loading ? '创建中...' : '创建' })] }), children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Key", placeholder: "\u5982 editor, reviewer", value: key, onChange: (e) => setKey(e.target.value), error: key && !ROLE_KEY_REGEX.test(key) ? '格式: 小写字母、数字、下划线' : undefined }), _jsx(Input, { label: "\u540D\u79F0", placeholder: "\u89D2\u8272\u663E\u793A\u540D\u79F0", value: name, onChange: (e) => setName(e.target.value) }), _jsx(Input, { label: "\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09", placeholder: "\u89D2\u8272\u8BF4\u660E", value: description, onChange: (e) => setDescription(e.target.value) }), error && _jsx("p", { className: "text-sm text-[var(--sb-danger)]", children: error })] }) }));
}
//# sourceMappingURL=roles.js.map