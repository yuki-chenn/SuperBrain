import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetPuzzleApi, adminUpdatePuzzleApi, adminPublishPuzzleVersionApi } from '../../features/puzzles/api';
import { adminListDifficultiesApi } from '../../features/games/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

const VERSION_STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
  DRAFT: { label: '草稿', variant: 'default' },
  VALIDATING: { label: '验证中', variant: 'warning' },
  VALID: { label: '已验证', variant: 'success' },
  INVALID: { label: '验证失败', variant: 'danger' },
  PUBLISHED: { label: '已发布', variant: 'success' },
  ARCHIVED: { label: '已归档', variant: 'default' },
};

interface Props { puzzleId?: string }

export default function PuzzleEditPage({ puzzleId: idProp }: Props) {
  const id = idProp || '';
  const queryClient = useQueryClient();

  const { data: puzzle, isLoading } = useQuery({
    queryKey: ['admin-puzzle', id],
    queryFn: () => adminGetPuzzleApi(id),
    enabled: !!id,
  });

  const { data: difficulties } = useQuery({
    queryKey: ['admin-difficulties-for-game', puzzle?.gameId],
    queryFn: () => adminListDifficultiesApi({ gameId: puzzle!.gameId, status: 'ACTIVE' }),
    enabled: !!puzzle?.gameId,
    staleTime: 60_000,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficultyId, setDifficultyId] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [source, setSource] = useState('');
  const [currentVersionId, setCurrentVersionId] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (puzzle) {
      setTitle(puzzle.title);
      setDescription(puzzle.description || '');
      setDifficultyId(puzzle.difficultyId || '');
      setSortOrder(String(puzzle.sortOrder));
      setSource(puzzle.source || '');
      setCurrentVersionId(puzzle.currentVersionId || '');
      setDirty(false);
    }
  }, [puzzle?.id]);

  const updateMutation = useMutation({
    mutationFn: () => adminUpdatePuzzleApi(id, {
      title, description: description || undefined,
      difficultyId: difficultyId || null,
      sortOrder: parseInt(sortOrder), source: source || undefined,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-puzzle', id] }); setDirty(false); },
  });

  const publishMutation = useMutation({
    mutationFn: (versionId: string) => adminPublishPuzzleVersionApi(versionId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-puzzle', id] }); },
  });

  if (isLoading) return <div className="p-6 text-[var(--sb-text-muted)]">加载中...</div>;
  if (!puzzle) return <div className="p-6 text-[var(--sb-text-muted)]">未找到</div>;

  const versions = puzzle.versions || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">{puzzle.title}</h1>
          <Badge variant={puzzle.status === 'PUBLISHED' ? 'success' : 'default'}>{puzzle.status}</Badge>
        </div>
        {dirty && <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? '保存中...' : '保存'}
        </Button>}
      </div>
      {updateMutation.isError && <p className="text-sm text-[var(--sb-danger)]">保存失败</p>}

      {/* Basic info */}
      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">基本信息</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="标题" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
          <Input label="Slug" value={puzzle.slug} disabled />
          <div><label className="block text-sm text-[var(--sb-text-secondary)] mb-1.5">难度</label>
            <select value={difficultyId} onChange={(e) => { setDifficultyId(e.target.value); setDirty(true); }}
              className="w-full bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none">
              <option value="">未指定</option>
              {difficulties?.items.map((d) => <option key={d.id} value={d.id}>{d.label} ({d.key})</option>)}
            </select></div>
          <Input label="排序权重" type="number" value={sortOrder} onChange={(e) => { setSortOrder(e.target.value); setDirty(true); }} />
          <Input label="来源" value={source} onChange={(e) => { setSource(e.target.value); setDirty(true); }} />
          <div className="col-span-2">
            <label className="block text-sm text-[var(--sb-text-secondary)] mb-1.5">描述</label>
            <textarea value={description} onChange={(e) => { setDescription(e.target.value); setDirty(true); }} rows={3}
              className="w-full px-3.5 py-2.5 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-[var(--sb-radius-input)] text-[var(--sb-text-primary)] focus:outline-none focus:border-[var(--sb-primary)] resize-none" />
          </div>
        </div>
      </Card>

      {/* Current version binding */}
      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">当前版本绑定</h2>
        <p className="text-xs text-[var(--sb-text-muted)] mb-3">选择一个已发布版本作为当前生效版本（一对一）</p>
        <select value={currentVersionId} onChange={(e) => {
          const vid = e.target.value;
          setCurrentVersionId(vid);
          if (vid) publishMutation.mutate(vid);
        }}
          className="w-full bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none">
          <option value="">未绑定</option>
          {versions.filter((v) => v.validationStatus === 'VALID' || v.status === 'PUBLISHED').map((v) => (
            <option key={v.id} value={v.id}>v{v.version} - {v.engineKey} [{v.status}]</option>
          ))}
        </select>
        {publishMutation.isPending && <p className="text-xs text-[var(--sb-text-muted)] mt-1">发布中...</p>}
        {publishMutation.isError && <p className="text-xs text-[var(--sb-danger)] mt-1">发布失败</p>}
      </Card>

      {/* Version list (read-only) */}
      <Card>
        <h2 className="text-base font-semibold text-[var(--sb-text-primary)] mb-4">版本列表</h2>
        {versions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[var(--sb-border)]">
                <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">版本</th>
                <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">引擎</th>
                <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">验证状态</th>
                <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">发布状态</th>
                <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">当前</th>
                <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">创建时间</th>
              </tr></thead>
              <tbody>{versions.map((v) => {
                const vs = VERSION_STATUS_LABELS[v.status];
                return (
                  <tr key={v.id} className="border-b border-[var(--sb-border)]">
                    <td className="py-3 px-3 text-center font-mono text-[var(--sb-text-primary)]">v{v.version}</td>
                    <td className="py-3 px-3 font-mono text-xs text-[var(--sb-text-primary)]">{v.engineKey}</td>
                    <td className="py-3 px-3 text-center"><Badge variant={v.validationStatus === 'VALID' ? 'success' : v.validationStatus === 'INVALID' ? 'danger' : 'default'}>{v.validationStatus}</Badge></td>
                    <td className="py-3 px-3 text-center"><Badge variant={vs?.variant || 'default'}>{vs?.label || v.status}</Badge></td>
                    <td className="py-3 px-3 text-center">{v.id === puzzle.currentVersionId ? <Badge variant="success">当前</Badge> : ''}</td>
                    <td className="py-3 px-3 text-xs text-[var(--sb-text-secondary)]">{new Date(v.createdAt).toLocaleString()}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--sb-text-muted)]">暂无版本</p>
        )}
      </Card>
    </div>
  );
}
