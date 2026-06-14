import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { adminListChallengePoliciesApi, adminActivateChallengePolicyApi } from '../../features/games/api';
import { GameFilter } from '../../components/admin/GameFilter';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

export default function ChallengePoliciesPage({ initialGameId }: { initialGameId?: string } = {}) {
  const { openTab } = useTabStore();
  const queryClient = useQueryClient();
  const [gameId, setGameId] = useState(initialGameId || '');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-challenge-policies', gameId, statusFilter],
    queryFn: () => adminListChallengePoliciesApi({ gameId: gameId || undefined, status: statusFilter || undefined }),
  });

  const activateMutation = useMutation({
    mutationFn: adminActivateChallengePolicyApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-challenge-policies'] }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">挑战配置</h1>
      <Card>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <GameFilter value={gameId} onChange={setGameId} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer">
            <option value="">全部状态</option><option value="DRAFT">草稿</option><option value="ACTIVE">激活</option><option value="INACTIVE">停用</option>
          </select>
          {data && <span className="text-sm text-[var(--sb-text-muted)] ml-auto">共 {data.total} 条</span>}
        </div>
        {isLoading ? <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div> : data && data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[var(--sb-border)]">
                <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">游戏</th>
                <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">模式</th>
                <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">心跳</th>
                <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">日志模式</th>
                <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">排行榜</th>
                <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">状态</th>
                <th className="text-right py-3 px-3 text-[var(--sb-text-muted)] font-medium">操作</th>
              </tr></thead>
              <tbody>{data.items.map((cp) => (
                <tr key={cp.id} className="border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]">
                  <td className="py-3 px-3 text-xs text-[var(--sb-text-primary)]">{cp.game?.title || cp.gameId}</td>
                  <td className="py-3 px-3"><Badge variant="primary">{cp.mode}</Badge></td>
                  <td className="py-3 px-3 text-center text-[var(--sb-text-secondary)]">{cp.requiresHeartbeat ? `${cp.heartbeatIntervalSec}s` : '关闭'}</td>
                  <td className="py-3 px-3 text-center text-[var(--sb-text-secondary)]">{cp.operationLogMode}</td>
                  <td className="py-3 px-3 text-center"><Badge variant={cp.eligibleForLeaderboard ? 'success' : 'default'}>{cp.eligibleForLeaderboard ? '是' : '否'}</Badge></td>
                  <td className="py-3 px-3 text-center"><Badge variant={cp.status === 'ACTIVE' ? 'success' : 'default'}>{cp.status}</Badge></td>
                  <td className="py-3 px-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => openTab({ id: `/challenge-policies/${cp.id}`, title: `挑战-${cp.game?.title || ''}-${cp.mode}`, path: `/challenge-policies/${cp.id}` })}>编辑</Button>
                    {cp.status !== 'ACTIVE' && <Button size="sm" variant="ghost" onClick={() => activateMutation.mutate(cp.id)}>激活</Button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="text-center text-[var(--sb-text-muted)] py-8">暂无数据</div>}
      </Card>
    </div>
  );
}
