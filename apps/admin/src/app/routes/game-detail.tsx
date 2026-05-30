import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetGameApi, adminUpdateGameApi, adminPublishGameApi, adminArchiveGameApi, adminUpdateDimensionsApi } from '../../features/games/api';
import { useTabStore } from '../../stores/useTabStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useState, useEffect } from 'react';

const DEFAULT_DIMENSIONS = [
  { key: 'observe', label: '观察', value: 3 },
  { key: 'memory', label: '记忆', value: 3 },
  { key: 'spatial', label: '空间', value: 3 },
  { key: 'creative', label: '创造', value: 3 },
  { key: 'reasoning', label: '推理', value: 3 },
  { key: 'calculation', label: '计算', value: 3 },
];

export default function GameDetailPage({ gameId: gameIdProp }: { gameId?: string } = {}) {
  const queryClient = useQueryClient();
  const { openTab } = useTabStore();

  const gameId = gameIdProp || '';

  const { data: game, isLoading } = useQuery({
    queryKey: ['admin-game', gameId],
    queryFn: () => adminGetGameApi(gameId),
    enabled: !!gameId,
  });

  const [form, setForm] = useState({ title: '', subtitle: '', description: '', source: '', coverUrl: '' });
  const [dimensions, setDimensions] = useState(DEFAULT_DIMENSIONS);

  useEffect(() => {
    if (game) {
      setForm({ title: game.title, subtitle: game.subtitle || '', description: game.description, source: game.source || '', coverUrl: game.coverUrl || '' });
      const meta = game.metadata as any;
      if (meta?.dimensions && Array.isArray(meta.dimensions)) {
        setDimensions(meta.dimensions.map((d: any) => ({
          key: d.key,
          label: d.label,
          value: Math.max(1, Math.min(5, d.value)),
        })));
      }
    }
  }, [game]);

  const updateMutation = useMutation({
    mutationFn: () => adminUpdateGameApi(gameId, form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-game', gameId] }),
  });

  const publishMutation = useMutation({
    mutationFn: () => adminPublishGameApi(gameId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-game', gameId] }),
  });

  const archiveMutation = useMutation({
    mutationFn: () => adminArchiveGameApi(gameId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-game', gameId] }),
  });

  const dimensionsMutation = useMutation({
    mutationFn: () => adminUpdateDimensionsApi(gameId, dimensions),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-game', gameId] }),
  });

  function handleDimensionChange(key: string, value: number) {
    setDimensions((prev) =>
      prev.map((d) => (d.key === key ? { ...d, value: Math.round(value * 10) / 10 } : d))
    );
  }

  if (isLoading) return <div className="p-6 text-[var(--sb-text-muted)]">加载中...</div>;
  if (!game) return <div className="p-6 text-[var(--sb-text-muted)]">游戏未找到</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button onClick={() => openTab({ id: '/games', title: '游戏管理', path: '/games' })} className="text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] cursor-pointer inline-block">&larr; 返回游戏列表</button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">{game.title}</h1>
          <p className="text-sm text-[var(--sb-text-muted)] font-mono">{game.slug}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={game.status === 'PUBLISHED' ? 'success' : game.status === 'ARCHIVED' ? 'default' : 'warning'}>
            {game.status === 'PUBLISHED' ? '已发布' : game.status === 'ARCHIVED' ? '已归档' : '草稿'}
          </Badge>
          {game.status === 'DRAFT' && <Button onClick={() => publishMutation.mutate()}>发布</Button>}
          {game.status === 'PUBLISHED' && <Button variant="danger" onClick={() => archiveMutation.mutate()}>归档</Button>}
          {game.status === 'ARCHIVED' && <Button onClick={() => publishMutation.mutate()}>重新发布</Button>}
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-[var(--sb-text-primary)] mb-4">游戏信息</h2>
        <div className="space-y-4">
          <Input label="标题" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
          <Input label="副标题" value={form.subtitle} onChange={(e) => setForm(f => ({ ...f, subtitle: e.target.value }))} />
          <div>
            <label className="block text-sm text-[var(--sb-text-secondary)] mb-1.5">描述</label>
            <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3.5 py-2.5 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-[var(--sb-radius-input)] text-[var(--sb-text-primary)] focus:outline-none focus:border-[var(--sb-primary)] resize-none" />
          </div>
          <Input label="来源" value={form.source} onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))} />
          <Input label="封面 URL" value={form.coverUrl} onChange={(e) => setForm(f => ({ ...f, coverUrl: e.target.value }))} />
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? '保存中...' : '保存修改'}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-[var(--sb-text-primary)] mb-4">六维能力</h2>
        <div className="space-y-4">
          {dimensions.map((dim) => (
            <div key={dim.key} className="flex items-center gap-4">
              <span className="w-16 text-sm text-[var(--sb-text-secondary)] shrink-0">{dim.label}</span>
              <input
                type="range"
                min={1}
                max={5}
                step={0.1}
                value={dim.value}
                onChange={(e) => handleDimensionChange(dim.key, parseFloat(e.target.value))}
                className="flex-1 h-2 bg-[var(--sb-bg-muted)] rounded-lg appearance-none cursor-pointer accent-[var(--sb-primary)]"
              />
              <input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={dim.value}
                onChange={(e) => handleDimensionChange(dim.key, parseFloat(e.target.value) || 1)}
                className="w-16 px-2 py-1 text-center text-sm font-mono bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded text-[var(--sb-text-primary)] outline-none focus:border-[var(--sb-primary)]"
              />
            </div>
          ))}
          <Button onClick={() => dimensionsMutation.mutate()} disabled={dimensionsMutation.isPending}>
            {dimensionsMutation.isPending ? '保存中...' : '保存六维能力'}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-[var(--sb-text-primary)] mb-4">统计数据</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-[var(--sb-text-muted)]">题目数: </span><span className="text-[var(--sb-text-primary)]">{game.puzzleCount}</span></div>
          <div><span className="text-[var(--sb-text-muted)]">挑战次数: </span><span className="text-[var(--sb-text-primary)]">{game.attemptCount}</span></div>
          <div><span className="text-[var(--sb-text-muted)]">创建时间: </span><span className="text-[var(--sb-text-primary)]">{new Date(game.createdAt).toLocaleString()}</span></div>
          <div><span className="text-[var(--sb-text-muted)]">更新时间: </span><span className="text-[var(--sb-text-primary)]">{new Date(game.updatedAt).toLocaleString()}</span></div>
        </div>
      </Card>
    </div>
  );
}
