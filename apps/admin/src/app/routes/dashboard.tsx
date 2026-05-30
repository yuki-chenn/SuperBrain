import { useQuery } from '@tanstack/react-query';
import { getDashboardOverviewApi } from '../../features/dashboard/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/Skeleton';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboardOverviewApi,
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--sb-text-primary)] mb-6">仪表盘</h1>
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-[var(--sb-text-muted)]">加载失败</div>;
  }

  const stats = [
    { label: '总用户数', value: data.totalUsers, color: 'text-[var(--sb-primary)]' },
    { label: '活跃用户', value: data.activeUsers, color: 'text-[var(--sb-success)]' },
    { label: '总挑战次数', value: data.totalAttempts, color: 'text-[var(--sb-accent)]' },
    { label: '完成次数', value: data.completedAttempts, color: 'text-[var(--sb-success)]' },
    { label: '游戏数', value: data.totalGames, color: 'text-[var(--sb-primary)]' },
    { label: '已发布题目', value: data.publishedPuzzles, color: 'text-[var(--sb-success)]' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">仪表盘</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="text-center">
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-[var(--sb-text-muted)] mt-1">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Recent audit logs */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--sb-text-primary)] mb-4">最近操作</h2>
        {data.recentAuditLogs.length > 0 ? (
          <div className="space-y-2">
            {data.recentAuditLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 py-2 border-b border-[var(--sb-border)] last:border-0">
                <Badge variant="default">{log.resourceType}</Badge>
                <span className="text-sm text-[var(--sb-text-primary)]">{log.action}</span>
                {log.actorUsername && (
                  <span className="text-sm text-[var(--sb-text-muted)]">by {log.actorUsername}</span>
                )}
                <span className="text-xs text-[var(--sb-text-muted)] ml-auto">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--sb-text-muted)]">暂无操作记录</p>
        )}
      </Card>
    </div>
  );
}
