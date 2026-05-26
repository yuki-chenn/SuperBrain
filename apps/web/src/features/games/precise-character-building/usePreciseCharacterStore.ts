import { create } from 'zustand';
import {
  startPCBAttemptApi,
  submitPCBRoundApi,
  getPCBAttemptApi,
  abandonPCBAttemptApi,
  resetPCBAttemptApi,
  timeoutAttemptApi,
} from '../api';
import type {
  Radical,
  CharacterCell,
  PuzzleConfig,
} from '@brain-games/shared';

export type PCBStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'submitting'
  | 'completed'
  | 'abandoned'
  | 'timeout';

export interface LitResult {
  cellIndex: number;
  radicalKey: string;
  resultChar: string;
}

interface PCBStore {
  status: PCBStatus;
  attemptId: string | null;
  difficultyKey: string;
  cells: CharacterCell[];
  radicalPool: Radical[];
  config: PuzzleConfig | null;
  currentRoundIndex: number;
  currentPosition: { row: number; col: number } | null;
  litCellIndices: number[];
  disabledRadicalKeys: string[];
  errorCount: number;
  litResults: LitResult[];
  selectedRadicalKeys: (string | null)[];
  selectedCellIndices: number[];
  elapsedMs: number;
  startTime: number | null;
  maxDurationMs: number;
  result: {
    durationMs: number;
    errorCount: number;
    rounds: number;
    litCells: number;
    personalBest: boolean;
  } | null;

  // Actions
  startGame: (difficultyKey: string) => Promise<void>;
  selectRadical: (key: string) => void;
  clearRadicalSlot: (index: number) => void;
  selectCell: (index: number) => void;
  clearCellSlot: (index: number) => void;
  submitRound: () => Promise<void>;
  tick: () => void;
  reset: () => void;
  recoverAttempt: (attemptId: string) => Promise<void>;
  abandonGame: () => Promise<void>;
  resetBoard: () => Promise<void>;
  timeoutGame: () => Promise<void>;
}

