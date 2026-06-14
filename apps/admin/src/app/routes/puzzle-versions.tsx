import { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminListPuzzleVersionsApi, adminUpdatePuzzleVersionApi, adminValidatePuzzleVersionApi, adminPublishPuzzleVersionApi, type AdminPuzzleVersionListItem } from '../../features/puzzles/api';
import { adminListGamesApi } from '../../features/games/api';
import { GameFilter } from '../../components/admin/GameFilter';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';

const VERSION_STATUS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
  DRAFT: { label: '草稿', variant: 'default' },
  VALIDATING: { label: '验证中', variant: 'warning' },
  VALID: { label: '已验证', variant: 'success' },
  INVALID: { label: '失败', variant: 'danger' },
  PUBLISHED: { label: '已发布', variant: 'success' },
  ARCHIVED: { label: '已归档', variant: 'default' },
};

export default function PuzzleVersionsPage() {
  const { openTab } = useTabStore();
  const queryClient = useQueryClient();
  const [gameId, setGameId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<AdminPuzzleVersionListItem | null>(null);
  const [editContentStr, setEditContentStr] = useState('');

  const { data: games } = useQuery({
    queryKey: ['admin-games-for-puzzles'],
    queryFn: () => adminListGamesApi({ status: 'PUBLISHED', pageSize: 50 }),
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-puzzle-versions', gameId, statusFilter, page],
    queryFn: () => adminListPuzzleVersionsApi({
      gameId: gameId || undefined,
      status: statusFilter || undefined,
      page, pageSize: 50,
    }),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const content = JSON.parse(editContentStr);
      return adminUpdatePuzzleVersionApi(editItem!.id, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-puzzle-versions'] });
      setEditItem(null);
    },
  });

  const validateMutation = useMutation({
    mutationFn: (versionId: string) => adminValidatePuzzleVersionApi(versionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-puzzle-versions'] }),
  });

  const publishMutation = useMutation({
    mutationFn: (versionId: string) => adminPublishPuzzleVersionApi(versionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-puzzle-versions'] }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">题目版本</h1>
      <Card>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <GameFilter value={gameId} onChange={(v) => { setGameId(v); setPage(1); }} />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer">
            <option value="">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="VALID">已验证</option>
            <option value="INVALID">验证失败</option>
            <option value="PUBLISHED">已发布</option>
            <option value="ARCHIVED">已归档</option>
          </select>
          {data && <span className="text-sm text-[var(--sb-text-muted)] ml-auto">共 {data.total} 条</span>}
        </div>
        {isLoading ? (
          <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[var(--sb-border)]">
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">游戏</th>
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">题目</th>
                  <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">版本</th>
                  <th className="text-left py-3 px-3 text-[var(--sb-text-muted)] font-medium">引擎</th>
                  <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">验证</th>
                  <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">状态</th>
                  <th className="text-center py-3 px-3 text-[var(--sb-text-muted)] font-medium">当前</th>
                  <th className="text-right py-3 px-3 text-[var(--sb-text-muted)] font-medium">操作</th>
                </tr></thead>
                <tbody>{data.items.map((v) => {
                  const game = games?.items.find((g) => g.id === v.puzzle.gameId);
                  const vs = VERSION_STATUS[v.status];
                  const isCurrent = v.id === v.puzzle.currentVersionId;
                  const editable = v.status === 'DRAFT' || v.status === 'VALIDATING';
                  return (
                    <tr key={v.id} className="border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]">
                      <td className="py-3 px-3 text-xs text-[var(--sb-text-primary)]">{game?.title || v.puzzle.gameId}</td>
                      <td className="py-3 px-3">
                        <button className="text-[var(--sb-primary)] hover:underline cursor-pointer bg-transparent border-none text-sm font-medium"
                          onClick={() => openTab({ id: `/puzzle-edit/${v.puzzle.id}`, title: `题目-${v.puzzle.title}`, path: `/puzzle-edit/${v.puzzle.id}` })}>
                          {v.puzzle.title}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[var(--sb-text-secondary)]">v{v.version}</td>
                      <td className="py-3 px-3 font-mono text-xs text-[var(--sb-text-secondary)]">{v.engineKey}</td>
                      <td className="py-3 px-3 text-center"><Badge variant={v.validationStatus === 'VALID' ? 'success' : v.validationStatus === 'INVALID' ? 'danger' : 'default'}>{v.validationStatus}</Badge></td>
                      <td className="py-3 px-3 text-center"><Badge variant={vs?.variant || 'default'}>{vs?.label || v.status}</Badge></td>
                      <td className="py-3 px-3 text-center">{isCurrent ? <Badge variant="success">当前</Badge> : ''}</td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditItem(v);
                          setEditContentStr(JSON.stringify(v.content ?? {}, null, 2));
                        }}>编辑</Button>
                        {editable && <Button size="sm" variant="ghost" onClick={() => validateMutation.mutate(v.id)}>验证</Button>}
                        {v.validationStatus === 'VALID' && v.status !== 'PUBLISHED' && (
                          <Button size="sm" variant="ghost" onClick={() => publishMutation.mutate(v.id)}>发布</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            {data.total > 50 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                <span className="text-sm text-[var(--sb-text-muted)] px-3">{page} / {Math.ceil(data.total / 50)}</span>
                <Button size="sm" variant="secondary" disabled={page >= Math.ceil(data.total / 50)} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-[var(--sb-text-muted)] py-8">暂无数据</div>
        )}
      </Card>

      {/* Edit version content modal */}
      <Modal
        open={!!editItem}
        title={`编辑版本 v${editItem?.version || ''} - ${editItem?.engineKey || ''}`}
        onClose={() => setEditItem(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditItem(null)}>取消</Button>
            <Button disabled={updateMutation.isPending} onClick={() => {
              try { JSON.parse(editContentStr); } catch { alert('JSON 格式错误'); return; }
              updateMutation.mutate();
            }}>{updateMutation.isPending ? '保存中...' : '保存'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {updateMutation.isError && <p className="text-sm text-[var(--sb-danger)]">保存失败</p>}
          {editItem && (
            <div className="text-xs text-[var(--sb-text-muted)]">
              题目: <span className="text-[var(--sb-text-primary)]">{editItem.puzzle.title}</span>
              <span className="ml-2 font-mono">({editItem.puzzle.slug})</span>
            </div>
          )}
          <div>
            <label className="block text-sm text-[var(--sb-text-secondary)] mb-1.5">内容 (JSON)</label>
            <textarea
              className="w-full h-80 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg p-3 font-mono text-sm text-[var(--sb-text-primary)] resize-y"
              value={editContentStr}
              onChange={(e) => setEditContentStr(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
