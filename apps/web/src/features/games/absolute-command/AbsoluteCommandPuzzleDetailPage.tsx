import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getACPuzzleDetailApi } from './api';
import { AbsoluteCommandMaze3D } from './components/AbsoluteCommandMaze3D';
import { coordKey } from '@brain-games/game-engine';
import type { AbsoluteCommandRuntimeState } from '@brain-games/game-engine';
import { Card } from '../../../components/ui/Card';
import { formatDuration } from '../../../lib/format';

function createPreviewState(
  cells: any[],
  size: { width: number; height: number; depth: number },
): AbsoluteCommandRuntimeState {
  const startCell = cells.find((c: any) => c.type === 'START');
  const startCoord = startCell?.coord || { x: 0, y: 0, z: 0 };
  const redCells: string[] = [];
  const numberStates: any[] = [];

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

export default function AbsoluteCommandPuzzleDetailPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { puzzleSlug: string };

  const { data, isLoading } = useQuery({
    queryKey: ['ac-puzzle-detail', params.puzzleSlug],
    queryFn: () => getACPuzzleDetailApi(params.puzzleSlug),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-[var(--sb-text-muted)]">
        加载中...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-[var(--sb-text-muted)]">
        题目未找到
      </div>
    );
  }

  const { puzzle, leaderboardPreview } = data;
  const previewState = createPreviewState(puzzle.cells, puzzle.size);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate({ to: '/games/absolute-command' })}
        className="text-xs text-[var(--sb-text-muted)] hover:text-[var(--sb-primary)] mb-4 inline-block"
      >
        ← 返回题目列表
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--sb-text-primary)] mb-1">{puzzle.title}</h1>
            {puzzle.difficultyLabel && (
              <span className="text-xs px-2 py-0.5 rounded bg-[var(--sb-primary-soft)] text-[var(--sb-primary)] font-medium">
                {puzzle.difficultyLabel}
              </span>
            )}
          </div>

          {puzzle.description && (
            <p className="text-sm text-[var(--sb-text-muted)]">{puzzle.description}</p>
          )}

          <Card>
            <div className="space-y-2 text-xs">
              {puzzle.estimatedDuration && (
                <div className="flex justify-between">
                  <span className="text-[var(--sb-text-muted)]">预计用时</span>
                  <span className="text-[var(--sb-text-secondary)]">{puzzle.estimatedDuration}</span>
                </div>
              )}
              {puzzle.optimalCommandCount && (
                <div className="flex justify-between">
                  <span className="text-[var(--sb-text-muted)]">参考步数</span>
                  <span className="text-[var(--sb-text-secondary)]">{puzzle.optimalCommandCount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--sb-text-muted)]">迷宫尺寸</span>
                <span className="text-[var(--sb-text-secondary)]">
                  {puzzle.size.width}×{puzzle.size.height}×{puzzle.size.depth}
                </span>
              </div>
            </div>
          </Card>

          <button
            onClick={() => navigate({
              to: '/games/absolute-command/puzzles/$puzzleSlug/play',
              params: { puzzleSlug: puzzle.slug },
              search: { puzzleId: puzzle.id },
            })}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white
              bg-[var(--sb-primary)] hover:opacity-90 transition-opacity"
          >
            开始挑战
          </button>

          {/* Rules */}
          <Card>
            <h3 className="text-sm font-semibold text-[var(--sb-text-secondary)] mb-2">规则说明</h3>
            <ul className="text-xs text-[var(--sb-text-muted)] space-y-1.5">
              <li>你将进入一个 {puzzle.size.width}×{puzzle.size.height}×{puzzle.size.depth} 的三维迷宫</li>
              <li>每次输入一个方向指令，角色持续移动直到停止</li>
              <li>黄色方格：进入后停止</li>
              <li>红色方格：不可进入，停在前一格</li>
              <li>数字方格：每经过一次减一，归零后变红</li>
              <li>经过所有可访问方格即为完成</li>
              <li>排行榜优先比较步数，步数相同比较用时</li>
            </ul>
          </Card>
        </div>

        {/* Center: 3D Preview */}
        <div className="lg:col-span-2">
          <Card className="h-[500px]">
            <AbsoluteCommandMaze3D
              cells={puzzle.cells}
              size={puzzle.size}
              state={previewState}
            />
          </Card>

          {/* Leaderboard preview */}
          {leaderboardPreview.items.length > 0 && (
            <Card className="mt-4">
              <h3 className="text-sm font-semibold text-[var(--sb-text-secondary)] mb-3">排行榜 Top 5</h3>
              <div className="space-y-2">
                {leaderboardPreview.items.map((item) => (
                  <div key={item.rank} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-center font-mono text-[var(--sb-text-muted)]">
                        #{item.rank}
                      </span>
                      <span className="text-[var(--sb-text-primary)]">{item.user.username}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[var(--sb-text-muted)]">
                      <span>{item.commandCount} 步</span>
                      <span>{formatDuration(item.durationMs)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
