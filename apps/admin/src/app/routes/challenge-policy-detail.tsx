import { useState, useEffect } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetChallengePolicyApi, adminUpdateChallengePolicyApi, adminActivateChallengePolicyApi } from '../../features/games/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

interface Props { challengePolicyId?: string }

export default function ChallengePolicyDetailPage({ challengePolicyId: idProp }: Props) {
  const id = idProp || '';
  const { openTab } = useTabStore();
  const queryClient = useQueryClient();
  const { data: item, isLoading } = useQuery({ queryKey: ['admin-challenge-policy', id], queryFn: () => adminGetChallengePolicyApi(id), enabled: !!id });

  const [form, setForm] = useState<any>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        mode: item.mode, allowResume: item.allowResume, allowMultipleActive: item.allowMultipleActive,
        requiresHeartbeat: item.requiresHeartbeat, heartbeatIntervalSec: item.heartbeatIntervalSec,
        heartbeatTimeoutSec: item.heartbeatTimeoutSec, operationLogMode: item.operationLogMode,
        operationBatchSize: item.operationBatchSize, snapshotEveryNEvents: item.snapshotEveryNEvents ?? '',
        saveInitialSnapshot: item.saveInitialSnapshot, saveFinalSnapshot: item.saveFinalSnapshot,
        eligibleForLeaderboard: item.eligibleForLeaderboard, maxSubmitRetry: item.maxSubmitRetry,
      }); setDirty(false);
    }
  }, [item?.id]);

  const set = (key: string, val: any) => { setForm((prev: any) => ({ ...prev, [key]: val })); setDirty(true); };

  const updateMutation = useMutation({
    mutationFn: () => {
      const body = { ...form, snapshotEveryNEvents: form.snapshotEveryNEvents === '' ? null : Number(form.snapshotEveryNEvents) };
      return adminUpdateChallengePolicyApi(id, body);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-challenge-policy', id] }); queryClient.invalidateQueries({ queryKey: ['admin-challenge-policies'] }); setDirty(false); },
  });

  const activateMutation = useMutation({ mutationFn: () => adminActivateChallengePolicyApi(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-challenge-policy', id] }); queryClient.invalidateQueries({ queryKey: ['admin-challenge-policies'] }); } });

  if (isLoading) return <div className="p-6 text-[var(--sb-text-muted)]">加载中...</div>;
  if (!item) return <div className="p-6 text-[var(--sb-text-muted)]">未找到</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">挑战策略</h1>
          <Badge variant={item.status === 'ACTIVE' ? 'success' : 'default'}>{item.status}</Badge>
          <Badge variant="primary">{item.mode}</Badge>
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
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">会话管理</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm text-[var(--sb-text-secondary)] mb-1.5">挑战模式</label>
            <select value={form.mode || 'RANKED'} onChange={(e) => set('mode', e.target.value)}
              className="w-full bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none">
              <option value="RANKED">RANKED</option><option value="DAILY">DAILY</option><option value="CASUAL">CASUAL</option>
              <option value="PRACTICE">PRACTICE</option><option value="ROOM">ROOM</option><option value="ADMIN_TEST">ADMIN_TEST</option>
            </select></div>
          <div className="flex items-end gap-6">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.allowResume || false} onChange={(e) => set('allowResume', e.target.checked)} /><span className="text-sm text-[var(--sb-text-primary)]">允许恢复</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.allowMultipleActive || false} onChange={(e) => set('allowMultipleActive', e.target.checked)} /><span className="text-sm text-[var(--sb-text-primary)]">允许多活跃</span></label>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">心跳配置</h2>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center gap-2 cursor-pointer col-span-3"><input type="checkbox" checked={form.requiresHeartbeat !== false} onChange={(e) => set('requiresHeartbeat', e.target.checked)} /><span className="text-sm text-[var(--sb-text-primary)]">需要心跳</span></label>
          <Input label="心跳间隔 (秒)" type="number" value={String(form.heartbeatIntervalSec ?? 5)} onChange={(e) => set('heartbeatIntervalSec', Number(e.target.value))} disabled={form.requiresHeartbeat === false} />
          <Input label="心跳超时 (秒)" type="number" value={String(form.heartbeatTimeoutSec ?? 15)} onChange={(e) => set('heartbeatTimeoutSec', Number(e.target.value))} disabled={form.requiresHeartbeat === false} />
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">操作日志</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm text-[var(--sb-text-secondary)] mb-1.5">日志模式</label>
            <select value={form.operationLogMode || 'BATCHED'} onChange={(e) => set('operationLogMode', e.target.value)}
              className="w-full bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none">
              <option value="NONE">NONE</option><option value="SUMMARY">SUMMARY</option><option value="EVENT">EVENT</option><option value="BATCHED">BATCHED</option><option value="FULL">FULL</option>
            </select></div>
          <Input label="批量大小" type="number" value={String(form.operationBatchSize ?? 20)} onChange={(e) => set('operationBatchSize', Number(e.target.value))} />
          <Input label="每 N 事件快照" type="number" value={String(form.snapshotEveryNEvents ?? '')} onChange={(e) => set('snapshotEveryNEvents', e.target.value)} placeholder="不保存" />
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">快照与其他</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.saveInitialSnapshot !== false} onChange={(e) => set('saveInitialSnapshot', e.target.checked)} /><span className="text-sm text-[var(--sb-text-primary)]">保存初始快照</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.saveFinalSnapshot !== false} onChange={(e) => set('saveFinalSnapshot', e.target.checked)} /><span className="text-sm text-[var(--sb-text-primary)]">保存最终快照</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.eligibleForLeaderboard !== false} onChange={(e) => set('eligibleForLeaderboard', e.target.checked)} /><span className="text-sm text-[var(--sb-text-primary)]">计入排行榜</span></label>
          <Input label="最大提交重试" type="number" value={String(form.maxSubmitRetry ?? 1)} onChange={(e) => set('maxSubmitRetry', Number(e.target.value))} />
        </div>
      </Card>
    </div>
  );
}
