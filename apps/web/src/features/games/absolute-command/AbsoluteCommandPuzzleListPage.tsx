import { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { listACPuzzlesApi, getACPuzzleDetailApi, getACPuzzleLeaderboardApi } from './api';
import { AbsoluteCommandMaze3D } from './components/AbsoluteCommandMaze3D';
import { coordKey } from '@brain-games/game-engine';
import type { AbsoluteCommandRuntimeState, AbsoluteCommandCell } from '@brain-games/game-engine';
import { Card } from '../../../components/ui/Card';
import { formatDuration } from '../../../lib/format';
import { useAuthStore } from '../../auth/auth-store';

function createPreviewState(
  cells: AbsoluteCommandCell[],
  size: { width: number; height: number; depth: number },
): AbsoluteCommandRuntimeState {
  const startCell = cells.find((c) => c.type === 'START');
  const startCoord = startCell?.coord || { x: 0, y: 0, z: 0 };
  const redCells: string[] = [];
  const numberStates: AbsoluteCommandRuntimeState['numberStates'] = [];

  for (const cell of cells) {
    if (cell.type === 'INITIAL_RED') redCells.push(coordKey(cell.coord));
    if (cell.type === 'NUMBER' && cell.requiredPasses) {
      numberStates.push({
        coord: cell.coord,
        requiredPasses: cell.requiredPasses,
        remainingPasses: cell.requiredPasses,
      });
    }
  }

  return {
    position: startCoord,
    visitedCells: [coordKey(startCoord)],
    redCells,
    numberStates,
    commandCount: 0,
    travelDistance: 0,
    commandHistory: [],
    completed: false,
  };
}

export default function AbsoluteCommandPuzzleListPage() {
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Fetch all puzzles
  const { data: puzzleList, isLoading: listLoading } = useQuery({
    queryKey: ['ac-puzzles'],
    queryFn: () => listACPuzzlesApi({ pageSize: 50 }),
  });

  const [selectedSlug, setSelectedSlug] = useState<string>('');

  // Default to first puzzle
  const effectiveSlug = selectedSlug || puzzleList?.items[0]?.slug || '';

  // Fetch detail for selected puzzle
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['ac-puzzle-detail', effectiveSlug],
    queryFn: () => getACPuzzleDetailApi(effectiveSlug),
    enabled: !!effectiveSlug,
  });

  // Fetch leaderboard for selected puzzle
  const { data: leaderboard } = useQuery({
    queryKey: ['ac-leaderboard', detail?.puzzle.id],
    queryFn: () => getACPuzzleLeaderboardApi(detail!.puzzle.id, { limit: 20 }),
    enabled: !!detail?.puzzle.id,
  });

  const previewState = useMemo(() => {
    if (!detail) return null;
    return createPreviewState(detail.puzzle.cells as AbsoluteCommandCell[], detail.puzzle.size);
  }, [detail]);

  const isLoading = listLoading || detailLoading;

  // Find user's rank info
  const myBest = leaderboard?.myBest;
  const isInLeaderboard = leaderboard?.items.some((item) => item.user.id === currentUserId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--sb-text-primary)] mb-1">绝对指令</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">
          三维路径规划与绝对方向指令挑战
        </p>
      </div>

      {/* Puzzle selector */}
      {puzzleList && puzzleList.items.length > 0 && (
        <div className="mb-6">
          <label className="text-xs text-[var(--sb-text-muted)] mr-2">选择题目：</label>
          <select
            value={effectiveSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)] rounded-lg px-3 py-1.5
              text-sm text-[var(--sb-text-primary)] outline-none focus:border-[var(--sb-primary)]
              cursor-pointer"
          >
            {puzzleList.items.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.title}{p.difficultyLabel ? ` (${p.difficultyLabel})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-[var(--sb-text-muted)] py-12">加载中...</div>
      ) : detail && previewState ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: 3D Preview + Info + Start */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl overflow-hidden border border-[var(--sb-border)] bg-[var(--sb-bg-card)]" style={{ height: '400px' }}>
              <AbsoluteCommandMaze3D
                cells={detail.puzzle.cells as AbsoluteCommandCell[]}
                size={detail.puzzle.size}
                state={previewState}
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[var(--sb-text-primary)]">
                  {detail.puzzle.title}
                </h2>
                {detail.puzzle.description && (
                  <p className="text-sm text-[var(--sb-text-muted)]">
                    {detail.puzzle.description}
                  </p>
                )}
                <div className="flex gap-4 text-xs text-[var(--sb-text-muted)]">
                  {detail.puzzle.difficultyLabel && (
                    <span>难度：{detail.puzzle.difficultyLabel}</span>
                  )}
                  {detail.puzzle.optimalCommandCount && (
                    <span>参考步数：{detail.puzzle.optimalCommandCount}</span>
                  )}
                  {detail.puzzle.estimatedDuration && (
                    <span>预计：{detail.puzzle.estimatedDuration}</span>
                  )}
                  <span>尺寸：{detail.puzzle.size.width}×{detail.puzzle.size.height}×{detail.puzzle.size.depth}</span>
                </div>
              </div>

              <button
                onClick={() => navigate({
                  to: '/games/absolute-command/puzzles/$puzzleSlug/play',
                  params: { puzzleSlug: detail.puzzle.slug },
                  search: { puzzleId: detail.puzzle.id },
                })}
                className="shrink-0 px-6 py-2.5 rounded-xl text-sm font-semibold text-white
                  bg-[var(--sb-primary)] hover:opacity-90 transition-opacity"
              >
                开始挑战
              </button>
            </div>
          </div>

          {/* Right: Leaderboard + Rules */}
          <div className="space-y-4">
            {/* Leaderboard */}
            <Card>
              <h3 className="text-sm font-semibold text-[var(--sb-text-secondary)] mb-3">
                排行榜
              </h3>

              {leaderboard && leaderboard.items.length > 0 ? (
                <div className="space-y-1.5">
                  {leaderboard.items.map((item) => {
                    const isMe = item.user.id === currentUserId;
                    return (
                      <div
                        key={item.rank}
                        className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs
                          ${isMe ? 'bg-[var(--sb-primary-soft)]' : ''}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 text-center font-mono text-[var(--sb-text-muted)] shrink-0">
                            {item.rank}
                          </span>
                          <span className={`truncate ${isMe ? 'text-[var(--sb-primary)] font-semibold' : 'text-[var(--sb-text-primary)]'}`}>
                            {item.user.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-[var(--sb-text-muted)]">
                          <span className="font-mono">{item.commandCount} 步</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* User's own rank if not in top 20 */}
                  {currentUserId && myBest && !isInLeaderboard && (
                    <>
                      <div className="border-t border-[var(--sb-border)] my-1" />
                      <div className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs bg-[var(--sb-primary-soft)]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 text-center font-mono text-[var(--sb-text-muted)] shrink-0">
                            {myBest.rank}
                          </span>
                          <span className="text-[var(--sb-primary)] font-semibold truncate">我</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-[var(--sb-text-muted)]">
                          <span className="font-mono">{myBest.commandCount} 步</span>
                        </div>
                      </div>
                    </>
                  )}

                  {currentUserId && !myBest && (
                    <div className="text-xs text-[var(--sb-text-muted)] text-center py-2">
                      未上榜
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-[var(--sb-text-muted)] text-center py-4">
                  暂无记录
                </div>
              )}
            </Card>

            {/* Rules */}
            <Card>
              <h3 className="text-sm font-semibold text-[var(--sb-text-secondary)] mb-2">规则说明</h3>
              <ul className="text-xs text-[var(--sb-text-muted)] space-y-1.5">
                <li>你将进入一个 8×8×3 的三维迷宫</li>
                <li>每次输入一个方向指令，角色持续移动直到停止</li>
                <li>黄色方格：进入后停止</li>
                <li>红色方格：不可进入，停在前一格</li>
                <li>数字方格：每经过一次减一，归零后变红</li>
                <li>经过所有可访问方格即为完成</li>
                <li>排行榜优先比较步数，步数相同比较完成时间</li>
              </ul>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center text-[var(--sb-text-muted)] py-12">
          暂无题目
        </div>
      )}
    </div>
  );
}
