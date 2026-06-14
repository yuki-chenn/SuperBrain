import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminListPermissionsApi, adminCreatePermissionApi, adminUpdatePermissionApi, adminDeletePermissionApi,
  type AdminPermission,
} from '../../features/roles/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

const KEY_REGEX = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;

export default function PermissionsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<AdminPermission | null>(null);
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
    mutationFn: ({ id, body }: { id: string; body: { description?: string } }) => adminUpdatePermissionApi(id, body),
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">权限配置</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>新建权限</Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <select
            value={filterResource}
            onChange={(e) => setFilterResource(e.target.value)}
            className="bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer"
          >
            <option value="">全部资源</option>
            {resources.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {permissions && <span className="text-sm text-[var(--sb-text-muted)] ml-auto">共 {filtered.length} 个权限</span>}
        </div>

        {isLoading ? (
          <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--sb-border)]">
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">Key</th>
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">资源</th>
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">操作</th>
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">描述</th>
                  <th className="text-right py-3 px-3 text-[var(--sb-text-muted)] font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((perm) => (
                  <tr key={perm.id} className="border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]">
                    <td className="py-3 px-3 font-mono text-xs text-[var(--sb-text-primary)]">{perm.key}</td>
                    <td className="py-3 px-3"><Badge>{perm.resource}</Badge></td>
                    <td className="py-3 px-3"><Badge variant="primary">{perm.action}</Badge></td>
                    <td className="py-3 px-3 text-[var(--sb-text-secondary)] text-xs max-w-xs truncate">{perm.description || '-'}</td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditItem(perm)}>编辑</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[var(--sb-danger)]"
                        onClick={() => {
                          if (confirm(`确定删除权限 "${perm.key}"？`)) deleteMutation.mutate(perm.id);
                        }}
                      >
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-[var(--sb-text-muted)] py-8">暂无权限</div>
        )}
      </Card>

      {/* Create modal */}
      <CreatePermissionModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(body) => createMutation.mutate(body)}
        loading={createMutation.isPending}
        error={createMutation.isError ? (createMutation.error as any)?.body?.message || '创建失败' : null}
      />

      {/* Edit modal */}
      <EditDescriptionModal
        open={!!editItem}
        item={editItem}
        onClose={() => setEditItem(null)}
        onSubmit={(body) => { if (editItem) updateMutation.mutate({ id: editItem.id, body }); }}
        loading={updateMutation.isPending}
      />
    </div>
  );
}

// ─── Create modal ─────────────────────────────────────────────────

function CreatePermissionModal({
  open, onClose, onSubmit, loading, error,
}: {
  open: boolean; onClose: () => void; onSubmit: (body: { key: string; description?: string }) => void;
  loading: boolean; error: string | null;
}) {
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');

  const valid = KEY_REGEX.test(key);

  return (
    <Modal
      open={open}
      title="新建权限"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button disabled={!valid || loading} onClick={() => onSubmit({ key, description: description || undefined })}>
            {loading ? '创建中...' : '创建'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Key"
          placeholder="resource:action（如 game:read）"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          error={key && !valid ? '格式: 小写字母/数字/连字符，如 resource:action' : undefined}
        />
        <Input
          label="描述（可选）"
          placeholder="权限的用途说明"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {error && <p className="text-sm text-[var(--sb-danger)]">{error}</p>}
      </div>
    </Modal>
  );
}

// ─── Edit description modal ───────────────────────────────────────

function EditDescriptionModal({
  open, item, onClose, onSubmit, loading,
}: {
  open: boolean; item: AdminPermission | null; onClose: () => void;
  onSubmit: (body: { description?: string }) => void; loading: boolean;
}) {
  const [description, setDescription] = useState('');

  // Reset when item changes
  useEffect(() => { if (item) setDescription(item.description || ''); }, [item?.id]);

  return (
    <Modal
      open={open}
      title={`编辑权限: ${item?.key || ''}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button disabled={loading} onClick={() => onSubmit({ description: description || undefined })}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-sm text-[var(--sb-text-muted)]">
          Key: <span className="font-mono text-[var(--sb-text-primary)]">{item?.key}</span>
          <span className="ml-2 text-xs">（不可修改）</span>
        </div>
        <Input
          label="描述"
          placeholder="权限的用途说明"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </Modal>
  );
}
