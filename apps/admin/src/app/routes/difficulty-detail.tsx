import { useState, useEffect } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetDifficultyApi, adminUpdateDifficultyApi, adminActivateDifficultyApi, adminListContentPoliciesApi, adminListChallengePoliciesApi, adminUpdateContentPolicyApi, adminUpdateChallengePolicyApi } from '../../features/games/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

interface Props { difficultyId?: string }

export default function DifficultyDetailPage({ difficultyId: idProp }: Props) {
  const id = idProp || '';
  const { openTab } = useTabStore();
  const queryClient = useQueryClient();
  const { data: item, isLoading } = useQuery({ queryKey: ['admin-difficulty', id], queryFn: () => adminGetDifficultyApi(id), enabled: !!id });

  // Fetch all policies for this game to allow association
  const gameId = item?.gameId || '';
  const { data: allCps } = useQuery({ queryKey: ['admin-cps-for-game', gameId], queryFn: () => adminListContentPoliciesApi({ gameId }), enabled: !!gameId });
  const { data: allChps } = useQuery({ queryKey: ['admin-chps-for-game', gameId], queryFn: () => adminListChallengePoliciesApi({ gameId }), enabled: !!gameId });

  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [maxDurationMs, setMaxDurationMs] = useState('');
  const [configStr, setConfigStr] = useState('{}');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (item) {
      setLabel(item.label); setSortOrder(String(item.sortOrder));
      setMaxDurationMs(item.maxDurationMs != null ? String(item.maxDurationMs) : '');
      setConfigStr(JSON.stringify(item.config ?? {}, null, 2)); setDirty(false);
    }
  }, [item?.id]);

  const updateMutation = useMutation({
    mutationFn: () => {
      let config: any;
      try { config = JSON.parse(configStr); } catch { return Promise.reject(new Error('JSON 格式错误')); }
      return adminUpdateDifficultyApi(id, { label, sortOrder: parseInt(sortOrder), maxDurationMs: maxDurationMs ? parseInt(maxDurationMs) : null, config });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-difficulty', id] }); queryClient.invalidateQueries({ queryKey: ['admin-difficulties'] }); setDirty(false); },
  });

  const activateMutation = useMutation({
    mutationFn: () => adminActivateDifficultyApi(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-difficulty', id] }); queryClient.invalidateQueries({ queryKey: ['admin-difficulties'] }); },
  });

  if (isLoading) return <div className="p-6 text-[var(--sb-text-muted)]">加载中...</div>;
  if (!item) return <div className="p-6 text-[var(--sb-text-muted)]">未找到</div>;

  const STATUS_LABELS: Record<string, string> = { DRAFT: '草稿', ACTIVE: '激活', INACTIVE: '停用', ARCHIVED: '归档' };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">{item.label}</h1>
          <Badge variant={item.status === 'ACTIVE' ? 'success' : 'default'}>{STATUS_LABELS[item.status] || item.status}</Badge>
          <span className="text-sm text-[var(--sb-text-muted)]">v{item.version}</span>
        </div>
        <div className="flex gap-2">
          {item.status !== 'ACTIVE' && <Button size="sm" onClick={() => activateMutation.mutate()}>激活</Button>}
          {dirty && <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>{updateMutation.isPending ? '保存中...' : '保存'}</Button>}
        </div>
      </div>
      {item.game && (
        <div className="text-sm text-[var(--sb-text-muted)]">
          游戏: <button className="text-[var(--sb-primary)] hover:underline cursor-pointer bg-transparent border-none text-sm"
            onClick={() => openTab({ id: `/games/${item.game!.id}`, title: `游戏 - ${item.game!.title}`, path: `/games/${item.game!.id}` })}>{item.game.title}</button>
        </div>
      )}
      {updateMutation.isError && <p className="text-sm text-[var(--sb-danger)]">{(updateMutation.error as any)?.message || '保存失败'}</p>}

      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">基本信息</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Key" value={item.key} disabled />
          <Input label="标签" value={label} onChange={(e) => { setLabel(e.target.value); setDirty(true); }} />
          <Input label="排序权重" type="number" value={sortOrder} onChange={(e) => { setSortOrder(e.target.value); setDirty(true); }} />
          <Input label="最大时长 (ms)" type="number" value={maxDurationMs} onChange={(e) => { setMaxDurationMs(e.target.value); setDirty(true); }} placeholder="不限" />
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">配置 (JSON)</h2>
        <textarea className="w-full h-48 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg p-3 font-mono text-sm text-[var(--sb-text-primary)] resize-y"
          value={configStr} onChange={(e) => { setConfigStr(e.target.value); setDirty(true); }} />
      </Card>

      {/* Linked policies */}
      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">关联策略</h2>
        <div className="grid grid-cols-2 gap-6">
          <SinglePolicyLinker
            label="题库策略 (ContentPolicy)"
            linkedItem={(item.contentPolicies || [])[0] || null}
            allItems={allCps?.items || []}
            displayField={(cp) => `${cp.contentMode} / ${cp.selectionStrategy}`}
            onLink={(cpId) => adminUpdateContentPolicyApi(cpId, { difficultyId: id }).then(() => { queryClient.invalidateQueries({ queryKey: ['admin-difficulty', id] }); queryClient.invalidateQueries({ queryKey: ['admin-cps-for-game', gameId] }); })}
            onUnlink={(cpId) => adminUpdateContentPolicyApi(cpId, { difficultyId: null }).then(() => { queryClient.invalidateQueries({ queryKey: ['admin-difficulty', id] }); queryClient.invalidateQueries({ queryKey: ['admin-cps-for-game', gameId] }); })}
            onEdit={(cpId) => openTab({ id: `/content-policies/${cpId}`, title: `题库策略`, path: `/content-policies/${cpId}` })}
          />
          <SinglePolicyLinker
            label="挑战策略 (ChallengePolicy)"
            linkedItem={(item.challengePolicies || [])[0] || null}
            allItems={allChps?.items || []}
            displayField={(cp) => cp.mode}
            onLink={(cpId) => adminUpdateChallengePolicyApi(cpId, { difficultyId: id } as any).then(() => { queryClient.invalidateQueries({ queryKey: ['admin-difficulty', id] }); queryClient.invalidateQueries({ queryKey: ['admin-chps-for-game', gameId] }); })}
            onUnlink={(cpId) => adminUpdateChallengePolicyApi(cpId, { difficultyId: null } as any).then(() => { queryClient.invalidateQueries({ queryKey: ['admin-difficulty', id] }); queryClient.invalidateQueries({ queryKey: ['admin-chps-for-game', gameId] }); })}
            onEdit={(cpId) => openTab({ id: `/challenge-policies/${cpId}`, title: `挑战策略`, path: `/challenge-policies/${cpId}` })}
          />
        </div>
      </Card>
    </div>
  );
}

