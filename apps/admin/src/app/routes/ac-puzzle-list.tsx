import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminListACPuzzlesApi, adminPublishPuzzleApi, adminUnpublishPuzzleApi } from '../../features/puzzles/ac-admin-api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { useState } from 'react';

export default function ACPuzzleListPage() {
  const { openTab } = useTabStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-ac-puzzles', statusFilter, difficultyFilter, page],
    queryFn: () => adminListACPuzzlesApi({
      status: statusFilter || undefined,
      difficultyLabel: difficultyFilter || undefined,
      page,
      pageSize: 20,
    }),
  });

  const publishMutation = useMutation({
    mutationFn: (puzzleId: string) => adminPublishPuzzleApi(puzzleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ac-puzzles'] }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (puzzleId: string) => adminUnpublishPuzzleApi(puzzleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ac-puzzles'] }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => openTab({ id: '/games', title: '游戏管理', path: '/games' })} className="text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] cursor-pointer mb-1 inline-block">&larr; 返回题库</button>
          <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">绝对指令 · 题库</h1>
        </div>
        <Button onClick={() => openTab({ id: '/puzzles/absolute-command/create', title: '创建题目', path: '/puzzles/absolute-command/create' })}>创建题目</Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--sb-text-secondary)]">状态：</span>
            <div className="flex gap-1">
              {[
                { key: '', label: '全部' },
                { key: 'DRAFT', label: '草稿' },
                { key: 'PUBLISHED', label: '已发布' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => { setStatusFilter(s.key); setPage(1); }}
                  className={`px-3 py-1 text-sm rounded-lg cursor-pointer transition-colors ${
                    statusFilter === s.key
                      ? 'bg-[var(--sb-primary)] text-white'
                      : 'bg-[var(--sb-bg-muted)] text-[var(--sb-text-secondary)] hover:text-[var(--sb-text-primary)]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--sb-text-secondary)]">难度：</span>
            <select
              value={difficultyFilter}
              onChange={(e) => { setDifficultyFilter(e.target.value); setPage(1); }}
              className="bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer"
            >
              <option value="">全部</option>
              <option value="入门">入门</option>
              <option value="标准">标准</option>
              <option value="困难">困难</option>
              <option value="专家">专家</option>
            </select>
          </div>
          {data && (
            <span className="text-sm text-[var(--sb-text-muted)] ml-auto">共 {data.total} 个题目</span>
          )}
        </div>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
      ) : data && data.items.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--sb-border)]">
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">标题</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">Slug</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">难度</th>
                  <th className="text-center py-3 px-4 text-[var(--sb-text-muted)] font-medium">迷宫大小</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">状态</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">创建时间</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">修改时间</th>
                  <th className="text-left py-3 px-4 text-[var(--sb-text-muted)] font-medium">发布时间</th>
                  <th className="text-right py-3 px-4 text-[var(--sb-text-muted)] font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((puzzle) => (
                  <tr key={puzzle.id} className="border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]">
                    <td className="py-3 px-4 text-[var(--sb-text-primary)] font-medium max-w-[200px] truncate">{puzzle.title}</td>
                    <td className="py-3 px-4 text-[var(--sb-text-muted)] font-mono text-xs">{puzzle.slug}</td>
                    <td className="py-3 px-4">
                      {puzzle.difficultyLabel ? <Badge variant="default">{puzzle.difficultyLabel}</Badge> : <span className="text-[var(--sb-text-muted)]">-</span>}
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--sb-text-secondary)] font-mono text-xs">
                      {puzzle.mazeSize.width}×{puzzle.mazeSize.height}×{puzzle.mazeSize.depth}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={puzzle.status === 'PUBLISHED' ? 'success' : 'warning'}>
                        {puzzle.status === 'PUBLISHED' ? '已发布' : '草稿'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-[var(--sb-text-muted)] text-xs">{new Date(puzzle.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-[var(--sb-text-muted)] text-xs">{new Date(puzzle.updatedAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-[var(--sb-text-muted)] text-xs">{puzzle.publishedAt ? new Date(puzzle.publishedAt).toLocaleString() : '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => {
                          const mazePath = `/puzzles/absolute-command/${puzzle.id}`;
                          openTab({ id: mazePath, title: `${puzzle.title}`, path: mazePath });
                        }}>编辑</Button>
                        {puzzle.status === 'PUBLISHED' ? (
                          <Button size="sm" variant="danger" onClick={() => unpublishMutation.mutate(puzzle.id)} disabled={unpublishMutation.isPending}>下架</Button>
                        ) : (
                          <Button size="sm" onClick={() => publishMutation.mutate(puzzle.id)} disabled={publishMutation.isPending}>发布</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="text-center text-[var(--sb-text-muted)] py-12">暂无题目，点击"创建题目"开始</div>
      )}

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <span className="text-sm text-[var(--sb-text-muted)] px-3">{page} / {Math.ceil(data.total / 20)}</span>
          <Button size="sm" variant="secondary" disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}
