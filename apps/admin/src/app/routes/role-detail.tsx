import { useState, useEffect, useMemo } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminListRolesApi, adminUpdateRoleApi, adminDeleteRoleApi,
  adminListPermissionsApi, type AdminRole, type AdminPermission,
} from '../../features/roles/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

interface RoleDetailPageProps {
  roleId?: string;
}

export default function RoleDetailPage({ roleId: roleIdProp }: RoleDetailPageProps) {
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
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
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
    mutationFn: (body: { name?: string; description?: string; permissionKeys?: string[] }) =>
      adminUpdateRoleApi(roleId, body),
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
    if (!allPermissions) return [];
    const map = new Map<string, AdminPermission[]>();
    for (const p of allPermissions) {
      if (!map.has(p.resource)) map.set(p.resource, []);
      map.get(p.resource)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions]);

  const filtered = useMemo(() => {
    if (!search) return grouped;
    const q = search.toLowerCase();
    return grouped
      .map(([resource, perms]) => [
        resource,
        perms.filter((p) => p.key.includes(q) || p.description?.includes(q)),
      ] as [string, AdminPermission[]])
      .filter(([, perms]) => perms.length > 0);
  }, [grouped, search]);

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setDirty(true);
  };

  const toggleResource = (perms: AdminPermission[]) => {
    const allSelected = perms.every((p) => selectedKeys.has(p.key));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (allSelected) next.delete(p.key);
        else next.add(p.key);
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

  if (rolesLoading) return <div className="p-6 text-[var(--sb-text-muted)]">加载中...</div>;
  if (!role) return <div className="p-6 text-[var(--sb-text-muted)]">角色未找到</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">{role.name}</h1>
          {role.isSystem ? <Badge variant="warning">系统角色</Badge> : <Badge>自定义</Badge>}
        </div>
        <div className="flex gap-2">
          {!role.isSystem && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                if (confirm(`确定删除角色 "${role.name}"？此操作不可撤销。`)) deleteMutation.mutate();
              }}
            >
              删除角色
            </Button>
          )}
        </div>
      </div>

      {/* Basic info */}
      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">基本信息</h2>
        <div className="space-y-4">
          <div className="text-sm">
            <span className="text-[var(--sb-text-muted)]">Key: </span>
            <span className="font-mono text-[var(--sb-text-primary)]">{role.key}</span>
          </div>
          <Input label="名称" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="描述" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="角色描述" />
        </div>
      </Card>

      {/* Permissions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--sb-text-primary)]">
            权限配置 <span className="text-sm font-normal text-[var(--sb-text-muted)]">（已选 {selectedKeys.size} 项）</span>
          </h2>
          <Input
            placeholder="搜索权限..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {permsLoading ? (
          <div className="text-center text-[var(--sb-text-muted)] py-4">加载中...</div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filtered.map(([resource, perms]) => {
              const allSelected = perms.every((p) => selectedKeys.has(p.key));
              const someSelected = perms.some((p) => selectedKeys.has(p.key));
              return (
                <div key={resource} className="border border-[var(--sb-border)] rounded-lg">
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 bg-[var(--sb-bg-muted)] cursor-pointer select-none"
                    onClick={() => toggleResource(perms)}
                  >
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      readOnly
                      className="cursor-pointer"
                    />
                    <Badge variant="primary">{resource}</Badge>
                    <span className="text-xs text-[var(--sb-text-muted)]">{perms.length} 项</span>
                  </div>
                  <div className="divide-y divide-[var(--sb-border)]">
                    {perms.map((p) => (
                      <label
                        key={p.key}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--sb-bg-muted)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(p.key)}
                          onChange={() => toggleKey(p.key)}
                          className="cursor-pointer"
                        />
                        <span className="font-mono text-xs text-[var(--sb-text-primary)] min-w-[180px]">{p.key}</span>
                        <span className="text-xs text-[var(--sb-text-muted)] truncate">{p.description || ''}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Save bar */}
      {dirty && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? '保存中...' : '保存修改'}
          </Button>
        </div>
      )}

      {updateMutation.isError && (
        <p className="text-sm text-[var(--sb-danger)] text-right">
          {(updateMutation.error as any)?.body?.message || '保存失败'}
        </p>
      )}
    </div>
  );
}
