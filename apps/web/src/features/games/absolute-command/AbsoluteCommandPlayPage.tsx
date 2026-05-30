import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAbsoluteCommandStore } from './useAbsoluteCommandStore';
import { AbsoluteCommandMaze3D } from './components/AbsoluteCommandMaze3D';
import { AbsoluteCommandDirectionPad } from './components/AbsoluteCommandDirectionPad';
import { AbsoluteCommandLayerMiniMap } from './components/AbsoluteCommandLayerMiniMap';
import { AbsoluteCommandResultModal } from './components/AbsoluteCommandResultModal';
import { useAuthStore } from '../../auth/auth-store';
import { coordKey } from '@brain-games/game-engine';
import type { AbsoluteCommandDirection } from '@brain-games/game-engine';
import { Card } from '../../../components/ui/Card';

export default function AbsoluteCommandPlayPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { puzzleId?: string; attemptId?: string };
  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';

  const {
    puzzle,
    state,
    status,
    result,
    error,
    animatingCoord: animatingCoordFromStore,
    startGame,
    resumeAttempt,
    executeCommand,
    undo,
    reset: resetAttempt,
    abandonGame,
    resetStore,
  } = useAbsoluteCommandStore();

  const [showResult, setShowResult] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    return () => { resetStore(); };
  }, [resetStore]);

  useEffect(() => {
    if (status === 'completed' && result) {
      setShowResult(true);
    }
  }, [status, result]);

  useEffect(() => {
    if (status !== 'playing') return;

    const keyMap: Record<string, AbsoluteCommandDirection> = {
      ArrowLeft: 'X_NEG',
      ArrowRight: 'X_POS',
      ArrowUp: 'Y_NEG',
      ArrowDown: 'Y_POS',
      q: 'Z_POS',
      Q: 'Z_POS',
      e: 'Z_NEG',
      E: 'Z_NEG',
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const direction = keyMap[e.key];
      if (direction) {
        e.preventDefault();
        executeCommand(direction);
        return;
      }

      if (e.key === 'u' || (e.ctrlKey && e.key === 'z')) {
        e.preventDefault();
        undo();
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setShowResetConfirm(true);
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setShowExitConfirm(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, executeCommand, undo]);

  const startedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (status !== 'idle') return;
    if (startedRef.current) return;

    if (search.attemptId) {
      startedRef.current = true;
      resumeAttempt(search.attemptId);
    } else if (search.puzzleId) {
      startedRef.current = true;
      startGame(search.puzzleId);
    }
  }, [isAuthenticated, search.puzzleId, search.attemptId, status, startGame, resumeAttempt]);

  const handleDirection = useCallback((direction: AbsoluteCommandDirection) => {
    executeCommand(direction);
  }, [executeCommand]);

  const handleReset = useCallback(() => {
    setShowResetConfirm(false);
    resetAttempt();
  }, [resetAttempt]);

  const handleExit = useCallback(() => {
    setShowExitConfirm(false);
    abandonGame();
  }, [abandonGame]);

  const handlePlayAgain = useCallback(() => {
    setShowResult(false);
    resetAttempt();
  }, [resetAttempt]);

  const requiredCells = puzzle ? computeRequiredCells(puzzle.cells, puzzle.size) : 192;
  const isGameActive = status === 'playing' || status === 'animating' || status === 'completed';
  const canInput = status === 'playing';
  const visitedCount = state?.visitedCells.length ?? 0;
  const progressPct = requiredCells > 0 ? Math.round((visitedCount / requiredCells) * 100) : 0;

  return (
    <>
      <div className="w-full px-4 md:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          {/* Left: Stats bar + Maze */}
          <div className="space-y-4">
            {/* Stats bar */}
            {state && puzzle && (
              <div className="flex items-center gap-6 px-4 py-3 rounded-xl bg-[var(--sb-bg-card)] border border-[var(--sb-border)]">
                <div className="text-sm">
                  <span className="text-[var(--sb-text-muted)]">步数 </span>
                  <span className="font-mono font-semibold text-[var(--sb-primary)] tabular-nums">
                    {state.commandCount}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-[var(--sb-text-muted)]">距离 </span>
                  <span className="font-mono font-semibold text-[var(--sb-text-primary)] tabular-nums">
                    {state.travelDistance}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--sb-text-muted)]">进度</span>
                    <div className="flex-1 h-2 bg-[var(--sb-bg-muted)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--sb-primary)] rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(progressPct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--sb-text-muted)] font-mono tabular-nums w-16 text-right">
                      {visitedCount}/{requiredCells}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-[var(--sb-text-muted)]">
                  {puzzle.title}
                </div>
              </div>
            )}

            {/* Maze */}
            <div className="rounded-xl overflow-hidden bg-[var(--sb-bg-card)] border border-[var(--sb-border)]"
              style={{ height: 'calc(100vh - 180px)', minHeight: '500px', width: '100%' }}>
              {status === 'idle' && !search.puzzleId && !search.attemptId ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-[var(--sb-text-muted)] text-sm mb-4">请从题目列表选择一个题目开始挑战</p>
                    <button
                      onClick={() => navigate({ to: '/games/absolute-command' })}
                      className="px-4 py-2 rounded-xl text-sm bg-[var(--sb-primary)] text-white hover:opacity-90"
                    >
                      浏览题目
                    </button>
                  </div>
                </div>
              ) : state && puzzle ? (
                <AbsoluteCommandMaze3D
                  cells={puzzle.cells}
                  size={puzzle.size}
                  state={state}
                  animatingCoord={animatingCoordFromStore}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--sb-text-muted)] text-sm">
                  加载中...
                </div>
              )}
            </div>
          </div>

          {/* Right: Controls */}
          <div className="space-y-3">
            <Card className="p-3">
              <AbsoluteCommandDirectionPad
                onDirection={handleDirection}
                disabled={!canInput}
              />
              <div className="flex gap-1.5 mt-3">
                <button
                  onClick={undo}
                  disabled={!canInput || !state || state.commandHistory.length === 0}
                  className="flex-1 py-1.5 rounded-lg text-xs text-[var(--sb-text-secondary)]
                    bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)]
                    hover:bg-[var(--sb-primary-soft)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  撤回
                </button>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  disabled={!isGameActive}
                  className="flex-1 py-1.5 rounded-lg text-xs text-[var(--sb-text-secondary)]
                    bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)]
                    hover:bg-[var(--sb-primary-soft)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  重置
                </button>
                <button
                  onClick={() => setShowExitConfirm(true)}
                  disabled={status !== 'playing' && status !== 'animating'}
                  className="flex-1 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300
                    disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  放弃挑战
                </button>
              </div>
            </Card>

            {puzzle && state && (
              <Card className="p-3">
                <AbsoluteCommandLayerMiniMap
                  cells={puzzle.cells}
                  size={puzzle.size}
                  state={state}
                />
              </Card>
            )}

            <Card className="p-3">
              <div className="text-[10px] text-[var(--sb-text-muted)] space-y-0.5">
                <div className="flex justify-between"><span>方向</span><span className="font-mono">方向键</span></div>
                <div className="flex justify-between"><span>层级</span><span className="font-mono">Q / E</span></div>
                <div className="flex justify-between"><span>撤回</span><span className="font-mono">U</span></div>
                <div className="flex justify-between"><span>重置</span><span className="font-mono">R</span></div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50
          bg-[var(--sb-bg-card)] border border-[var(--sb-border)] rounded-xl px-4 py-2
          text-sm text-[var(--sb-text-secondary)] shadow-lg">
          {error}
        </div>
      )}

      {showResult && result && (
        <AbsoluteCommandResultModal
          commandCount={result.commandCount}
          durationMs={result.durationMs}
          travelDistance={result.travelDistance}
          personalBest={result.personalBest}
          onClose={() => setShowResult(false)}
          onViewLeaderboard={() => {
            setShowResult(false);
            navigate({ to: '/games/absolute-command' });
          }}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {showResetConfirm && (
        <ConfirmDialog
          title="确定重置？"
          message="当前已输入的指令会被清空。"
          confirmText="重置"
          onConfirm={handleReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      {showExitConfirm && (
        <ConfirmDialog
          title="确定放弃挑战？"
          message="放弃后本次挑战将标记为失败，无法恢复。"
          confirmText="放弃"
          onConfirm={handleExit}
          onCancel={() => setShowExitConfirm(false)}
        />
      )}
    </>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--sb-bg-elevated)] rounded-2xl p-5 max-w-xs w-full mx-4 border border-[var(--sb-border)]">
        <h3 className="text-lg font-bold text-[var(--sb-text-primary)] mb-1">{title}</h3>
        <p className="text-sm text-[var(--sb-text-muted)] mb-4">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm text-[var(--sb-text-secondary)]
              bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm text-white bg-red-500 hover:bg-red-600"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function computeRequiredCells(
  cells: any[],
  size: { width: number; height: number; depth: number },
): number {
  const configuredKeys = new Set(cells.map((c: any) => coordKey(c.coord)));
  let count = 0;
  for (const cell of cells) {
    if (cell.type === 'DISABLED' || cell.type === 'INITIAL_RED') continue;
    count++;
  }
  for (let z = 0; z < size.depth; z++) {
    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        if (!configuredKeys.has(coordKey({ x, y, z }))) {
          count++;
        }
      }
    }
  }
  return count;
}
