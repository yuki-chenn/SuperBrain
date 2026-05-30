import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetUserApi, adminBanUserApi, adminUnbanUserApi, adminUpdateUserRoleApi, adminRevokeSessionApi, adminRevokeAllSessionsApi } from '../../features/users/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { useState } from 'react';

interface UserDetailPageProps {
  userId?: string;
}

export default function UserDetailPage({ userId: userIdProp }: UserDetailPageProps) {
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
    mutationFn: (role: string) => adminUpdateUserRoleApi(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-user', userId] }),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => adminRevokeSessionApi(userId, sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-user', userId] }),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => adminRevokeAllSessionsApi(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-user', userId] }),
  });

  if (isLoading) return <div className="p-6 text-[var(--sb-text-muted)]">加载中...</div>;
  if (!user) return <div className="p-6 text-[var(--sb-text-muted)]">用户未找到</div>;

  const tabs = [
    { key: 'info', label: '基本信息' },
    { key: 'sessions', label: `会话 (${user.sessions?.length || 0})` },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <button onClick={() => openTab({ id: '/users', title: '用户管理', path: '/users' })} className="text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] cursor-pointer inline-block">&larr; 返回用户列表</button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">{user.username}</h1>
          <p className="text-sm text-[var(--sb-text-muted)]">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.role === 'USER' && <Button size="sm" onClick={() => roleMutation.mutate('ADMIN')}>设为管理员</Button>}
          {user.role === 'ADMIN' && <Button size="sm" variant="secondary" onClick={() => roleMutation.mutate('USER')}>取消管理员</Button>}
          {user.status === 'ACTIVE' ? (
            <Button size="sm" variant="danger" onClick={() => banMutation.mutate()}>封禁用户</Button>
          ) : (
            <Button size="sm" onClick={() => unbanMutation.mutate()}>解封用户</Button>
          )}
        </div>
      </div>

      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'info' && (
        <Card>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-[var(--sb-text-muted)]">ID: </span><span className="font-mono text-[var(--sb-text-primary)]">{user.id}</span></div>
            <div><span className="text-[var(--sb-text-muted)]">角色: </span><Badge variant={user.role === 'ADMIN' ? 'primary' : 'default'}>{user.role}</Badge></div>
            <div><span className="text-[var(--sb-text-muted)]">状态: </span><Badge variant={user.status === 'ACTIVE' ? 'success' : 'danger'}>{user.status === 'ACTIVE' ? '活跃' : '已封禁'}</Badge></div>
            <div><span className="text-[var(--sb-text-muted)]">挑战次数: </span><span className="text-[var(--sb-text-primary)]">{user.attemptCount}</span></div>
            <div><span className="text-[var(--sb-text-muted)]">完成次数: </span><span className="text-[var(--sb-text-primary)]">{user.completedCount}</span></div>
            <div><span className="text-[var(--sb-text-muted)]">最后登录: </span><span className="text-[var(--sb-text-primary)]">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}</span></div>
            <div><span className="text-[var(--sb-text-muted)]">注册时间: </span><span className="text-[var(--sb-text-primary)]">{new Date(user.createdAt).toLocaleString()}</span></div>
          </div>
        </Card>
      )}

      {activeTab === 'sessions' && (
        <Card>
          <div className="flex justify-end mb-4">
            <Button size="sm" variant="danger" onClick={() => revokeAllMutation.mutate()} disabled={revokeAllMutation.isPending}>
              撤销全部会话
            </Button>
          </div>
          {user.sessions && user.sessions.length > 0 ? (
            <div className="space-y-2">
              {user.sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between py-3 px-4 border border-[var(--sb-border)] rounded-lg">
                  <div className="text-sm">
                    <div className="text-[var(--sb-text-primary)]">{session.userAgent || '未知设备'}</div>
                    <div className="text-[var(--sb-text-muted)] text-xs">
                      IP: {session.ipAddress || '-'} | 最后使用: {session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : '-'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.revokedAt ? (
                      <Badge variant="danger">已撤销</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => revokeSessionMutation.mutate(session.id)}>撤销</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--sb-text-muted)]">暂无活跃会话</p>
          )}
        </Card>
      )}
    </div>
  );
}
