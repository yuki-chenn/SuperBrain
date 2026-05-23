import { create } from 'zustand';
import { isSolved } from '@brain-games/game-engine';
import type { FinishAttemptResponse } from '@brain-games/shared';
import {
  startAttemptApi,
  startPlayingApi,
  finishAttemptApi,
  abandonAttemptApi,
  timeoutAttemptApi,
} from '../api';
import { queryClient } from '../../../lib/query-client';

type Status =
  | 'idle'
  | 'loading'
  | 'countdown'
  | 'playing'
  | 'completed'
  | 'submitting'
  | 'submitted'
  | 'abandoned'
  | 'timeout';

interface SlidingPuzzleStore {
  attemptId: string | null;
  board: number[];
  size: number;
  difficultyKey: string;
  moveTrace: number[];
  moves: number;
  startTime: number | null;
  elapsedMs: number;
  maxDurationMs: number;
  isRunning: boolean;
  countdownMs: number;
  status: Status;
  result: FinishAttemptResponse | null;
  error: string | null;

  startGame: (difficultyKey: string, enableCountdown?: boolean) => Promise<void>;
  countdownTick: () => void;
  beginPlaying: () => void;
  moveTileAction: (tile: number) => void;
  tick: () => void;
  reset: () => void;
  submitResult: () => Promise<void>;
  abandonGame: () => Promise<void>;
  timeoutGame: () => Promise<void>;
}

export const useSlidingPuzzleStore = create<SlidingPuzzleStore>((set, get) => ({
  attemptId: null,
  board: [],
  size: 0,
  difficultyKey: '',
  moveTrace: [],
  moves: 0,
  startTime: null,
  elapsedMs: 0,
  maxDurationMs: 0,
  isRunning: false,
  countdownMs: 5000,
  status: 'idle',
  result: null,
  error: null,

  startGame: async (difficultyKey: string, enableCountdown = true) => {
    set({ error: null, status: 'loading' });
    try {
      const res = await startAttemptApi('sliding-puzzle', difficultyKey);
      const state = res.initialState;
      set({
        attemptId: res.attemptId,
        board: state.board,
        size: state.size,
        difficultyKey,
        moveTrace: [],
        moves: 0,
        startTime: null,
        elapsedMs: 0,
        maxDurationMs: res.maxDurationMs,
        isRunning: false,
        countdownMs: 5000,
        status: enableCountdown ? 'countdown' : 'playing',
        result: null,
      });
      // If no countdown, signal start-playing immediately
      if (!enableCountdown) {
        const playRes = await startPlayingApi('sliding-puzzle', res.attemptId);
        set({ startTime: new Date(playRes.startedAt).getTime(), isRunning: true });
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to start game' });
    }
  },

  countdownTick: () => {
    const state = get();
    if (state.status !== 'countdown') return;
    const newMs = state.countdownMs - 100;
    if (newMs <= 0) {
      set({ countdownMs: 0, status: 'playing' });
      // Signal start-playing to server
      if (state.attemptId) {
        startPlayingApi('sliding-puzzle', state.attemptId).then((res) => {
          set({ startTime: new Date(res.startedAt).getTime(), isRunning: true });
        });
      }
    } else {
      set({ countdownMs: newMs });
    }
  },

  beginPlaying: async () => {
    const state = get();
    set({ status: 'playing', countdownMs: 0 });
    if (state.attemptId) {
      const res = await startPlayingApi('sliding-puzzle', state.attemptId);
      set({ startTime: new Date(res.startedAt).getTime(), isRunning: true });
    }
  },

  moveTileAction: (tile: number) => {
    const state = get();
    if (state.status !== 'playing') return;

    const { size, board } = state;
    const blankIdx = board.indexOf(0);
    const tileIdx = board.indexOf(tile);
    if (tileIdx === -1 || blankIdx === -1) return;

    const blankRow = Math.floor(blankIdx / size);
    const blankCol = blankIdx % size;
    const tileRow = Math.floor(tileIdx / size);
    const tileCol = tileIdx % size;

    // Must be in same row or same column
    if (blankRow !== tileRow && blankCol !== tileCol) return;

    // Collect all tiles between the clicked tile and the blank
    const tilesToMove: number[] = [];
    if (blankRow === tileRow) {
      // Same row - horizontal slide
      const step = tileCol > blankCol ? 1 : -1;
      for (let c = blankCol + step; c !== tileCol + step; c += step) {
        const idx = blankRow * size + c;
        if (board[idx] !== 0) tilesToMove.push(board[idx]);
      }
    } else {
      // Same column - vertical slide
      const step = tileRow > blankRow ? 1 : -1;
      for (let r = blankRow + step; r !== tileRow + step; r += step) {
        const idx = r * size + blankCol;
        if (board[idx] !== 0) tilesToMove.push(board[idx]);
      }
    }

    if (tilesToMove.length === 0) return;

    // Apply all moves: each tile slides toward the blank
    let currentBoard = [...board];
    const newTrace = [...state.moveTrace];
    let currentBlank = blankIdx;

    for (const t of tilesToMove) {
      const tIdx = currentBoard.indexOf(t);
      currentBoard[currentBlank] = t;
      currentBoard[tIdx] = 0;
      newTrace.push(t);
      currentBlank = tIdx;
    }

    const newMoves = state.moves + tilesToMove.length;

    if (isSolved({ size, board: currentBoard })) {
      set({
        board: currentBoard,
        moveTrace: newTrace,
        moves: newMoves,
        isRunning: false,
        elapsedMs: Date.now() - (state.startTime || Date.now()),
        status: 'completed',
      });
      get().submitResult();
    } else {
      set({
        board: currentBoard,
        moveTrace: newTrace,
        moves: newMoves,
      });
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

  reset: () => {
    set({
      attemptId: null,
      board: [],
      size: 0,
      difficultyKey: '',
      moveTrace: [],
      moves: 0,
      startTime: null,
      elapsedMs: 0,
      maxDurationMs: 0,
      isRunning: false,
      countdownMs: 5000,
      status: 'idle',
      result: null,
      error: null,
    });
  },

  submitResult: async () => {
    const state = get();
    if (!state.attemptId) return;
    set({ status: 'submitting' });
    try {
      const result = await finishAttemptApi('sliding-puzzle', state.attemptId, {
        finalState: { size: state.size, board: state.board },
        moveTrace: state.moveTrace,
        clientDurationMs: state.elapsedMs,
      });
      if (result.status === 'INVALID' && result.reason === 'TIMEOUT') {
        set({
          status: 'timeout',
          result: null,
          error: '已超时，挑战失败（不计入成绩）',
          isRunning: false,
        });
        return;
      }
      // Use server-calculated duration
      const serverDuration = (result.metrics as any)?.durationMs;
      set({
        status: 'submitted',
        result,
        elapsedMs: serverDuration ?? state.elapsedMs,
      });
      queryClient.invalidateQueries({ queryKey: ['leaderboard-entries'] });
    } catch (err: any) {
      set({ status: 'completed', error: err.message || 'Failed to submit' });
    }
  },

  abandonGame: async () => {
    const state = get();
    if (!state.attemptId) return;
    try {
      await abandonAttemptApi('sliding-puzzle', state.attemptId);
    } finally {
      set({
        status: 'abandoned',
        isRunning: false,
      });
    }
  },

  timeoutGame: async () => {
    const state = get();
    if (!state.attemptId) return;
    try {
      await timeoutAttemptApi('sliding-puzzle', state.attemptId);
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
}));
