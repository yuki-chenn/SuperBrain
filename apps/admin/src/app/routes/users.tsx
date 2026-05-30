import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminListUsersApi, adminBanUserApi, adminUnbanUserApi } from '../../features/users/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

export default function UsersPage() {
  const { openTab } = useTabStore();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', keyword, statusFilter, page],
    queryFn: () => adminListUsersApi({ keyword: keyword || undefined, status: statusFilter || undefined, page, pageSize: 20 }),
  });

  const banMutation = useMutation({
    mutationFn: (userId: string) => adminBanUserApi(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => adminUnbanUserApi(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">用户管理</h1>

      <Card>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <Input
            placeholder="搜索用户名或邮箱..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer"
          >
            <option value="">全部状态</option>
            <option value="ACTIVE">活跃</option>
            <option value="BANNED">已封禁</option>
          </select>
          {data && <span className="text-sm text-[var(--sb-text-muted)] ml-auto">共 {data.total} 个用户</span>}
        </div>

        {isLoading ? (
          <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--sb-border)]">
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">用户名</th>
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">邮箱</th>
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">角色</th>
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">状态</th>
                    <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">挑战</th>
                    <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">完成</th>
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">注册时间</th>
                    <th className="text-right py-3 px-3 text-[var(--sb-text-muted)] font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((user) => (
                    <tr key={user.id} className="border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)] cursor-pointer" onClick={() => {
                      const detailPath = `/users/${user.id}`;
                      openTab({ id: detailPath, title: `用户 - ${user.username}`, path: detailPath });
                    }}>
                      <td className="py-3 px-3 text-[var(--sb-text-primary)] font-medium">{user.username}</td>
                      <td className="py-3 px-3 text-[var(--sb-text-muted)] text-xs">{user.email}</td>
                      <td className="py-3 px-3"><Badge variant={user.role === 'ADMIN' ? 'primary' : 'default'}>{user.role}</Badge></td>
                      <td className="py-3 px-3"><Badge variant={user.status === 'ACTIVE' ? 'success' : 'danger'}>{user.status === 'ACTIVE' ? '活跃' : '已封禁'}</Badge></td>
                      <td className="py-3 px-3 text-center text-[var(--sb-text-secondary)]">{user.attemptCount}</td>
                      <td className="py-3 px-3 text-center text-[var(--sb-text-secondary)]">{user.completedCount}</td>
                      <td className="py-3 px-3 text-[var(--sb-text-muted)] text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-3 text-right">
                        {user.status === 'ACTIVE' ? (
                          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); banMutation.mutate(user.id); }}>封禁</Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); unbanMutation.mutate(user.id); }}>解封</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.total > 20 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                <span className="text-sm text-[var(--sb-text-muted)] px-3">{page} / {Math.ceil(data.total / 20)}</span>
                <Button size="sm" variant="secondary" disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-[var(--sb-text-muted)] py-8">暂无用户</div>
        )}
      </Card>
    </div>
  );
}
