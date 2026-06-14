import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminListRolesApi, adminCreateRoleApi, type AdminRole } from '../../features/roles/api';
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">角色配置</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>新建角色</Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
        ) : roles && roles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--sb-border)]">
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">Key</th>
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">名称</th>
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">描述</th>
                  <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">类型</th>
                  <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">权限数</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr
                    key={role.id}
                    className="border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)] cursor-pointer"
                    onClick={() => openTab({ id: `/roles/${role.id}`, title: `角色 - ${role.name}`, path: `/roles/${role.id}` })}
                  >
                    <td className="py-3 px-3 font-mono text-xs text-[var(--sb-text-primary)]">{role.key}</td>
                    <td className="py-3 px-3 text-[var(--sb-text-primary)] font-medium">{role.name}</td>
                    <td className="py-3 px-3 text-[var(--sb-text-secondary)] text-xs max-w-xs truncate">{role.description || '-'}</td>
                    <td className="py-3 px-3 text-center">
                      {role.isSystem ? <Badge variant="warning">系统</Badge> : <Badge>自定义</Badge>}
                    </td>
                    <td className="py-3 px-3 text-center text-[var(--sb-text-secondary)]">{role.permissionKeys.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-[var(--sb-text-muted)] py-8">暂无角色</div>
        )}
      </Card>

      {/* Create modal */}
      <CreateRoleModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(body) => createMutation.mutate(body)}
        loading={createMutation.isPending}
        error={createMutation.isError ? (createMutation.error as any)?.body?.message || '创建失败' : null}
      />
    </div>
  );
}

function CreateRoleModal({
  open, onClose, onSubmit, loading, error,
}: {
  open: boolean; onClose: () => void;
  onSubmit: (body: { key: string; name: string; description?: string }) => void;
  loading: boolean; error: string | null;
}) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const valid = ROLE_KEY_REGEX.test(key) && name.trim().length > 0;

  return (
    <Modal
      open={open}
      title="新建角色"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button disabled={!valid || loading} onClick={() => onSubmit({ key, name, description: description || undefined })}>
            {loading ? '创建中...' : '创建'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Key"
          placeholder="如 editor, reviewer"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          error={key && !ROLE_KEY_REGEX.test(key) ? '格式: 小写字母、数字、下划线' : undefined}
        />
        <Input label="名称" placeholder="角色显示名称" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="描述（可选）" placeholder="角色说明" value={description} onChange={(e) => setDescription(e.target.value)} />
        {error && <p className="text-sm text-[var(--sb-danger)]">{error}</p>}
      </div>
    </Modal>
  );
}