// ─── Single policy linker (one-to-one) ────────────────────────────

function SinglePolicyLinker<T extends { id: string; status: string }>({
  label, linkedItem, allItems, displayField, onLink, onUnlink, onEdit,
}: {
  label: string;
  linkedItem: T | null;
  allItems: T[];
  displayField: (item: T) => string;
  onLink: (id: string) => Promise<any>;
  onUnlink: (id: string) => Promise<any>;
  onEdit: (id: string) => void;
}) {
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  // Items not linked to any difficulty (or linked to this one)
  const available = allItems.filter((item) => !('difficultyId' in item) || !(item as any).difficultyId || item.id === linkedItem?.id);

  const handleLink = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      // If already linked, unlink old first
      if (linkedItem) await onUnlink(linkedItem.id);
      await onLink(selected);
      setSelected('');
    } finally { setLoading(false); }
  };

  const handleUnlink = async () => {
    if (!linkedItem) return;
    setLoading(true);
    try { await onUnlink(linkedItem.id); } finally { setLoading(false); }
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-[var(--sb-text-secondary)] mb-2">{label}</h3>
      {linkedItem ? (
        <div className="flex items-center justify-between py-2 px-3 bg-[var(--sb-bg-muted)] rounded-lg mb-2">
          <button className="text-sm text-[var(--sb-primary)] hover:underline cursor-pointer bg-transparent border-none p-0"
            onClick={() => onEdit(linkedItem.id)}>{displayField(linkedItem)}</button>
          <div className="flex items-center gap-2">
            <Badge variant={linkedItem.status === 'ACTIVE' ? 'success' : 'default'}>{linkedItem.status}</Badge>
            <Button size="sm" variant="ghost" onClick={() => onEdit(linkedItem.id)}>编辑</Button>
            <Button size="sm" variant="ghost" className="text-[var(--sb-danger)]" disabled={loading} onClick={handleUnlink}>解除</Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--sb-text-muted)] mb-2">暂未关联</p>
      )}
      {/* Replace or link */}
      {available.length > 0 && (
        <div className="flex items-center gap-2">
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="flex-1 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer">
            <option value="">{linkedItem ? '更换关联...' : '选择策略关联...'}</option>
            {available.filter((item) => item.id !== linkedItem?.id).map((item) => (
              <option key={item.id} value={item.id}>{displayField(item)} [{item.status}]</option>
            ))}
          </select>
          <Button size="sm" disabled={!selected || loading} onClick={handleLink}>{loading ? '...' : (linkedItem ? '更换' : '关联')}</Button>
        </div>
      )}
    </div>
  );
}
