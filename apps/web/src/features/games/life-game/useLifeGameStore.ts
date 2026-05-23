import { create } from 'zustand';
import type { SubmitLifeRegionResponse, GetLifeAttemptResponse } from '@brain-games/shared';
import {
  startLifeAttemptApi,
  startPlayingApi,
  submitLifeRegionApi,
  getLifeAttemptApi,
  getLifeAnswersApi,
  abandonLifeAttemptApi,
  timeoutAttemptApi,
} from '../api';
import { queryClient } from '../../../lib/query-client';

type Status =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'submitting'
  | 'completed'
  | 'abandoned'
  | 'timeout';

interface LifeBoardState {
  width: number;
  height: number;
  aliveCells: Array<{ x: number; y: number }>;
}

interface LocalCellCoord {
  x: number;
  y: number;
}

interface LifeGameStore {
  // State
  attemptId: string | null;
  status: Status;
  difficultyKey: string;
  initialState: LifeBoardState | null;
  targetRegionIds: number[];
  correctRegionIds: number[];
  errorCount: number;
  activeRegionId: number | null;
  answerDrafts: Record<number, LocalCellCoord[]>;
  startTime: number | null;
  elapsedMs: number;
  maxDurationMs: number;
  isRunning: boolean;
  result: SubmitLifeRegionResponse | null;
  error: string | null;
  submissions: Array<{ regionId: number; submittedAt: string; correct: boolean }>;
  answerHints: Record<number, LocalCellCoord[]>;

  // Actions
  startGame: (difficultyKey: string) => Promise<void>;
  setActiveRegion: (regionId: number) => void;
  toggleCell: (regionId: number, x: number, y: number) => void;
  submitRegion: (regionId: number) => Promise<void>;
  abandonGame: () => Promise<void>;
  restartGame: () => Promise<void>;
  recoverAttempt: (attemptId: string) => Promise<void>;
  showAnswer: (regionId: number) => Promise<void>;
  tick: () => void;
  timeoutGame: () => Promise<void>;
  reset: () => void;
}

function addOrRemoveCell(
  cells: LocalCellCoord[],
  x: number,
  y: number,
): LocalCellCoord[] {
  const idx = cells.findIndex((c) => c.x === x && c.y === y);
  if (idx >= 0) {
    return cells.filter((_, i) => i !== idx);
  }
  return [...cells, { x, y }];
}

