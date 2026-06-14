import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminListRolesApi, adminUpdateRoleApi, adminDeleteRoleApi, adminListPermissionsApi, } from '../../features/roles/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
export default function RoleDetailPage({ roleId: roleIdProp }) {
    const { openTab } = useTabStore();
    const queryClient = useQueryClient();
    const roleId = roleIdProp || '';
    const { data: roles, isLoading: rolesLoading } = useQuery({
        queryKey: ['admin-roles'],
        queryFn: adminListRolesApi,
    });
    const { data: allPermissions, isLoading: permsLoading } = useQuery({
        queryKey: ['admin-permissions'],
        queryFn: adminListPermissionsApi,
    });
    const role = roles?.find((r) => r.id === roleId);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedKeys, setSelectedKeys] = useState(new Set());
    const [search, setSearch] = useState('');
    const [dirty, setDirty] = useState(false);
    // Sync form state when role loads
    useEffect(() => {
        if (role) {
            setName(role.name);
            setDescription(role.description || '');
            setSelectedKeys(new Set(role.permissionKeys));
            setDirty(false);
        }
    }, [role?.id]);
    const updateMutation = useMutation({
        mutationFn: (body) => adminUpdateRoleApi(roleId, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
            setDirty(false);
        },
    });
    const deleteMutation = useMutation({
        mutationFn: () => adminDeleteRoleApi(roleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
            openTab({ id: '/roles', title: '角色配置', path: '/roles' });
        },
    });
    // Group permissions by resource
    const grouped = useMemo(() => {
        if (!allPermissions)
            return [];
        const map = new Map();
        for (const p of allPermissions) {
            if (!map.has(p.resource))
                map.set(p.resource, []);
            map.get(p.resource).push(p);
        }
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [allPermissions]);
    const filtered = useMemo(() => {
        if (!search)
            return grouped;
        const q = search.toLowerCase();
        return grouped
            .map(([resource, perms]) => [
            resource,
            perms.filter((p) => p.key.includes(q) || p.description?.includes(q)),
        ])
            .filter(([, perms]) => perms.length > 0);
    }, [grouped, search]);
    const toggleKey = (key) => {
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key))
                next.delete(key);
            else
                next.add(key);
            return next;
        });
        setDirty(true);
    };
    const toggleResource = (perms) => {
        const allSelected = perms.every((p) => selectedKeys.has(p.key));
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            for (const p of perms) {
                if (allSelected)
                    next.delete(p.key);
                else
                    next.add(p.key);
            }
            return next;
        });
        setDirty(true);
    };
    const handleSave = () => {
        updateMutation.mutate({
            name: name !== role?.name ? name : undefined,
            description: description !== (role?.description || '') ? description : undefined,
            permissionKeys: Array.from(selectedKeys).sort(),
        });
    };
    if (rolesLoading)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u52A0\u8F7D\u4E2D..." });
    if (!role)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u89D2\u8272\u672A\u627E\u5230" });
    return (_jsxs("div", { className: "p-6 max-w-5xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: role.name }), role.isSystem ? _jsx(Badge, { variant: "warning", children: "\u7CFB\u7EDF\u89D2\u8272" }) : _jsx(Badge, { children: "\u81EA\u5B9A\u4E49" })] }), _jsx("div", { className: "flex gap-2", children: !role.isSystem && (_jsx(Button, { size: "sm", variant: "danger", onClick: () => {
                                if (confirm(`确定删除角色 "${role.name}"？此操作不可撤销。`))
                                    deleteMutation.mutate();
                            }, children: "\u5220\u9664\u89D2\u8272" })) })] }), _jsxs(Card, { children: [_jsx("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u57FA\u672C\u4FE1\u606F" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "text-sm", children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "Key: " }), _jsx("span", { className: "font-mono text-[var(--sb-text-primary)]", children: role.key })] }), _jsx(Input, { label: "\u540D\u79F0", value: name, onChange: (e) => setName(e.target.value) }), _jsx(Input, { label: "\u63CF\u8FF0", value: description, onChange: (e) => setDescription(e.target.value), placeholder: "\u89D2\u8272\u63CF\u8FF0" })] })] }), _jsxs(Card, { children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("h2", { className: "text-base font-semibold text-[var(--sb-text-primary)]", children: ["\u6743\u9650\u914D\u7F6E ", _jsxs("span", { className: "text-sm font-normal text-[var(--sb-text-muted)]", children: ["\uFF08\u5DF2\u9009 ", selectedKeys.size, " \u9879\uFF09"] })] }), _jsx(Input, { placeholder: "\u641C\u7D22\u6743\u9650...", value: search, onChange: (e) => setSearch(e.target.value), className: "max-w-xs" })] }), permsLoading ? (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-4", children: "\u52A0\u8F7D\u4E2D..." })) : (_jsx("div", { className: "space-y-4 max-h-96 overflow-y-auto", children: filtered.map(([resource, perms]) => {
                            const allSelected = perms.every((p) => selectedKeys.has(p.key));
                            const someSelected = perms.some((p) => selectedKeys.has(p.key));
                            return (_jsxs("div", { className: "border border-[var(--sb-border)] rounded-lg", children: [_jsxs("div", { className: "flex items-center gap-3 px-4 py-2.5 bg-[var(--sb-bg-muted)] cursor-pointer select-none", onClick: () => toggleResource(perms), children: [_jsx("input", { type: "checkbox", checked: allSelected, ref: (el) => { if (el)
                                                    el.indeterminate = someSelected && !allSelected; }, readOnly: true, className: "cursor-pointer" }), _jsx(Badge, { variant: "primary", children: resource }), _jsxs("span", { className: "text-xs text-[var(--sb-text-muted)]", children: [perms.length, " \u9879"] })] }), _jsx("div", { className: "divide-y divide-[var(--sb-border)]", children: perms.map((p) => (_jsxs("label", { className: "flex items-center gap-3 px-4 py-2 hover:bg-[var(--sb-bg-muted)] cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: selectedKeys.has(p.key), onChange: () => toggleKey(p.key), className: "cursor-pointer" }), _jsx("span", { className: "font-mono text-xs text-[var(--sb-text-primary)] min-w-[180px]", children: p.key }), _jsx("span", { className: "text-xs text-[var(--sb-text-muted)] truncate", children: p.description || '' })] }, p.key))) })] }, resource));
                        }) }))] }), dirty && (_jsx("div", { className: "sticky bottom-4 flex justify-end", children: _jsx(Button, { onClick: handleSave, disabled: updateMutation.isPending, children: updateMutation.isPending ? '保存中...' : '保存修改' }) })), updateMutation.isError && (_jsx("p", { className: "text-sm text-[var(--sb-danger)] text-right", children: updateMutation.error?.body?.message || '保存失败' }))] }));
}
//# sourceMappingURL=role-detail.js.map