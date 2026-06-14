import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { adminListRuleVersionsApi, adminActivateRuleVersionApi } from '../../features/games/api';
import { GameFilter } from '../../components/admin/GameFilter';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

export default function RuleVersionsPage({ initialGameId }: { initialGameId?: string } = {}) {
  const { openTab } = useTabStore();
  const queryClient = useQueryClient();
  const [gameId, setGameId] = useState(initialGameId || '');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-rule-versions', gameId, statusFilter],
    queryFn: () => adminListRuleVersionsApi({ gameId: gameId || undefined, status: statusFilter || undefined }),
  });

  const activateMutation = useMutation({
    mutationFn: adminActivateRuleVersionApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-rule-versions'] }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">规则配置</h1>
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
                <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">版本</th>
                <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">名称</th>
                <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">引擎</th>
                <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">引擎版本</th>
                <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">验证状态</th>
                <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">状态</th>
                <th className="text-right py-3 px-3 text-[var(--sb-text-muted)] font-medium">操作</th>
              </tr></thead>
              <tbody>{data.items.map((rv) => (
                <tr key={rv.id} className="border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]">
                  <td className="py-3 px-3 text-xs text-[var(--sb-text-primary)]">{rv.game?.title || rv.gameId}</td>
                  <td className="py-3 px-3 text-center text-[var(--sb-text-secondary)]">v{rv.version}</td>
                  <td className="py-3 px-3 text-[var(--sb-text-primary)]">{rv.name}</td>
                  <td className="py-3 px-3 font-mono text-xs text-[var(--sb-text-primary)]">{rv.engineKey}</td>
                  <td className="py-3 px-3 text-xs text-[var(--sb-text-secondary)]">{rv.engineVersion || '-'}</td>
                  <td className="py-3 px-3 text-center"><Badge variant={rv.validationStatus === 'VALID' ? 'success' : rv.validationStatus === 'INVALID' ? 'danger' : 'default'}>{rv.validationStatus}</Badge></td>
                  <td className="py-3 px-3 text-center"><Badge variant={rv.status === 'ACTIVE' ? 'success' : 'default'}>{rv.status}</Badge></td>
                  <td className="py-3 px-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => openTab({ id: `/rule-versions/${rv.id}`, title: `规则-${rv.game?.title || ''}-v${rv.version}`, path: `/rule-versions/${rv.id}` })}>编辑</Button>
                    {rv.status !== 'ACTIVE' && <Button size="sm" variant="ghost" onClick={() => activateMutation.mutate(rv.id)}>激活</Button>}
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
