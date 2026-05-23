import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useSlidingPuzzleStore } from './useSlidingPuzzleStore';
import { SlidingPuzzleBoard } from './SlidingPuzzleBoard';
import { useAuthStore } from '../../auth/auth-store';
import { formatDuration } from '../../../lib/format';
import { SLIDING_PUZZLE_DIFFICULTIES } from '@brain-games/shared';
import { GamePlayLayout } from '../../../components/game/GamePlayLayout';
import { GameStage } from '../../../components/game/GameStage';
import { GameHud } from '../../../components/game/GameHud';
import { GameControlBar } from '../../../components/game/GameControlBar';
import { GameResultModal } from '../../../components/game/GameResultModal';
import { DifficultySelector } from '../../../components/game/DifficultySelector';
import { Card } from '../../../components/ui/Card';

const COUNTDOWN_KEY = 'sb_sliding_puzzle_countdown';

export default function SlidingPuzzlePage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { difficulty?: string };
  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';

  const [selectedDifficulty, setSelectedDifficulty] = useState(search.difficulty || 'easy');
  const [showResult, setShowResult] = useState(false);
  const [enableCountdown, setEnableCountdown] = useState(() => {
    const stored = localStorage.getItem(COUNTDOWN_KEY);
    return stored === null ? true : stored === 'true';
  });

  const {
    status,
    moves,
    elapsedMs,
    maxDurationMs,
    isRunning,
    countdownMs,
    difficultyKey,
    result,
    error,
    startGame,
    reset,
    tick,
    countdownTick,
    abandonGame,
  } = useSlidingPuzzleStore();

  // Cleanup on unmount
  useEffect(() => {
    return () => { reset(); };
  }, [reset]);

  // Save countdown preference
  useEffect(() => {
    localStorage.setItem(COUNTDOWN_KEY, String(enableCountdown));
  }, [enableCountdown]);

  // Timer tick
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [isRunning, tick]);

  // Countdown tick
  useEffect(() => {
    if (status !== 'countdown') return;
    const interval = setInterval(countdownTick, 100);
    return () => clearInterval(interval);
  }, [status, countdownTick]);

  // Show result modal
  useEffect(() => {
    if (status === 'submitted' && result) {
      setShowResult(true);
    }
  }, [status, result]);

  const handleStart = useCallback(() => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    startGame(selectedDifficulty, enableCountdown);
  }, [isAuthenticated, selectedDifficulty, enableCountdown, startGame]);

  const handleRestart = useCallback(() => {
    reset();
  }, [reset]);

  const handleDifficultyChange = useCallback((key: string) => {
    const canChangeDifficulty = status === 'idle' || status === 'abandoned';
    if (!canChangeDifficulty) return;
    setSelectedDifficulty(key);
  }, [status]);

  const difficultyLabel = SLIDING_PUZZLE_DIFFICULTIES.find((d) => d.key === selectedDifficulty)?.label || '标准';
  const selectedMaxDurationMs =
    SLIDING_PUZZLE_DIFFICULTIES.find((d) => d.key === selectedDifficulty)?.maxDurationMs ?? 0;
  const countdownSeconds = Math.ceil(countdownMs / 1000);
  const isGameActive =
    status === 'loading' ||
    status === 'countdown' ||
    status === 'playing' ||
    status === 'completed' ||
    status === 'submitting' ||
    status === 'submitted';
  const canChangeDifficulty = status === 'idle' || status === 'abandoned' || status === 'timeout';

  const infoPanel = (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--sb-text-primary)] mb-1">数字华容道</h1>
        <p className="text-xs text-[var(--sb-text-muted)]">{difficultyLabel}</p>
        <p className="text-xs text-[var(--sb-text-muted)] mt-1">
          最长时长：{formatDuration(maxDurationMs || selectedMaxDurationMs)}（超时自动失败）
        </p>
      </div>

      {/* HUD - show when game is active */}
      {isGameActive && (
        <GameHud
          items={[
              { label: '用时', value: formatDuration(elapsedMs), emphasize: true },
              { label: '步数', value: moves, emphasize: true },
              { label: '上限', value: formatDuration(maxDurationMs || selectedMaxDurationMs) },
            ]}
          />
        )}

      {/* Countdown display */}
      {status === 'countdown' && (
        <div className="bg-[var(--sb-bg-elevated)] rounded-xl p-4 border border-[var(--sb-border)] text-center">
          <div className="text-xs text-[var(--sb-text-muted)] mb-1">倒计时</div>
          <div className="text-4xl font-bold font-mono text-[var(--sb-primary)] tabular-nums">
            {countdownSeconds}
          </div>
        </div>
      )}

      {/* Difficulty selector */}
      {canChangeDifficulty && (
        <div>
          <h3 className="text-xs font-semibold text-[var(--sb-text-muted)] mb-2">难度</h3>
          <DifficultySelector
            levels={SLIDING_PUZZLE_DIFFICULTIES.map((d) => ({ key: d.key, label: d.label }))}
            value={selectedDifficulty}
            onChange={handleDifficultyChange}
          />
        </div>
      )}

      {/* Countdown toggle - always visible */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enableCountdown}
          onChange={(e) => setEnableCountdown(e.target.checked)}
          className="w-4 h-4 accent-[var(--sb-primary)]"
        />
        <span className="text-sm text-[var(--sb-text-secondary)]">开始前倒计时 5 秒</span>
      </label>

      {/* Control buttons */}
      <GameControlBar
        status={status === 'abandoned' || status === 'timeout' ? 'idle' : status}
        onStart={handleStart}
        onRestart={handleRestart}
        isAuthenticated={isAuthenticated}
      />

      {(status === 'countdown' || status === 'playing' || status === 'submitting') && (
        <button
          className="w-full py-2 text-xs text-gray-400 hover:text-red-400 transition-colors"
          onClick={abandonGame}
        >
          放弃挑战
        </button>
      )}

      {status === 'submitting' && (
        <p className="text-xs text-[var(--sb-text-muted)]">提交成绩中...</p>
      )}

      {error && (
        <p className="text-xs text-[var(--sb-danger)]">{error}</p>
      )}
    </div>
  );

  const stage = (
    <GameStage>
      {status === 'idle' ? (
        <div className="text-center">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="mx-auto mb-6">
            <rect x="4" y="4" width="34" height="34" rx="6" stroke="var(--sb-border-strong)" strokeWidth="1.5" fill="var(--sb-bg-muted)" />
            <rect x="43" y="4" width="34" height="34" rx="6" stroke="var(--sb-border-strong)" strokeWidth="1.5" fill="var(--sb-bg-muted)" />
            <rect x="82" y="4" width="34" height="34" rx="6" stroke="var(--sb-border-strong)" strokeWidth="1.5" fill="var(--sb-bg-muted)" />
            <rect x="4" y="43" width="34" height="34" rx="6" stroke="var(--sb-border-strong)" strokeWidth="1.5" fill="var(--sb-bg-muted)" />
            <rect x="43" y="43" width="34" height="34" rx="6" stroke="var(--sb-primary)" strokeWidth="2" fill="var(--sb-primary-soft)" />
            <rect x="82" y="43" width="34" height="34" rx="6" stroke="var(--sb-border-strong)" strokeWidth="1.5" fill="var(--sb-bg-muted)" />
            <rect x="4" y="82" width="34" height="34" rx="6" stroke="var(--sb-border-strong)" strokeWidth="1.5" fill="var(--sb-bg-muted)" />
            <rect x="43" y="82" width="34" height="34" rx="6" stroke="var(--sb-border-strong)" strokeWidth="1.5" fill="var(--sb-bg-muted)" />
            <rect x="82" y="82" width="34" height="34" rx="6" stroke="var(--sb-border-strong)" strokeWidth="1.5" fill="var(--sb-bg-muted)" strokeDasharray="4 3" opacity="0.5" />
          </svg>
          <p className="text-[var(--sb-text-muted)] text-sm">选择难度后点击开始</p>
        </div>
      ) : (
        <>
          {status === 'countdown' && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="text-8xl font-bold text-[var(--sb-primary)] opacity-30 font-mono tabular-nums">
                {countdownSeconds}
              </div>
            </div>
          )}
          <SlidingPuzzleBoard locked={status !== 'playing'} />
        </>
      )}
    </GameStage>
  );

  const sidePanel = (
    <Card>
      <h3 className="text-sm font-semibold text-[var(--sb-text-secondary)] mb-3">规则</h3>
      <ul className="text-xs text-[var(--sb-text-muted)] space-y-2">
        <li>点击空格旁的数字方块进行移动</li>
        <li>目标是将数字按从小到大排列</li>
        <li>空格应位于右下角</li>
        <li>用时越短、步数越少成绩越好</li>
      </ul>
    </Card>
  );

  return (
    <>
      <GamePlayLayout infoPanel={infoPanel} stage={stage} sidePanel={sidePanel} />

      {showResult && result && (
        <GameResultModal
          metrics={{
            durationMs: elapsedMs,
            moves,
            size: SLIDING_PUZZLE_DIFFICULTIES.find((d) => d.key === selectedDifficulty)?.size,
          }}
          personalBest={result.personalBest}
          onRestart={() => { setShowResult(false); handleRestart(); }}
          onViewLeaderboard={() => {
            setShowResult(false);
            navigate({
              to: '/games/$slug/leaderboards',
              params: { slug: 'sliding-puzzle' },
              search: { difficulty: difficultyKey, tab: 'best' },
            });
          }}
          onClose={() => setShowResult(false)}
        />
      )}
    </>
  );
}
