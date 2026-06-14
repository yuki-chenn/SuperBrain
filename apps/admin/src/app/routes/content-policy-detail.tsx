import { useState, useEffect } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetContentPolicyApi, adminUpdateContentPolicyApi, adminActivateContentPolicyApi } from '../../features/games/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

interface Props { contentPolicyId?: string }

export default function ContentPolicyDetailPage({ contentPolicyId: idProp }: Props) {
  const id = idProp || '';
  const { openTab } = useTabStore();
  const queryClient = useQueryClient();
  const { data: item, isLoading } = useQuery({ queryKey: ['admin-content-policy', id], queryFn: () => adminGetContentPolicyApi(id), enabled: !!id });

  const [contentMode, setContentMode] = useState('CURATED');
  const [selectionStrategy, setSelectionStrategy] = useState('RANDOM');
  const [generatorKey, setGeneratorKey] = useState('');
  const [generatorConfigStr, setGeneratorConfigStr] = useState('{}');
  const [puzzlePoolFilterStr, setPuzzlePoolFilterStr] = useState('{}');
  const [scheduleGranularity, setScheduleGranularity] = useState('');
  const [allowRepeatedPuzzle, setAllowRepeatedPuzzle] = useState(true);
  const [repeatCooldownHours, setRepeatCooldownHours] = useState('');
  const [weightConfigStr, setWeightConfigStr] = useState('{}');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (item) {
      setContentMode(item.contentMode); setSelectionStrategy(item.selectionStrategy);
      setGeneratorKey(item.generatorKey || ''); setGeneratorConfigStr(JSON.stringify(item.generatorConfig ?? {}, null, 2));
      setPuzzlePoolFilterStr(JSON.stringify(item.puzzlePoolFilter ?? {}, null, 2));
      setScheduleGranularity(item.scheduleGranularity || '');
      setAllowRepeatedPuzzle(item.allowRepeatedPuzzle); setRepeatCooldownHours(item.repeatCooldownHours != null ? String(item.repeatCooldownHours) : '');
      setWeightConfigStr(JSON.stringify(item.weightConfig ?? {}, null, 2)); setDirty(false);
    }
  }, [item?.id]);

  const updateMutation = useMutation({
    mutationFn: () => {
      let generatorConfig, puzzlePoolFilter, weightConfig;
      try { generatorConfig = JSON.parse(generatorConfigStr); puzzlePoolFilter = JSON.parse(puzzlePoolFilterStr); weightConfig = JSON.parse(weightConfigStr); }
      catch { return Promise.reject(new Error('JSON 格式错误')); }
      return adminUpdateContentPolicyApi(id, { contentMode, selectionStrategy, generatorKey: generatorKey || null, generatorConfig, puzzlePoolFilter, scheduleGranularity: scheduleGranularity || null as any, allowRepeatedPuzzle, repeatCooldownHours: repeatCooldownHours ? parseInt(repeatCooldownHours) : null, weightConfig });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-content-policy', id] }); queryClient.invalidateQueries({ queryKey: ['admin-content-policies'] }); setDirty(false); },
  });

  const activateMutation = useMutation({ mutationFn: () => adminActivateContentPolicyApi(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-content-policy', id] }); queryClient.invalidateQueries({ queryKey: ['admin-content-policies'] }); } });

  if (isLoading) return <div className="p-6 text-[var(--sb-text-muted)]">加载中...</div>;
  if (!item) return <div className="p-6 text-[var(--sb-text-muted)]">未找到</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">题库策略</h1>
          <Badge variant={item.status === 'ACTIVE' ? 'success' : 'default'}>{item.status}</Badge>
        </div>
        <div className="flex gap-2">
          {item.status !== 'ACTIVE' && <Button size="sm" onClick={() => activateMutation.mutate()}>激活</Button>}
          {dirty && <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>{updateMutation.isPending ? '保存中...' : '保存'}</Button>}
        </div>
      </div>
      {item.game && <div className="text-sm text-[var(--sb-text-muted)]">游戏: <button className="text-[var(--sb-primary)] hover:underline cursor-pointer bg-transparent border-none text-sm"
        onClick={() => openTab({ id: `/games/${item.game!.id}`, title: `游戏 - ${item.game!.title}`, path: `/games/${item.game!.id}` })}>{item.game.title}</button></div>}
      {item.difficultyId && <div className="text-sm text-[var(--sb-text-muted)]">难度: <button className="text-[var(--sb-primary)] hover:underline cursor-pointer bg-transparent border-none text-sm"
        onClick={() => openTab({ id: `/difficulties/${item.difficultyId}`, title: `难度`, path: `/difficulties/${item.difficultyId}` })}>{item.difficultyId}</button></div>}
      {updateMutation.isError && <p className="text-sm text-[var(--sb-danger)]">{(updateMutation.error as any)?.message || '保存失败'}</p>}

      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">基本配置</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm text-[var(--sb-text-secondary)] mb-1.5">内容模式</label>
            <select value={contentMode} onChange={(e) => { setContentMode(e.target.value); setDirty(true); }}
              className="w-full bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none">
              <option value="GENERATED">GENERATED</option><option value="CURATED">CURATED</option><option value="SCHEDULED">SCHEDULED</option><option value="MIXED">MIXED</option>
            </select></div>
          <div><label className="block text-sm text-[var(--sb-text-secondary)] mb-1.5">选择策略</label>
            <select value={selectionStrategy} onChange={(e) => { setSelectionStrategy(e.target.value); setDirty(true); }}
              className="w-full bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none">
              <option value="RANDOM">RANDOM</option><option value="ROUND_ROBIN">ROUND_ROBIN</option><option value="MANUAL">MANUAL</option>
              <option value="DAILY">DAILY</option><option value="WEEKLY">WEEKLY</option><option value="MONTHLY">MONTHLY</option><option value="WEIGHTED_RANDOM">WEIGHTED_RANDOM</option>
            </select></div>
          <Input label="生成器 Key" value={generatorKey} onChange={(e) => { setGeneratorKey(e.target.value); setDirty(true); }} placeholder="可选" />
          <div><label className="block text-sm text-[var(--sb-text-secondary)] mb-1.5">调度粒度</label>
            <select value={scheduleGranularity} onChange={(e) => { setScheduleGranularity(e.target.value); setDirty(true); }}
              className="w-full bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none">
              <option value="">不适用</option><option value="DAILY">DAILY</option><option value="WEEKLY">WEEKLY</option><option value="MONTHLY">MONTHLY</option><option value="SEASONAL">SEASONAL</option>
            </select></div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={allowRepeatedPuzzle} onChange={(e) => { setAllowRepeatedPuzzle(e.target.checked); setDirty(true); }} className="cursor-pointer" /><span className="text-sm text-[var(--sb-text-primary)]">允许重复题目</span></div>
          <Input label="重复冷却 (小时)" type="number" value={repeatCooldownHours} onChange={(e) => { setRepeatCooldownHours(e.target.value); setDirty(true); }} placeholder="不限" />
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">生成器配置 (JSON)</h2>
        <textarea className="w-full h-32 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg p-3 font-mono text-sm text-[var(--sb-text-primary)] resize-y"
          value={generatorConfigStr} onChange={(e) => { setGeneratorConfigStr(e.target.value); setDirty(true); }} />
      </Card>
      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">题库过滤 (JSON)</h2>
        <textarea className="w-full h-32 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg p-3 font-mono text-sm text-[var(--sb-text-primary)] resize-y"
          value={puzzlePoolFilterStr} onChange={(e) => { setPuzzlePoolFilterStr(e.target.value); setDirty(true); }} />
      </Card>
      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">权重配置 (JSON)</h2>
        <textarea className="w-full h-32 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg p-3 font-mono text-sm text-[var(--sb-text-primary)] resize-y"
          value={weightConfigStr} onChange={(e) => { setWeightConfigStr(e.target.value); setDirty(true); }} />
      </Card>
    </div>
  );
}
