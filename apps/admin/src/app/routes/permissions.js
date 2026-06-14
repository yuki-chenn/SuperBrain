import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminListPermissionsApi, adminCreatePermissionApi, adminUpdatePermissionApi, adminDeletePermissionApi, } from '../../features/roles/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
const KEY_REGEX = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;
export default function PermissionsPage() {
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [filterResource, setFilterResource] = useState('');
    const { data: permissions, isLoading } = useQuery({
        queryKey: ['admin-permissions'],
        queryFn: adminListPermissionsApi,
    });
    const createMutation = useMutation({
        mutationFn: adminCreatePermissionApi,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-permissions'] }); setShowCreate(false); },
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, body }) => adminUpdatePermissionApi(id, body),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-permissions'] }); setEditItem(null); },
    });
    const deleteMutation = useMutation({
        mutationFn: adminDeletePermissionApi,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-permissions'] }),
    });
    const resources = permissions
        ? Array.from(new Set(permissions.map((p) => p.resource))).sort()
        : [];
    const filtered = permissions
        ? filterResource ? permissions.filter((p) => p.resource === filterResource) : permissions
        : [];
    return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: "\u6743\u9650\u914D\u7F6E" }), _jsx(Button, { size: "sm", onClick: () => setShowCreate(true), children: "\u65B0\u5EFA\u6743\u9650" })] }), _jsxs(Card, { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4 mb-4", children: [_jsxs("select", { value: filterResource, onChange: (e) => setFilterResource(e.target.value), className: "bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer", children: [_jsx("option", { value: "", children: "\u5168\u90E8\u8D44\u6E90" }), resources.map((r) => _jsx("option", { value: r, children: r }, r))] }), permissions && _jsxs("span", { className: "text-sm text-[var(--sb-text-muted)] ml-auto", children: ["\u5171 ", filtered.length, " \u4E2A\u6743\u9650"] })] }), isLoading ? (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u52A0\u8F7D\u4E2D..." })) : filtered.length > 0 ? (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-[var(--sb-border)]", children: [_jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "Key" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u8D44\u6E90" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u64CD\u4F5C" }), _jsx("th", { className: "text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u63CF\u8FF0" }), _jsx("th", { className: "text-right py-3 px-3 text-[var(--sb-text-muted)] font-medium", children: "\u64CD\u4F5C" })] }) }), _jsx("tbody", { children: filtered.map((perm) => (_jsxs("tr", { className: "border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]", children: [_jsx("td", { className: "py-3 px-3 font-mono text-xs text-[var(--sb-text-primary)]", children: perm.key }), _jsx("td", { className: "py-3 px-3", children: _jsx(Badge, { children: perm.resource }) }), _jsx("td", { className: "py-3 px-3", children: _jsx(Badge, { variant: "primary", children: perm.action }) }), _jsx("td", { className: "py-3 px-3 text-[var(--sb-text-secondary)] text-xs max-w-xs truncate", children: perm.description || '-' }), _jsxs("td", { className: "py-3 px-3 text-right space-x-1", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => setEditItem(perm), children: "\u7F16\u8F91" }), _jsx(Button, { size: "sm", variant: "ghost", className: "text-[var(--sb-danger)]", onClick: () => {
                                                            if (confirm(`确定删除权限 "${perm.key}"？`))
                                                                deleteMutation.mutate(perm.id);
                                                        }, children: "\u5220\u9664" })] })] }, perm.id))) })] }) })) : (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u6682\u65E0\u6743\u9650" }))] }), _jsx(CreatePermissionModal, { open: showCreate, onClose: () => setShowCreate(false), onSubmit: (body) => createMutation.mutate(body), loading: createMutation.isPending, error: createMutation.isError ? createMutation.error?.body?.message || '创建失败' : null }), _jsx(EditDescriptionModal, { open: !!editItem, item: editItem, onClose: () => setEditItem(null), onSubmit: (body) => { if (editItem)
                    updateMutation.mutate({ id: editItem.id, body }); }, loading: updateMutation.isPending })] }));
}
// ─── Create modal ─────────────────────────────────────────────────
function CreatePermissionModal({ open, onClose, onSubmit, loading, error, }) {
    const [key, setKey] = useState('');
    const [description, setDescription] = useState('');
    const valid = KEY_REGEX.test(key);
    return (_jsx(Modal, { open: open, title: "\u65B0\u5EFA\u6743\u9650", onClose: onClose, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, children: "\u53D6\u6D88" }), _jsx(Button, { disabled: !valid || loading, onClick: () => onSubmit({ key, description: description || undefined }), children: loading ? '创建中...' : '创建' })] }), children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Key", placeholder: "resource:action\uFF08\u5982 game:read\uFF09", value: key, onChange: (e) => setKey(e.target.value), error: key && !valid ? '格式: 小写字母/数字/连字符，如 resource:action' : undefined }), _jsx(Input, { label: "\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09", placeholder: "\u6743\u9650\u7684\u7528\u9014\u8BF4\u660E", value: description, onChange: (e) => setDescription(e.target.value) }), error && _jsx("p", { className: "text-sm text-[var(--sb-danger)]", children: error })] }) }));
}
// ─── Edit description modal ───────────────────────────────────────
function EditDescriptionModal({ open, item, onClose, onSubmit, loading, }) {
    const [description, setDescription] = useState('');
    // Reset when item changes
    useEffect(() => { if (item)
        setDescription(item.description || ''); }, [item?.id]);
    return (_jsx(Modal, { open: open, title: `编辑权限: ${item?.key || ''}`, onClose: onClose, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, children: "\u53D6\u6D88" }), _jsx(Button, { disabled: loading, onClick: () => onSubmit({ description: description || undefined }), children: loading ? '保存中...' : '保存' })] }), children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "text-sm text-[var(--sb-text-muted)]", children: ["Key: ", _jsx("span", { className: "font-mono text-[var(--sb-text-primary)]", children: item?.key }), _jsx("span", { className: "ml-2 text-xs", children: "\uFF08\u4E0D\u53EF\u4FEE\u6539\uFF09" })] }), _jsx(Input, { label: "\u63CF\u8FF0", placeholder: "\u6743\u9650\u7684\u7528\u9014\u8BF4\u660E", value: description, onChange: (e) => setDescription(e.target.value) })] }) }));
}
//# sourceMappingURL=permissions.js.map