import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminListGamesApi, adminPublishGameApi, adminArchiveGameApi } from '../../features/games/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { useState } from 'react';

export default function GamesPage() {
  const { openTab } = useTabStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-games', statusFilter],
    queryFn: () => adminListGamesApi({ status: statusFilter || undefined, pageSize: 50 }),
  });

  const publishMutation = useMutation({
    mutationFn: (gameId: string) => adminPublishGameApi(gameId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-games'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (gameId: string) => adminArchiveGameApi(gameId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-games'] }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">游戏管理</h1>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer"
          >
            <option value="">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="PUBLISHED">已发布</option>
            <option value="ARCHIVED">已归档</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
      ) : data && data.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((game) => (
            <Card key={game.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[var(--sb-text-primary)]">{game.title}</h3>
                  <p className="text-xs text-[var(--sb-text-muted)] font-mono">{game.slug}</p>
                </div>
                <Badge variant={game.status === 'PUBLISHED' ? 'success' : game.status === 'ARCHIVED' ? 'default' : 'warning'}>
                  {game.status === 'PUBLISHED' ? '已发布' : game.status === 'ARCHIVED' ? '已归档' : '草稿'}
                </Badge>
              </div>
              <p className="text-sm text-[var(--sb-text-muted)] mb-3 line-clamp-2">{game.description}</p>
              <div className="flex items-center gap-4 text-xs text-[var(--sb-text-muted)] mb-4">
                <span>题目: {game.puzzleCount}</span>
                <span>挑战: {game.attemptCount}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => {
                  const detailPath = `/games/${game.id}`;
                  openTab({ id: detailPath, title: `游戏 - ${game.title}`, path: detailPath });
                }}>详情</Button>
                {game.slug === 'absolute-command' && (
                  <Button size="sm" variant="secondary" onClick={() => {
                    openTab({ id: '/puzzles/absolute-command', title: '题库: 绝对指令', path: '/puzzles/absolute-command' });
                  }}>题库</Button>
                )}
                {game.status === 'DRAFT' && (
                  <Button size="sm" onClick={() => publishMutation.mutate(game.id)}>发布</Button>
                )}
                {game.status === 'PUBLISHED' && (
                  <Button size="sm" variant="danger" onClick={() => archiveMutation.mutate(game.id)}>归档</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center text-[var(--sb-text-muted)] py-8">暂无游戏</div>
      )}
    </div>
  );
}