export const useLifeGameStore = create<LifeGameStore>((set, get) => ({
  attemptId: null,
  status: 'idle',
  difficultyKey: '',
  initialState: null,
  targetRegionIds: [],
  correctRegionIds: [],
  errorCount: 0,
  activeRegionId: null,
  answerDrafts: {},
  startTime: null,
  elapsedMs: 0,
  maxDurationMs: 0,
  isRunning: false,
  result: null,
  error: null,
  submissions: [],
  answerHints: {},

  startGame: async (difficultyKey: string) => {
    set({ error: null, status: 'loading' });
    try {
      const res = await startLifeAttemptApi(difficultyKey);
      const initialState = res.initialState as unknown as LifeBoardState;
      const targetRegionIds = (res as any).targetRegionIds as number[];

      // Initialize empty drafts for each target region
      const answerDrafts: Record<number, LocalCellCoord[]> = {};
      for (const regionId of targetRegionIds) {
        answerDrafts[regionId] = [];
      }

      // Signal start-playing to server
      const playRes = await startPlayingApi('life-game', res.attemptId);

      set({
        attemptId: res.attemptId,
        difficultyKey,
        initialState,
        targetRegionIds,
        correctRegionIds: [],
        errorCount: 0,
        activeRegionId: targetRegionIds[0] || null,
        answerDrafts,
        startTime: new Date(playRes.startedAt).getTime(),
        elapsedMs: 0,
        maxDurationMs: res.maxDurationMs,
        isRunning: true,
        status: 'playing',
        result: null,
        submissions: [],
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to start game', status: 'idle' });
    }
  },

  setActiveRegion: (regionId: number) => {
    const state = get();
    if (state.correctRegionIds.includes(regionId)) return;
    set({ activeRegionId: regionId });
  },

  toggleCell: (regionId: number, x: number, y: number) => {
    const state = get();
    if (state.status !== 'playing') return;
    if (state.correctRegionIds.includes(regionId)) return;

    const draft = state.answerDrafts[regionId] || [];
    const newDraft = addOrRemoveCell(draft, x, y);
    set({
      answerDrafts: {
        ...state.answerDrafts,
        [regionId]: newDraft,
      },
    });
  },

  submitRegion: async (regionId: number) => {
    const state = get();
    if (!state.attemptId || state.status !== 'playing') return;

    const draft = state.answerDrafts[regionId] || [];
    set({ status: 'submitting', error: null });

    try {
      const res = await submitLifeRegionApi(state.attemptId, regionId, draft);

      const newCorrectRegionIds = res.correctRegionIds;
      const newErrorCount = res.errorCount;

      if (res.correct) {
        // Auto-advance to next unfinished region
        const nextRegion = state.targetRegionIds.find(
          (id) => !newCorrectRegionIds.includes(id),
        );

        set({
          correctRegionIds: newCorrectRegionIds,
          errorCount: newErrorCount,
          activeRegionId: nextRegion || state.activeRegionId,
          status: res.attemptCompleted ? 'completed' : 'playing',
          result: res.attemptCompleted ? res : null,
          submissions: [
            ...state.submissions,
            { regionId, submittedAt: new Date().toISOString(), correct: true },
          ],
          isRunning: res.attemptCompleted ? false : state.isRunning,
          elapsedMs: res.attemptCompleted && res.result?.durationMs
            ? res.result.durationMs
            : state.elapsedMs,
        });
        if (res.attemptCompleted) {
          queryClient.invalidateQueries({ queryKey: ['leaderboard-entries'] });
        }
      } else {
        set({
          errorCount: newErrorCount,
          error: '答案不正确，请重新检查',
          status: 'playing',
          submissions: [
            ...state.submissions,
            { regionId, submittedAt: new Date().toISOString(), correct: false },
          ],
        });
      }
    } catch (err: any) {
      if (err?.message === 'Attempt timed out') {
        set({
          status: 'timeout',
          isRunning: false,
          error: '已超时，挑战失败（不计入成绩）',
        });
        return;
      }
      set({
        error: err.message || '提交失败',
        status: 'playing',
      });
    }
  },

  abandonGame: async () => {
    const state = get();
    if (!state.attemptId) return;

    try {
      await abandonLifeAttemptApi(state.attemptId);
    } catch {
      // Ignore errors on abandon
    }

    set({ status: 'abandoned', isRunning: false });
  },

  restartGame: async () => {
    const state = get();
    if (state.attemptId) {
      try {
        await abandonLifeAttemptApi(state.attemptId);
      } catch {
        // Ignore
      }
    }

    // Restart with same difficulty
    get().startGame(state.difficultyKey);
  },

  recoverAttempt: async (attemptId: string) => {
    set({ error: null, status: 'loading' });
    try {
      const res = await getLifeAttemptApi(attemptId);
      const initialState = res.initialState as unknown as LifeBoardState;
      const targetRegionIds = res.targetRegionIds;
      const correctRegionIds = res.correctRegionIds;

      // Initialize drafts for non-correct regions
      const answerDrafts: Record<number, LocalCellCoord[]> = {};
      for (const regionId of targetRegionIds) {
        answerDrafts[regionId] = [];
      }

      // Find next unfinished region
      const nextRegion = targetRegionIds.find(
        (id) => !correctRegionIds.includes(id),
      );

      const isCompleted = res.status === 'COMPLETED';
      const isTimeout = res.status === 'INVALID';
      const serverDurationMs = (res.metrics as any)?.durationMs;
      const elapsedMs =
        isCompleted && serverDurationMs
          ? serverDurationMs
          : isTimeout
            ? res.maxDurationMs
            : Date.now() - new Date(res.startedAt).getTime();

      set({
        attemptId: res.attemptId,
        difficultyKey: res.difficultyKey,
        initialState,
        targetRegionIds,
        correctRegionIds,
        errorCount: res.errorCount,
        activeRegionId: nextRegion || targetRegionIds[0],
        answerDrafts,
        startTime: new Date(res.startedAt).getTime(),
        elapsedMs,
        maxDurationMs: res.maxDurationMs,
        isRunning: !isCompleted && !isTimeout && res.status === 'STARTED',
        status: isCompleted
          ? 'completed'
          : isTimeout
            ? 'timeout'
            : res.status === 'STARTED'
              ? 'playing'
              : 'abandoned',
        result: isCompleted && res.metrics
          ? {
              regionId: 0,
              correct: true,
              errorCount: res.errorCount,
              correctRegionIds,
              attemptCompleted: true,
              result: {
                durationMs: res.metrics.durationMs,
                errorCount: res.metrics.errorCount,
                targetRegionCount: res.metrics.targetRegionCount,
                personalBest: false,
              },
            }
          : null,
        submissions: res.submissions,
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to recover attempt', status: 'idle' });
    }
  },

  showAnswer: async (regionId: number) => {
    const state = get();
    if (!state.attemptId) return;
    if (state.answerHints[regionId]) {
      // Already fetched — toggle off
      const next = { ...state.answerHints };
      delete next[regionId];
      set({ answerHints: next });
      return;
    }
    try {
      const res = await getLifeAnswersApi(state.attemptId);
      const hintMap: Record<number, LocalCellCoord[]> = {};
      for (const a of res.answers) {
        hintMap[a.regionId] = a.aliveCells;
      }
      set({ answerHints: hintMap });
    } catch {
      // ignore
    }
  },

  tick: () => {
    const state = get();
    if (!state.isRunning || !state.startTime) return;
    const elapsedMs = Date.now() - state.startTime;
    if (state.maxDurationMs > 0 && elapsedMs >= state.maxDurationMs) {
      set({
        elapsedMs: state.maxDurationMs,
        isRunning: false,
      });
      void get().timeoutGame();
      return;
    }
    set({ elapsedMs });
  },

  timeoutGame: async () => {
    const state = get();
    if (!state.attemptId) return;
    try {
      await timeoutAttemptApi('life-game', state.attemptId);
    } catch {
      // no-op: timeout state should still be reflected locally
    } finally {
      set({
        status: 'timeout',
        isRunning: false,
        error: '已超时，挑战失败（不计入成绩）',
      });
    }
  },

  reset: () => {
    set({
      attemptId: null,
      status: 'idle',
      difficultyKey: '',
      initialState: null,
      targetRegionIds: [],
      correctRegionIds: [],
      errorCount: 0,
      activeRegionId: null,
      answerDrafts: {},
      startTime: null,
      elapsedMs: 0,
      maxDurationMs: 0,
      isRunning: false,
      result: null,
      error: null,
      submissions: [],
    });
  },
}));
