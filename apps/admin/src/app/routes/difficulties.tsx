import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { adminListDifficultiesApi, adminActivateDifficultyApi } from '../../features/games/api';
import { GameFilter } from '../../components/admin/GameFilter';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
  DRAFT: { label: '草稿', variant: 'default' },
  ACTIVE: { label: '激活', variant: 'success' },
  INACTIVE: { label: '停用', variant: 'warning' },
  ARCHIVED: { label: '归档', variant: 'danger' },
};

export default function DifficultiesPage({ initialGameId }: { initialGameId?: string } = {}) {
  const { openTab } = useTabStore();
  const queryClient = useQueryClient();
  const [gameId, setGameId] = useState(initialGameId || '');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-difficulties', gameId, statusFilter],
    queryFn: () => adminListDifficultiesApi({ gameId: gameId || undefined, status: statusFilter || undefined }),
  });

  const activateMutation = useMutation({
    mutationFn: adminActivateDifficultyApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-difficulties'] }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">难度配置</h1>
      <Card>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <GameFilter value={gameId} onChange={(v) => { setGameId(v); }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer"
          >
            <option value="">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="ACTIVE">激活</option>
            <option value="INACTIVE">停用</option>
          </select>
          {data && <span className="text-sm text-[var(--sb-text-muted)] ml-auto">共 {data.total} 条</span>}
        </div>
        {isLoading ? (
          <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
        ) : data && data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--sb-border)]">
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">游戏</th>
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">Key</th>
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">标签</th>
                  <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">版本</th>
                  <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">限时(ms)</th>
                  <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">状态</th>
                  <th className="text-right py-3 px-3 text-[var(--sb-text-muted)] font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => (
                  <tr key={d.id} className="border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]">
                    <td className="py-3 px-3 text-[var(--sb-text-primary)] text-xs">{d.game?.title || d.gameId}</td>
                    <td className="py-3 px-3 font-mono text-xs text-[var(--sb-text-primary)]">{d.key}</td>
                    <td className="py-3 px-3 text-[var(--sb-text-primary)]">{d.label}</td>
                    <td className="py-3 px-3 text-center text-[var(--sb-text-secondary)]">v{d.version}</td>
                    <td className="py-3 px-3 text-center text-[var(--sb-text-secondary)]">{d.maxDurationMs ?? '-'}</td>
                    <td className="py-3 px-3 text-center"><Badge variant={STATUS_LABELS[d.status]?.variant || 'default'}>{STATUS_LABELS[d.status]?.label || d.status}</Badge></td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => openTab({ id: `/difficulties/${d.id}`, title: `难度 - ${d.label}`, path: `/difficulties/${d.id}` })}>编辑</Button>
                      {d.status !== 'ACTIVE' && (
                        <Button size="sm" variant="ghost" onClick={() => activateMutation.mutate(d.id)}>激活</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-[var(--sb-text-muted)] py-8">暂无数据</div>
        )}
      </Card>
    </div>
  );
}
