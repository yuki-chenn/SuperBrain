import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { usePreciseCharacterStore } from './usePreciseCharacterStore';
import { GamePlayLayout } from '../../../components/game/GamePlayLayout';
import { GameStage } from '../../../components/game/GameStage';
import { GameHud } from '../../../components/game/GameHud';
import { GameControlBar } from '../../../components/game/GameControlBar';
import { DifficultySelector } from '../../../components/game/DifficultySelector';
import CharacterBoard from './CharacterBoard';
import RadicalPool from './RadicalPool';
import RadicalSlotBar from './RadicalSlotBar';
import RoundSubmitPanel from './RoundSubmitPanel';
import PCBResultModal from './PCBResultModal';
import PCBRulesPanel from './PCBRulesPanel';
import { useAuthStore } from '../../auth/auth-store';
import { PRECISE_CHARACTER_BUILDING_DIFFICULTIES } from '@brain-games/shared';

export default function PreciseCharacterPlayPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { difficulty?: string; attempt?: string };
  const { user } = useAuthStore();

  const [selectedDifficulty, setSelectedDifficulty] = useState(search.difficulty || 'normal');
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef<number | null>(null);

  const {
    status,
    difficultyKey,
    currentRoundIndex,
    litCellIndices,
    errorCount,
    elapsedMs,
    maxDurationMs,
    result,
    startGame,
    tick,
    reset,
    recoverAttempt,
    abandonGame,
    resetBoard,
  } = usePreciseCharacterStore();

  // Recover attempt from URL
  useEffect(() => {
    if (search.attempt && status === 'idle') {
      recoverAttempt(search.attempt);
    }
  }, [search.attempt]);

  // Timer
  useEffect(() => {
    if (status === 'playing') {
      timerRef.current = window.setInterval(tick, 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, tick]);

  // Show result modal
  useEffect(() => {
    if (status === 'completed' && result) {
      if (timerRef.current) clearInterval(timerRef.current);
      setShowResult(true);
    }
  }, [status, result]);

  const handleStart = () => {
    if (!user) {
      navigate({ to: '/login' });
      return;
    }
    startGame(selectedDifficulty);
  };

  const handleRestart = () => {
    setShowResult(false);
    reset();
    setTimeout(() => startGame(selectedDifficulty), 50);
  };

  const handleResetBoard = () => {
    resetBoard();
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const difficulties = PRECISE_CHARACTER_BUILDING_DIFFICULTIES.map((d) => ({
    key: d.key,
    label: d.label,
  }));
  const displayStatus = status === 'abandoned' || status === 'timeout' ? 'idle' : status;
  const displayDifficulty = displayStatus === 'idle' ? selectedDifficulty : difficultyKey;
  const selectedMaxDurationMs =
    PRECISE_CHARACTER_BUILDING_DIFFICULTIES.find((d) => d.key === displayDifficulty)
      ?.maxDurationMs ?? 0;
  const handleControlBarRestart =
    displayStatus === 'playing' || displayStatus === 'submitting'
      ? handleResetBoard
      : handleRestart;

  const infoPanel = (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">精准造字</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          选择部首，重组汉字
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          最长时长：{formatTime(maxDurationMs || selectedMaxDurationMs)}（超时自动失败）
        </p>
      </div>

      {(displayStatus === 'playing' || displayStatus === 'submitting') && (
        <GameHud
          items={[
            { label: '用时', value: formatTime(elapsedMs), emphasize: true },
            { label: '错误', value: String(errorCount) },
            { label: '回合', value: `${currentRoundIndex + 1} / 9` },
            { label: '点亮', value: `${litCellIndices.length} / 36` },
            { label: '上限', value: formatTime(maxDurationMs || selectedMaxDurationMs) },
          ]}
        />
      )}

      {displayStatus === 'idle' && (
        <DifficultySelector
          levels={difficulties}
          value={selectedDifficulty}
          onChange={setSelectedDifficulty}
        />
      )}

      <GameControlBar
        status={displayStatus === 'submitting' ? 'submitting' : displayStatus}
        onStart={handleStart}
        onRestart={handleControlBarRestart}
        isAuthenticated={!!user}
        restartLabel="重置盘面"
      />

      {(displayStatus === 'playing' || displayStatus === 'submitting') && (
        <div>
          <button
            className="w-full py-2 text-xs text-gray-400 hover:text-red-400 transition-colors"
            onClick={abandonGame}
            disabled={status === 'submitting'}
          >
            放弃挑战
          </button>
        </div>
      )}
      {status === 'timeout' && (
        <p className="text-xs text-red-400">已超时，挑战失败（不计入成绩）</p>
      )}
    </div>
  );

  const stage = (
      <GameStage>
      {displayStatus === 'idle' && (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
          <div className="text-6xl">精准造字</div>
          <div className="text-sm">选择难度开始挑战</div>
        </div>
      )}
      {(displayStatus === 'playing' ||
        displayStatus === 'submitting' ||
        displayStatus === 'completed') && (
        <CharacterBoard />
      )}
      {displayStatus === 'loading' && (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}
    </GameStage>
  );

  const sidePanel = (
    <div className="space-y-4">
      {(displayStatus === 'playing' || displayStatus === 'submitting') ? (
        <>
          <RadicalSlotBar />
          <RadicalPool />
          <RoundSubmitPanel />
        </>
      ) : (
        <PCBRulesPanel />
      )}
    </div>
  );

  return (
    <>
      <GamePlayLayout infoPanel={infoPanel} stage={stage} sidePanel={sidePanel} />
      {showResult && result && (
        <PCBResultModal
          result={result}
          onClose={() => setShowResult(false)}
          onRestart={handleRestart}
        />
      )}
    </>
  );
}
