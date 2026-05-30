import { useTabStore } from '../../stores/useTabStore';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { apiRequest } from '../../lib/api-client';
import { useState } from 'react';

interface LeaderboardDef {
  id: string;
  slug: string;
  name: string;
  scope: string;
  rankMetric: string;
  rankDirection: string;
  entryCount: number;
  gameSlug: string;
  puzzleId?: string;
  createdAt: string;
}

export default function LeaderboardsPage() {
  const { openTab } = useTabStore();
  const [gameFilter, setGameFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-leaderboards', gameFilter, page],
    queryFn: () => apiRequest<{ items: LeaderboardDef[]; total: number }>(
      `/admin/leaderboards?${gameFilter ? `gameSlug=${gameFilter}&` : ''}page=${page}&pageSize=30`
    ),
  });

  const filteredItems = data?.items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
  }) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">排行榜管理</h1>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--sb-text-secondary)]">游戏：</span>
            <select
              value={gameFilter}
              onChange={(e) => { setGameFilter(e.target.value); setPage(1); }}
              className="bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer"
            >
              <option value="">全部游戏</option>
              <option value="absolute-command">绝对指令</option>
              <option value="sliding-puzzle">数字华容道</option>
              <option value="life-game">生命游戏</option>
              <option value="precise-character-building">精准造字</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <span className="text-sm text-[var(--sb-text-secondary)]">搜索：</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索排行榜名称或 slug..."
              className="flex-1 px-3 py-1.5 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg text-sm text-[var(--sb-text-primary)] placeholder:text-[var(--sb-text-muted)] outline-none focus:border-[var(--sb-primary)]"
            />
          </div>
          {data && (
            <span className="text-sm text-[var(--sb-text-muted)] ml-auto">共 {data.total} 个排行榜</span>
          )}
        </div>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
      ) : filteredItems.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--sb-border)]">
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">名称</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">Slug</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">游戏</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">排序规则</th>
                  <th className="text-center py-3 px-4 text-[var(--sb-text-muted)] font-medium">条目数</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">创建时间</th>
                  <th className="text-right py-3 px-4 text-[var(--sb-text-muted)] font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((lb) => (
                  <tr key={lb.id} className="border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]">
                    <td className="py-3 px-4 text-[var(--sb-text-primary)] font-medium max-w-[250px] truncate">{lb.name}</td>
                    <td className="py-3 px-4 text-[var(--sb-text-muted)] font-mono text-xs">{lb.slug}</td>
                    <td className="py-3 px-4"><Badge variant="default">{lb.gameSlug}</Badge></td>
                    <td className="py-3 px-4 text-[var(--sb-text-secondary)] text-xs">
                      {lb.rankMetric} {lb.rankDirection === 'ASC' ? '↑' : '↓'}
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--sb-text-secondary)]">{lb.entryCount}</td>
                    <td className="py-3 px-4 text-[var(--sb-text-muted)] text-xs">{new Date(lb.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="ghost" onClick={() => {
                        const detailPath = `/leaderboards/${lb.id}`;
                        openTab({ id: detailPath, title: `排行榜 - ${lb.name}`, path: detailPath });
                      }}>查看</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="text-center text-[var(--sb-text-muted)] py-8">
          {search ? '未找到匹配的排行榜' : '暂无排行榜'}
        </div>
      )}

      {/* Pagination */}
      {data && data.total > 30 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <span className="text-sm text-[var(--sb-text-muted)] px-3">{page} / {Math.ceil(data.total / 30)}</span>
          <Button size="sm" variant="secondary" disabled={page >= Math.ceil(data.total / 30)} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}
