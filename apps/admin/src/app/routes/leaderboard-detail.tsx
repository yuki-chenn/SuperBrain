import { useTabStore } from '../../stores/useTabStore';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { apiRequest } from '../../lib/api-client';
import { useState } from 'react';

interface LeaderboardEntry {
  rank: number;
  user: { id: string; username: string };
  rankValue: any;
  metrics: any;
  bestAttemptId: string;
  completedAt?: string;
}

interface LeaderboardDetailPageProps {
  leaderboardId?: string;
}

export default function LeaderboardDetailPage({ leaderboardId: leaderboardIdProp }: LeaderboardDetailPageProps) {
  const { openTab } = useTabStore();
  const leaderboardId = leaderboardIdProp || '';
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data: lbInfo } = useQuery({
    queryKey: ['admin-lb-info', leaderboardId],
    queryFn: () => apiRequest<any>(`/admin/leaderboards/${leaderboardId}`),
    enabled: !!leaderboardId,
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ['admin-lb-entries', leaderboardId, page],
    queryFn: () => apiRequest<{ items: LeaderboardEntry[]; total: number }>(
      `/admin/leaderboards/${leaderboardId}/entries?limit=${pageSize}&offset=${(page - 1) * pageSize}`
    ),
    enabled: !!leaderboardId,
  });

  const totalPages = entries ? Math.ceil(entries.total / pageSize) : 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <button onClick={() => openTab({ id: '/leaderboards', title: '排行榜', path: '/leaderboards' })} className="text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] cursor-pointer mb-1 inline-block">&larr; 返回排行榜</button>
        <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">{lbInfo?.name || '排行榜详情'}</h1>
        {lbInfo && (
          <div className="flex items-center gap-3 mt-1 text-sm text-[var(--sb-text-muted)]">
            <Badge variant="default">{lbInfo.gameSlug}</Badge>
            <span>排序：{lbInfo.rankMetric} {lbInfo.rankDirection === 'ASC' ? '↑' : '↓'}</span>
            <span>共 {entries?.total ?? 0} 条记录</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
      ) : entries && entries.items.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--sb-border)]">
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">排名</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">用户</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">排名值</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">指标详情</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">最佳尝试 ID</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">完成时间</th>
                </tr>
              </thead>
              <tbody>
                {entries.items.map((entry) => (
                  <tr key={entry.rank} className="border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]">
                    <td className="py-3 px-4 font-mono text-[var(--sb-text-muted)] font-semibold">#{entry.rank}</td>
                    <td className="py-3 px-4 text-[var(--sb-text-primary)] font-medium">{entry.user.username}</td>
                    <td className="py-3 px-4 font-mono text-[var(--sb-text-secondary)]">{String(entry.rankValue)}</td>
                    <td className="py-3 px-4">
                      {entry.metrics ? (
                        <div className="space-y-1">
                          {Object.entries(entry.metrics).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 text-xs">
                              <span className="text-[var(--sb-text-muted)] min-w-[100px]">{key}</span>
                              <span className="text-[var(--sb-text-primary)] font-mono">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[var(--sb-text-muted)]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[var(--sb-text-muted)] text-xs">{entry.bestAttemptId}</td>
                    <td className="py-3 px-4 text-[var(--sb-text-muted)] text-xs">{entry.completedAt ? new Date(entry.completedAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="text-center text-[var(--sb-text-muted)] py-8">暂无排行榜数据</div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <span className="text-sm text-[var(--sb-text-muted)] px-3">{page} / {totalPages}</span>
          <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}
