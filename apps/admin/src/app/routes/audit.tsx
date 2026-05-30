import { useQuery } from '@tanstack/react-query';
import { adminListAuditLogsApi } from '../../features/audit/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useState } from 'react';

export default function AuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page],
    queryFn: () => adminListAuditLogsApi({ page, pageSize: 30 }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">审计日志</h1>
      <Card>
        {isLoading ? (
          <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--sb-border)]">
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">时间</th>
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">操作人</th>
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">操作</th>
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">资源类型</th>
                    <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">资源 ID</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log) => (
                    <tr key={log.id} className="border-b border-[var(--sb-border)]">
                      <td className="py-3 px-3 text-[var(--sb-text-muted)] text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="py-3 px-3 text-[var(--sb-text-primary)]">{log.actorUsername || '-'}</td>
                      <td className="py-3 px-3"><Badge variant="default">{log.action}</Badge></td>
                      <td className="py-3 px-3 text-[var(--sb-text-secondary)]">{log.resourceType}</td>
                      <td className="py-3 px-3 text-[var(--sb-text-muted)] font-mono text-xs">{log.resourceId?.slice(0, 8) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.total > 30 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                <span className="text-sm text-[var(--sb-text-muted)] px-3">{page} / {Math.ceil(data.total / 30)}</span>
                <Button size="sm" variant="secondary" disabled={page >= Math.ceil(data.total / 30)} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-[var(--sb-text-muted)] py-8">暂无审计日志</div>
        )}
      </Card>
    </div>
  );
}
