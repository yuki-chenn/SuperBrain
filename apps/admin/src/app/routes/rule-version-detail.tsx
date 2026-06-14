import { useState, useEffect } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetRuleVersionApi, adminUpdateRuleVersionApi, adminActivateRuleVersionApi } from '../../features/games/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

interface Props { ruleVersionId?: string }

export default function RuleVersionDetailPage({ ruleVersionId: idProp }: Props) {
  const id = idProp || '';
  const { openTab } = useTabStore();
  const queryClient = useQueryClient();
  const { data: item, isLoading } = useQuery({ queryKey: ['admin-rule-version', id], queryFn: () => adminGetRuleVersionApi(id), enabled: !!id });

  const [name, setName] = useState('');
  const [engineKey, setEngineKey] = useState('');
  const [engineVersion, setEngineVersion] = useState('');
  const [configStr, setConfigStr] = useState('{}');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name); setEngineKey(item.engineKey); setEngineVersion(item.engineVersion || '');
      setConfigStr(JSON.stringify(item.config ?? {}, null, 2)); setDirty(false);
    }
  }, [item?.id]);

  const updateMutation = useMutation({
    mutationFn: () => {
      let config; try { config = JSON.parse(configStr); } catch { return Promise.reject(new Error('JSON 格式错误')); }
      return adminUpdateRuleVersionApi(id, { name, engineKey, engineVersion: engineVersion || null as any, config });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-rule-version', id] }); queryClient.invalidateQueries({ queryKey: ['admin-rule-versions'] }); setDirty(false); },
  });

  const activateMutation = useMutation({ mutationFn: () => adminActivateRuleVersionApi(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-rule-version', id] }); queryClient.invalidateQueries({ queryKey: ['admin-rule-versions'] }); } });

  if (isLoading) return <div className="p-6 text-[var(--sb-text-muted)]">加载中...</div>;
  if (!item) return <div className="p-6 text-[var(--sb-text-muted)]">未找到</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">规则 v{item.version}</h1>
          <Badge variant={item.status === 'ACTIVE' ? 'success' : 'default'}>{item.status}</Badge>
          <Badge variant={item.validationStatus === 'VALID' ? 'success' : item.validationStatus === 'INVALID' ? 'danger' : 'default'}>{item.validationStatus}</Badge>
        </div>
        <div className="flex gap-2">
          {item.status !== 'ACTIVE' && <Button size="sm" onClick={() => activateMutation.mutate()}>激活</Button>}
          {dirty && <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>{updateMutation.isPending ? '保存中...' : '保存'}</Button>}
        </div>
      </div>
      {item.game && <div className="text-sm text-[var(--sb-text-muted)]">游戏: <button className="text-[var(--sb-primary)] hover:underline cursor-pointer bg-transparent border-none text-sm"
        onClick={() => openTab({ id: `/games/${item.game!.id}`, title: `游戏 - ${item.game!.title}`, path: `/games/${item.game!.id}` })}>{item.game.title}</button></div>}
      {updateMutation.isError && <p className="text-sm text-[var(--sb-danger)]">{(updateMutation.error as any)?.message || '保存失败'}</p>}

      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">基本信息</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="名称" value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} />
          <Input label="引擎 Key" value={engineKey} onChange={(e) => { setEngineKey(e.target.value); setDirty(true); }} />
          <Input label="引擎版本" value={engineVersion} onChange={(e) => { setEngineVersion(e.target.value); setDirty(true); }} placeholder="可选" />
          <Input label="Schema 版本" value={String(item.schemaVersion)} disabled />
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">引擎配置 (JSON)</h2>
        <textarea className="w-full h-64 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg p-3 font-mono text-sm text-[var(--sb-text-primary)] resize-y"
          value={configStr} onChange={(e) => { setConfigStr(e.target.value); setDirty(true); }} />
      </Card>

      {item.validationReport && Object.keys(item.validationReport).length > 0 && (
        <Card>
          <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">验证报告</h2>
          <pre className="text-xs text-[var(--sb-text-secondary)] bg-[var(--sb-bg-muted)] p-3 rounded-lg overflow-auto">{JSON.stringify(item.validationReport, null, 2)}</pre>
        </Card>
      )}
    </div>
  );
}
