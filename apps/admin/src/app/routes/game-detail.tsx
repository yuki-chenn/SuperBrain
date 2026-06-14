import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetGameApi, adminUpdateGameApi, adminPublishGameApi, adminArchiveGameApi } from '../../features/games/api';
import { useTabStore } from '../../stores/useTabStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useState, useEffect } from 'react';

export default function GameDetailPage({ gameId: gameIdProp }: { gameId?: string } = {}) {
  const queryClient = useQueryClient();
  const { openTab } = useTabStore();
  const gameId = gameIdProp || '';

  const { data: game, isLoading } = useQuery({
    queryKey: ['admin-game', gameId],
    queryFn: () => adminGetGameApi(gameId),
    enabled: !!gameId,
  });

  const [form, setForm] = useState({ title: '', subtitle: '', description: '', source: '', coverUrl: '', sortOrder: '0' });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (game) {
      setForm({
        title: game.title, subtitle: game.subtitle || '', description: game.description,
        source: game.source || '', coverUrl: game.coverUrl || '', sortOrder: String((game as any).sortOrder ?? 0),
      });
      setDirty(false);
    }
  }, [game]);

  const updateMutation = useMutation({
    mutationFn: () => adminUpdateGameApi(gameId, { ...form, sortOrder: parseInt(form.sortOrder) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-game', gameId] }); setDirty(false); },
  });

  const publishMutation = useMutation({ mutationFn: () => adminPublishGameApi(gameId), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-game', gameId] }) });
  const archiveMutation = useMutation({ mutationFn: () => adminArchiveGameApi(gameId), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-game', gameId] }) });

  if (isLoading) return <div className="p-6 text-[var(--sb-text-muted)]">加载中...</div>;
  if (!game) return <div className="p-6 text-[var(--sb-text-muted)]">游戏未找到</div>;

  const g = game as any;
  const activeRuleSet = (g.ruleSetVersions || []).find((v: any) => v.status === 'ACTIVE');
  const difficulties = g.difficulties || [];
  // Group by key, show only latest version per key
  const latestDiffMap = new Map<string, any>();
  for (const d of difficulties) {
    if (!latestDiffMap.has(d.key) || d.version > latestDiffMap.get(d.key).version) latestDiffMap.set(d.key, d);
  }
  const latestDiffs = Array.from(latestDiffMap.values());
  const contentPolicies = g.contentPolicies || [];
  const challengePolicies = g.challengePolicies || [];

  const link = (path: string, title: string) => openTab({ id: path, title, path });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">{game.title}</h1>
          <p className="text-sm text-[var(--sb-text-muted)] font-mono">{game.slug}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={game.status === 'PUBLISHED' ? 'success' : game.status === 'ARCHIVED' ? 'default' : 'warning'}>
            {game.status === 'PUBLISHED' ? '已发布' : game.status === 'ARCHIVED' ? '已归档' : '草稿'}
          </Badge>
          {game.status === 'DRAFT' && <Button size="sm" onClick={() => publishMutation.mutate()}>发布</Button>}
          {game.status === 'PUBLISHED' && <Button size="sm" variant="danger" onClick={() => archiveMutation.mutate()}>归档</Button>}
          {game.status === 'ARCHIVED' && <Button size="sm" onClick={() => publishMutation.mutate()}>重新发布</Button>}
          {dirty && <Button size="sm" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>{updateMutation.isPending ? '保存中...' : '保存'}</Button>}
        </div>
      </div>

      {/* Game info */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--sb-text-primary)] mb-4">基本信息</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="标题" value={form.title} onChange={(e) => { setForm(f => ({ ...f, title: e.target.value })); setDirty(true); }} />
          <Input label="副标题" value={form.subtitle} onChange={(e) => { setForm(f => ({ ...f, subtitle: e.target.value })); setDirty(true); }} />
          <Input label="排序权重" type="number" value={form.sortOrder} onChange={(e) => { setForm(f => ({ ...f, sortOrder: e.target.value })); setDirty(true); }} />
          <Input label="来源" value={form.source} onChange={(e) => { setForm(f => ({ ...f, source: e.target.value })); setDirty(true); }} />
          <div className="col-span-2">
            <label className="block text-sm text-[var(--sb-text-secondary)] mb-1.5">描述</label>
            <textarea value={form.description} onChange={(e) => { setForm(f => ({ ...f, description: e.target.value })); setDirty(true); }} rows={3}
              className="w-full px-3.5 py-2.5 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-[var(--sb-radius-input)] text-[var(--sb-text-primary)] focus:outline-none focus:border-[var(--sb-primary)] resize-none" />
          </div>
          <Input label="封面 URL" value={form.coverUrl} onChange={(e) => { setForm(f => ({ ...f, coverUrl: e.target.value })); setDirty(true); }} className="col-span-2" />
        </div>
      </Card>

      {/* Active rule set version */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--sb-text-primary)]">规则配置</h2>
          <Button size="sm" variant="secondary" onClick={() => link('/rule-versions', '规则配置')}>查看全部</Button>
        </div>
        {activeRuleSet ? (
          <div className="flex items-center justify-between py-3 px-4 border border-[var(--sb-border)] rounded-lg">
            <div>
              <span className="text-sm font-medium text-[var(--sb-text-primary)]">{activeRuleSet.name}</span>
              <span className="ml-2 text-xs text-[var(--sb-text-muted)]">v{activeRuleSet.version}</span>
              <Badge variant="success" className="ml-2">ACTIVE</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-[var(--sb-text-secondary)]">{activeRuleSet.engineKey}</span>
              <Button size="sm" variant="ghost" onClick={() => link(`/rule-versions/${activeRuleSet.id}`, `规则 v${activeRuleSet.version}`)}>编辑</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--sb-text-muted)]">暂无激活的规则配置</p>
        )}
      </Card>

      {/* Difficulties with linked policies */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--sb-text-primary)]">难度配置</h2>
          <Button size="sm" variant="secondary" onClick={() => link('/difficulties', '难度配置')}>查看全部</Button>
        </div>
        {latestDiffs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[var(--sb-border)]">
                <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">Key</th>
                <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">标签</th>
                <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">版本</th>
                <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">状态</th>
                <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">题库策略</th>
                <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">挑战策略</th>
                <th className="text-right py-3 px-3 text-[var(--sb-text-muted)] font-medium">操作</th>
              </tr></thead>
              <tbody>{latestDiffs.map((d: any) => {
                const cp = contentPolicies.find((p: any) => p.difficultyId === d.id);
                const chp = challengePolicies.find((p: any) => p.difficultyId === d.id);
                return (
                  <tr key={d.id} className="border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]">
                    <td className="py-3 px-3 font-mono text-xs text-[var(--sb-text-primary)]">{d.key}</td>
                    <td className="py-3 px-3 text-sm text-[var(--sb-text-primary)]">{d.label}</td>
                    <td className="py-3 px-3 text-center text-[var(--sb-text-secondary)]">v{d.version}</td>
                    <td className="py-3 px-3 text-center"><Badge variant={d.status === 'ACTIVE' ? 'success' : 'default'}>{d.status}</Badge></td>
                    <td className="py-3 px-3">{cp ? (
                      <button className="text-[var(--sb-primary)] hover:underline cursor-pointer bg-transparent border-none text-xs"
                        onClick={() => link(`/content-policies/${cp.id}`, '题库策略')}>{cp.contentMode}/{cp.selectionStrategy}</button>
                    ) : <span className="text-xs text-[var(--sb-text-muted)]">-</span>}</td>
                    <td className="py-3 px-3">{chp ? (
                      <button className="text-[var(--sb-primary)] hover:underline cursor-pointer bg-transparent border-none text-xs"
                        onClick={() => link(`/challenge-policies/${chp.id}`, '挑战策略')}>{chp.mode}</button>
                    ) : <span className="text-xs text-[var(--sb-text-muted)]">-</span>}</td>
                    <td className="py-3 px-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => link(`/difficulties/${d.id}`, `难度 - ${d.label}`)}>编辑</Button>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--sb-text-muted)]">暂无难度配置</p>
        )}
      </Card>

      {/* Stats */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--sb-text-primary)] mb-4">统计</h2>
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
