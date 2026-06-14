import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery } from '@tanstack/react-query';
import { adminListPuzzlesApi } from '../../features/puzzles/api';
import { adminListGamesApi, adminListDifficultiesApi } from '../../features/games/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
  DRAFT: { label: '草稿', variant: 'default' },
  PUBLISHED: { label: '已发布', variant: 'success' },
  ARCHIVED: { label: '已归档', variant: 'danger' },
  DISABLED: { label: '已禁用', variant: 'warning' },
};

interface Props { gameId?: string }

export default function PuzzleListPage({ gameId: gameIdProp }: Props) {
  const gameId = gameIdProp || '';
  const { openTab } = useTabStore();
  const [difficultyId, setDifficultyId] = useState('');
  const [page, setPage] = useState(1);

  const { data: games } = useQuery({
    queryKey: ['admin-games-for-puzzles'],
    queryFn: () => adminListGamesApi({ status: 'PUBLISHED', pageSize: 50 }),
    staleTime: 60_000,
  });
  const game = games?.items.find((g) => g.id === gameId);

  const { data: difficulties } = useQuery({
    queryKey: ['admin-difficulties-for-game', gameId],
    queryFn: () => adminListDifficultiesApi({ gameId, status: 'ACTIVE' }),
    enabled: !!gameId,
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-puzzles', gameId, difficultyId, page],
    queryFn: () => adminListPuzzlesApi({ gameId, page, pageSize: 20 }),
    enabled: !!gameId,
  });

  // Filter by difficulty client-side (backend doesn't support difficultyId filter)
  const filtered = data?.items.filter((p) => !difficultyId || p.difficultyId === difficultyId) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">题库-{game?.title || gameId}</h1>
      <Card>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <select value={difficultyId} onChange={(e) => { setDifficultyId(e.target.value); setPage(1); }}
            className="bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer">
            <option value="">全部难度</option>
            {difficulties?.items.map((d) => (
              <option key={d.id} value={d.id}>{d.label} ({d.key})</option>
            ))}
          </select>
          {data && <span className="text-sm text-[var(--sb-text-muted)] ml-auto">共 {filtered.length} 题</span>}
        </div>
        {isLoading ? (
          <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
        ) : filtered.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[var(--sb-border)]">
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">标题</th>
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">Slug</th>
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">难度</th>
                  <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">当前版本</th>
                  <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">状态</th>
                  <th className="text-right py-3 px-3 text-[var(--sb-text-muted)] font-medium">操作</th>
                </tr></thead>
                <tbody>{filtered.map((p) => {
                  const diff = difficulties?.items.find((d) => d.id === p.difficultyId);
                  const st = STATUS_LABELS[p.status];
                  return (
                    <tr key={p.id} className="border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]">
                      <td className="py-3 px-3 text-[var(--sb-text-primary)] font-medium">{p.title}</td>
                      <td className="py-3 px-3 font-mono text-xs text-[var(--sb-text-secondary)]">{p.slug}</td>
                      <td className="py-3 px-3 text-xs text-[var(--sb-text-secondary)]">{diff ? diff.label : '-'}</td>
                      <td className="py-3 px-3 text-center font-mono text-xs text-[var(--sb-text-secondary)]">{p.currentVersionId ? '已绑定' : '-'}</td>
                      <td className="py-3 px-3 text-center"><Badge variant={st?.variant || 'default'}>{st?.label || p.status}</Badge></td>
                      <td className="py-3 px-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => {
                          openTab({ id: `/puzzle-edit/${p.id}`, title: `题目-${p.title}`, path: `/puzzle-edit/${p.id}` });
                        }}>编辑</Button>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            {data && data.total > 20 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                <span className="text-sm text-[var(--sb-text-muted)] px-3">{page} / {Math.ceil(data.total / 20)}</span>
                <Button size="sm" variant="secondary" disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-[var(--sb-text-muted)] py-8">暂无题目</div>
        )}
      </Card>
    </div>
  );
}
