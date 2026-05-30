import { useTabStore } from '../../stores/useTabStore';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { apiRequest } from '../../lib/api-client';
import { useState } from 'react';

interface AdminAttempt {
  id: string;
  username: string;
  gameSlug: string;
  difficultyKey: string;
  puzzleTitle?: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  metrics?: any;
}

export default function AttemptsPage() {
  const { openTab } = useTabStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-attempts', statusFilter, page],
    queryFn: () => apiRequest<{ items: AdminAttempt[]; total: number }>(`/admin/attempts?${statusFilter ? `status=${statusFilter}&` : ''}page=${page}&pageSize=20`),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">挑战记录</h1>
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer">
            <option value="">全部状态</option>
            <option value="STARTED">进行中</option>
            <option value="COMPLETED">已完成</option>
            <option value="FAILED">挑战失败</option>
          </select>
          {data && <span className="text-sm text-[var(--sb-text-muted)] ml-auto">共 {data.total} 条记录</span>}
        </div>
        {isLoading ? (
          <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--sb-border)]">
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">用户</th>
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">游戏</th>
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">题目</th>
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">状态</th>
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">开始时间</th>
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">完成时间</th>
                    <th className="text-right py-3 px-3 text-[var(--sb-text-muted)] font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((attempt) => (
                    <tr key={attempt.id} className="border-b border-[var(--sb-border)]">
                      <td className="py-3 px-3 text-[var(--sb-text-primary)]">{attempt.username}</td>
                      <td className="py-3 px-3"><Badge variant="default">{attempt.gameSlug}</Badge></td>
                      <td className="py-3 px-3 text-[var(--sb-text-secondary)] max-w-[200px] truncate">{attempt.puzzleTitle || '-'}</td>
                      <td className="py-3 px-3">
                        <Badge variant={attempt.status === 'COMPLETED' ? 'success' : attempt.status === 'STARTED' ? 'primary' : 'danger'}>
                          {attempt.status === 'COMPLETED' ? '已完成' : attempt.status === 'STARTED' ? '进行中' : '挑战失败'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-[var(--sb-text-muted)] text-xs">{new Date(attempt.startedAt).toLocaleString()}</td>
                      <td className="py-3 px-3 text-[var(--sb-text-muted)] text-xs">{attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : '-'}</td>
                      <td className="py-3 px-3 text-right"><Button size="sm" variant="ghost" onClick={() => {
                        const detailPath = `/attempts/${attempt.id}`;
                        openTab({ id: detailPath, title: `挑战 - ${attempt.username}`, path: detailPath });
                      }}>详情</Button></td>
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
          <div className="text-center text-[var(--sb-text-muted)] py-8">暂无记录</div>
        )}
      </Card>
    </div>
  );
}