export const usePreciseCharacterStore = create<PCBStore>((set, get) => ({
  status: 'idle',
  attemptId: null,
  difficultyKey: 'normal',
  cells: [],
  radicalPool: [],
  config: null,
  currentRoundIndex: 0,
  currentPosition: null,
  litCellIndices: [],
  disabledRadicalKeys: [],
  errorCount: 0,
  litResults: [],
  selectedRadicalKeys: [],
  selectedCellIndices: [],
  elapsedMs: 0,
  startTime: null,
  maxDurationMs: 0,
  result: null,

  startGame: async (difficultyKey: string) => {
    set({ status: 'loading', difficultyKey });
    try {
      const res = await startPCBAttemptApi(difficultyKey);
      const picks = (res.config as PuzzleConfig).picksPerRound;
        set({
          status: 'playing',
          attemptId: res.attemptId,
          cells: res.cells as CharacterCell[],
          radicalPool: res.radicalPool as Radical[],
          config: res.config as PuzzleConfig,
        currentRoundIndex: res.state.currentRoundIndex,
        currentPosition: res.state.currentPosition,
        litCellIndices: res.state.litCellIndices,
        disabledRadicalKeys: res.state.disabledRadicalKeys,
        errorCount: res.state.errorCount,
          litResults: [],
          selectedRadicalKeys: Array.from({ length: picks }, () => null),
          selectedCellIndices: [],
          elapsedMs: 0,
          startTime: new Date(res.startedAt).getTime(),
          maxDurationMs: res.maxDurationMs,
          result: null,
        });
      } catch {
        set({ status: 'idle' });
      }
  },

  selectRadical: (key: string) => {
    const { selectedRadicalKeys, config, disabledRadicalKeys } = get();
    if (!config) return;
    if (disabledRadicalKeys.includes(key)) return;

    const updated = [...selectedRadicalKeys];
    // Fill the first empty slot. If none, replace the last slot (matching old
    // overwrite-tail behavior) so users can still re-pick after the row is full.
    const emptyAt = updated.findIndex((k) => k === null);
    if (emptyAt >= 0) {
      updated[emptyAt] = key;
    } else if (updated.length > 0) {
      updated[updated.length - 1] = key;
    }
    set({ selectedRadicalKeys: updated });
  },

  clearRadicalSlot: (index: number) => {
    const { selectedRadicalKeys } = get();
    if (index < 0 || index >= selectedRadicalKeys.length) return;
    // Leave a hole at `index` instead of shifting later slots forward, so the
    // visual mapping between radical slot N and cell N stays stable across
    // edits. Subsequent picks fill the leftmost hole (see selectRadical).
    const updated = [...selectedRadicalKeys];
    updated[index] = null;
    set({ selectedRadicalKeys: updated });
  },

  selectCell: (index: number) => {
    const { selectedCellIndices, litCellIndices, config, currentPosition } = get();
    if (!config) return;
    if (litCellIndices.includes(index)) return;

    const existedAt = selectedCellIndices.indexOf(index);
    if (existedAt >= 0) {
      set({ selectedCellIndices: selectedCellIndices.slice(0, existedAt) });
      return;
    }

    const picksPerRound = config.picksPerRound;
    if (selectedCellIndices.length >= picksPerRound) return;

    // Basic adjacency check for UI feedback (full validation on server)
    if (selectedCellIndices.length > 0) {
      const lastIdx = selectedCellIndices[selectedCellIndices.length - 1];
      const lastRow = Math.floor(lastIdx / 6);
      const lastCol = lastIdx % 6;
      const newRow = Math.floor(index / 6);
      const newCol = index % 6;
      const dr = Math.abs(lastRow - newRow);
      const dc = Math.abs(lastCol - newCol);
      if (config.adjacencyMode === 'KING_8') {
        if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) return;
      } else {
        if (dr + dc !== 1) return;
      }
    } else if (currentPosition) {
      const newRow = Math.floor(index / 6);
      const newCol = index % 6;
      const dr = Math.abs(currentPosition.row - newRow);
      const dc = Math.abs(currentPosition.col - newCol);
      if (config.adjacencyMode === 'KING_8') {
        if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) return;
      } else {
        if (dr + dc !== 1) return;
      }
    }

    set({ selectedCellIndices: [...selectedCellIndices, index] });
  },

  clearCellSlot: (index: number) => {
    const { selectedCellIndices } = get();
    const updated = selectedCellIndices.filter((_, i) => i !== index);
    set({ selectedCellIndices: updated });
  },

  submitRound: async () => {
    const { attemptId, selectedRadicalKeys, selectedCellIndices, config } = get();
    if (!attemptId || !config) return;
    // Reject submission if any radical slot is empty (null).
    const filledRadicalKeys = selectedRadicalKeys.filter((k): k is string => k !== null);
    if (filledRadicalKeys.length !== config.picksPerRound) return;
    if (selectedCellIndices.length !== config.picksPerRound) return;

    set({ status: 'submitting' });
    try {
      const res = await submitPCBRoundApi(attemptId, filledRadicalKeys, selectedCellIndices);

      if (res.correct) {
        const newLitResults: LitResult[] = [
          ...get().litResults,
          ...res.roundResult!.selectedCellIndices.map((ci: number, i: number) => ({
            cellIndex: ci,
            radicalKey: res.roundResult!.selectedRadicalKeys[i],
            resultChar: res.roundResult!.resultChars[i],
          })),
        ];

        set({
          status: res.attemptCompleted ? 'completed' : 'playing',
          currentRoundIndex: res.state.currentRoundIndex,
          currentPosition: res.state.currentPosition,
          litCellIndices: res.state.litCellIndices,
          disabledRadicalKeys: res.state.disabledRadicalKeys,
          errorCount: res.errorCount,
          litResults: newLitResults,
          selectedRadicalKeys: Array.from({ length: config.picksPerRound }, () => null),
          selectedCellIndices: [],
          result: res.result || null,
        });
      } else {
        set({
          status: 'playing',
          errorCount: res.errorCount,
        });
      }
    } catch (err: any) {
      if (err?.message === 'Attempt timed out') {
        set({ status: 'timeout' });
        return;
      }
      set({ status: 'playing' });
    }
  },

  tick: () => {
    const { startTime, maxDurationMs } = get();
    if (startTime) {
      const elapsedMs = Date.now() - startTime;
      if (maxDurationMs > 0 && elapsedMs >= maxDurationMs) {
        set({
          elapsedMs: maxDurationMs,
          status: 'timeout',
        });
        void get().timeoutGame();
        return;
      }
      set({ elapsedMs });
    }
  },

  reset: () => {
    set({
      status: 'idle',
      attemptId: null,
      cells: [],
      radicalPool: [],
      config: null,
      currentRoundIndex: 0,
      currentPosition: null,
      litCellIndices: [],
      disabledRadicalKeys: [],
      errorCount: 0,
      litResults: [],
      selectedRadicalKeys: [],
      selectedCellIndices: [],
      elapsedMs: 0,
      startTime: null,
      maxDurationMs: 0,
      result: null,
    });
  },

  recoverAttempt: async (attemptId: string) => {
    set({ status: 'loading' });
    try {
      const res = await getPCBAttemptApi(attemptId);
      const recoveredStatus: PCBStatus =
        res.status === 'STARTED'
          ? 'playing'
          : res.status === 'COMPLETED'
            ? 'completed'
            : res.status === 'INVALID'
              ? 'timeout'
            : res.status === 'ABANDONED'
              ? 'abandoned'
              : 'idle';

      const recoveredResult = res.metrics
        ? { ...res.metrics, personalBest: false }
        : null;

      const picks = (res.config as PuzzleConfig).picksPerRound;
      set({
        status: recoveredStatus,
        attemptId: res.attemptId,
        difficultyKey: res.difficultyKey,
        cells: res.cells as CharacterCell[],
        radicalPool: res.radicalPool as Radical[],
        config: res.config as PuzzleConfig,
        currentRoundIndex: res.state.currentRoundIndex,
        currentPosition: res.state.currentPosition,
        litCellIndices: res.state.litCellIndices,
        disabledRadicalKeys: res.state.disabledRadicalKeys,
        errorCount: res.state.errorCount,
        litResults: res.litResults as LitResult[],
        selectedRadicalKeys: Array.from({ length: picks }, () => null),
        selectedCellIndices: [],
        elapsedMs: res.status === 'INVALID' ? res.maxDurationMs : recoveredResult?.durationMs ?? 0,
        startTime: res.status === 'STARTED' ? new Date(res.startedAt).getTime() : null,
        maxDurationMs: res.maxDurationMs,
        result: recoveredResult,
      });
    } catch {
      set({ status: 'idle' });
    }
  },

  abandonGame: async () => {
    const { attemptId } = get();
    if (!attemptId) return;
    try {
      await abandonPCBAttemptApi(attemptId);
    } finally {
      set({ status: 'abandoned' });
    }
  },

  resetBoard: async () => {
    const { attemptId, status, config } = get();
    if (!attemptId) return;
    if (!(status === 'playing' || status === 'submitting')) return;

    set({ status: 'submitting' });
    try {
      const res = await resetPCBAttemptApi(attemptId);
      const picks = config?.picksPerRound ?? 4;
      set({
        status: 'playing',
        currentRoundIndex: res.state.currentRoundIndex,
        currentPosition: res.state.currentPosition,
        litCellIndices: res.state.litCellIndices,
        disabledRadicalKeys: res.state.disabledRadicalKeys,
        errorCount: res.state.errorCount,
        litResults: [],
        selectedRadicalKeys: Array.from({ length: picks }, () => null),
        selectedCellIndices: [],
        result: null,
      });
    } catch {
      set({ status: 'playing' });
    }
  },

  timeoutGame: async () => {
    const { attemptId } = get();
    if (!attemptId) return;
    try {
      await timeoutAttemptApi('precise-character-building', attemptId);
    } catch {
      // no-op: timeout state should still be reflected locally
    } finally {
      set({
        status: 'timeout',
      });
    }
  },
}));
