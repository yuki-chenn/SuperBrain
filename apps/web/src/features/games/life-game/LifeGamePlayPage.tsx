import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useLifeGameStore } from './useLifeGameStore';
import { LifeInitialBoard } from './LifeInitialBoard';
import { LifeTargetPanel } from './LifeTargetPanel';
import { LifeRulesPanel } from './LifeRulesPanel';
import { LifeResultModal } from './LifeResultModal';
import { useAuthStore } from '../../auth/auth-store';
import { formatDuration } from '../../../lib/format';
import { LIFE_GAME_DIFFICULTIES } from '@brain-games/shared';
import { GamePlayLayout } from '../../../components/game/GamePlayLayout';
import { GameStage } from '../../../components/game/GameStage';
import { GameHud } from '../../../components/game/GameHud';
import { GameControlBar } from '../../../components/game/GameControlBar';
import { DifficultySelector } from '../../../components/game/DifficultySelector';
import { Card } from '../../../components/ui/Card';

export default function LifeGamePlayPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { difficulty?: string; attemptId?: string };
  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const isAdmin = useAuthStore((s) => s.user?.role) === 'ADMIN';
  const isDevAdmin = import.meta.env.DEV && isAdmin;

  const [selectedDifficulty, setSelectedDifficulty] = useState(search.difficulty || 'easy');
  const [showResult, setShowResult] = useState(false);

  const {
    status,
    difficultyKey,
    initialState,
    targetRegionIds,
    correctRegionIds,
    errorCount,
    activeRegionId,
    answerDrafts,
    answerHints,
    elapsedMs,
    isRunning,
    result,
    error,
    startGame,
    setActiveRegion,
    toggleCell,
    submitRegion,
    showAnswer,
    restartGame,
    recoverAttempt,
    tick,
    reset,
  } = useLifeGameStore();

  // Recover from URL attemptId or start fresh
  useEffect(() => {
    if (search.attemptId) {
      recoverAttempt(search.attemptId);
    }
    return () => { reset(); };
  }, []);

  // Timer tick
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [isRunning, tick]);

  // Show result modal when completed
  useEffect(() => {
    if (status === 'completed' && result) {
      setShowResult(true);
    }
  }, [status, result]);

  const handleStart = useCallback(() => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    startGame(selectedDifficulty);
  }, [isAuthenticated, selectedDifficulty, startGame]);

  const handleRestart = useCallback(() => {
    restartGame();
  }, [restartGame]);

  const handleDifficultyChange = useCallback((key: string) => {
    setSelectedDifficulty(key);
    if (status !== 'idle') {
      reset();
    }
  }, [status, reset]);

  const handleSubmitRegion = useCallback((regionId: number) => {
    submitRegion(regionId);
  }, [submitRegion]);

  const difficultyLabel = LIFE_GAME_DIFFICULTIES.find((d) => d.key === selectedDifficulty)?.label || '入门';
  const isGameActive = status === 'loading' || status === 'playing' || status === 'submitting' || status === 'completed';

  const infoPanel = (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--sb-text-primary)] mb-1">生命游戏</h1>
        <p className="text-xs text-[var(--sb-text-muted)]">{difficultyLabel}</p>
      </div>

      {/* HUD */}
      {isGameActive && (
        <GameHud
          items={[
            { label: '用时', value: formatDuration(elapsedMs), emphasize: true },
            { label: '错误', value: errorCount, emphasize: true },
            { label: '进度', value: `${correctRegionIds.length} / ${targetRegionIds.length}` },
          ]}
        />
      )}

      {/* Difficulty selector */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--sb-text-muted)] mb-2">难度</h3>
        <DifficultySelector
          levels={LIFE_GAME_DIFFICULTIES.map((d) => ({ key: d.key, label: d.label }))}
          value={selectedDifficulty}
          onChange={handleDifficultyChange}
        />
      </div>

      {/* Control buttons */}
      <GameControlBar
        status={status === 'abandoned' ? 'idle' : status}
        onStart={handleStart}
        onRestart={handleRestart}
        isAuthenticated={isAuthenticated}
      />

      {status === 'submitting' && (
        <p className="text-xs text-[var(--sb-text-muted)]">提交中...</p>
      )}

      {error && (
        <p className="text-xs text-[var(--sb-danger)]">{error}</p>
      )}

      {isGameActive && isDevAdmin && (
        <button
          type="button"
          onClick={() => activeRegionId && showAnswer(activeRegionId)}
          className="text-xs text-[var(--sb-text-muted)] hover:text-[var(--sb-primary)] transition-colors"
        >
          {activeRegionId && answerHints[activeRegionId] ? '隐藏答案' : '显示答案（调试）'}
        </button>
      )}
    </div>
  );

  const stage = (
    <GameStage>
      {status === 'idle' ? (
        <div className="text-center">
          <svg width="120" height="60" viewBox="0 0 120 60" fill="none" className="mx-auto mb-6">
            {/* Simple grid pattern */}
            {Array.from({ length: 6 }, (_, y) =>
              Array.from({ length: 12 }, (_, x) => (
                <rect
                  key={`${x},${y}`}
                  x={x * 10}
                  y={y * 10}
                  width="9"
                  height="9"
                  rx="1"
                  fill={(x + y) % 3 === 0 ? '#facc15' : '#2f3545'}
                  opacity={(x + y) % 3 === 0 ? 0.8 : 0.4}
                />
              )),
            )}
          </svg>
          <p className="text-[var(--sb-text-muted)] text-sm">选择难度后点击开始</p>
        </div>
      ) : initialState ? (
        <LifeInitialBoard
          aliveCells={initialState.aliveCells}
          targetRegionIds={targetRegionIds}
          correctRegionIds={correctRegionIds}
        />
      ) : null}
    </GameStage>
  );

  const sidePanel = isGameActive ? (
    <LifeTargetPanel
      targetRegionIds={targetRegionIds}
      correctRegionIds={correctRegionIds}
      activeRegionId={activeRegionId}
      answerDrafts={answerDrafts}
      answerHints={answerHints}
      onSelectRegion={setActiveRegion}
      onToggleCell={toggleCell}
      onSubmit={handleSubmitRegion}
      isSubmitting={status === 'submitting'}
    />
  ) : (
    <LifeRulesPanel />
  );

  return (
    <>
      <GamePlayLayout infoPanel={infoPanel} stage={stage} sidePanel={sidePanel} />

      {showResult && result?.result && (
        <LifeResultModal
          durationMs={result.result.durationMs}
          errorCount={result.result.errorCount}
          targetRegionCount={result.result.targetRegionCount}
          personalBest={result.result.personalBest}
          onRestart={() => { setShowResult(false); handleRestart(); }}
          onViewLeaderboard={() => {
            setShowResult(false);
            navigate({
              to: '/games/$slug/leaderboards',
              params: { slug: 'life-game' },
              search: { difficulty: difficultyKey, tab: 'best' },
            });
          }}
          onClose={() => setShowResult(false)}
        />
      )}
    </>
  );
}
