import { create } from 'zustand';
import type {
  AbsoluteCommandDirection,
  AbsoluteCommandRuntimeState,
} from '@brain-games/game-engine';
import type { ExecuteAbsoluteCommandResponse } from '@brain-games/shared';
import {
  startACAttemptApi,
  executeACCommandApi,
  undoACCommandApi,
  resetACAttemptApi,
  abandonACAttemptApi,
  getACAttemptApi,
} from './api';
import { queryClient } from '../../../lib/query-client';

type Status =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'animating'
  | 'completed'
  | 'abandoned';

interface PuzzleInfo {
  id: string;
  slug: string;
  title: string;
  version: number;
  size: { width: number; height: number; depth: number };
  startCoord: { x: number; y: number; z: number };
  cells: any[];
}

interface ACStore {
  attemptId: string | null;
  puzzle: PuzzleInfo | null;
  state: AbsoluteCommandRuntimeState | null;
  status: Status;
  result: ExecuteAbsoluteCommandResponse['result'] | null;
  error: string | null;
  animatingPath: { x: number; y: number; z: number }[] | null;
  animatingIndex: number;
  animatingCoord: { x: number; y: number; z: number } | null;

  startGame: (puzzleId: string) => Promise<void>;
  resumeAttempt: (attemptId: string) => Promise<void>;
  executeCommand: (direction: AbsoluteCommandDirection) => Promise<void>;
  undo: () => Promise<void>;
  reset: () => Promise<void>;
  abandonGame: () => Promise<void>;
  resetStore: () => void;
}

const INITIAL = {
  attemptId: null as string | null,
  puzzle: null as PuzzleInfo | null,
  state: null as AbsoluteCommandRuntimeState | null,
  status: 'idle' as Status,
  result: null as ExecuteAbsoluteCommandResponse['result'] | null,
  error: null as string | null,
  animatingPath: null as { x: number; y: number; z: number }[] | null,
  animatingIndex: 0,
  animatingCoord: null as { x: number; y: number; z: number } | null,
};

export const useAbsoluteCommandStore = create<ACStore>((set, get) => ({
  ...INITIAL as any,

  startGame: async (puzzleId: string) => {
    set({ error: null, status: 'loading' });
    try {
      const res = await startACAttemptApi(puzzleId);
      set({
        attemptId: res.attemptId,
        puzzle: res.puzzle as PuzzleInfo,
        state: res.state as AbsoluteCommandRuntimeState,
        status: 'playing',
        result: null,
        animatingPath: null,
        animatingIndex: 0,
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to start', status: 'idle' });
    }
  },

  resumeAttempt: async (attemptId: string) => {
    set({ error: null, status: 'loading' });
    try {
      const res = await getACAttemptApi(attemptId);
      if (res.status === 'COMPLETED' || res.status === 'FAILED') {
        set({ status: 'idle', error: 'Attempt is no longer active' });
        return;
      }
      set({
        attemptId: res.attemptId,
        puzzle: res.puzzle as PuzzleInfo,
        state: res.state as AbsoluteCommandRuntimeState,
        status: 'playing',
        result: null,
        animatingPath: null,
        animatingIndex: 0,
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to resume', status: 'idle' });
    }
  },

  executeCommand: async (direction: AbsoluteCommandDirection) => {
    const state = get();
    if (state.status !== 'playing' || !state.attemptId) return;

    set({ status: 'animating' });
    try {
      const res = await executeACCommandApi(state.attemptId, direction);

      if (!res.moved) {
        set({ status: 'playing', error: '该方向无法移动' });
        setTimeout(() => set({ error: null }), 2000);
        return;
      }

      // Animate the path
      if (res.commandResult?.path && res.commandResult.path.length > 0) {
        const path = res.commandResult.path;
        set({ animatingPath: path, animatingIndex: 0, animatingCoord: path[0] });

        for (let i = 0; i < path.length; i++) {
          await new Promise((r) => setTimeout(r, Math.min(80, 700 / path.length)));
          set({ animatingIndex: i + 1, animatingCoord: path[i] });
        }

        await new Promise((r) => setTimeout(r, 50));
      }

      set({
        state: res.state as AbsoluteCommandRuntimeState,
        animatingPath: null,
        animatingIndex: 0,
        animatingCoord: null,
        result: res.result || null,
        status: res.completed ? 'completed' : 'playing',
      });

      if (res.completed) {
        queryClient.invalidateQueries({ queryKey: ['ac-leaderboard'] });
      }
    } catch (err: any) {
      set({ status: 'playing', error: err.message || 'Command failed' });
    }
  },

  undo: async () => {
    const state = get();
    if (state.status !== 'playing' || !state.attemptId) return;

    try {
      const res = await undoACCommandApi(state.attemptId);
      set({ state: res.state as AbsoluteCommandRuntimeState });
    } catch (err: any) {
      set({ error: err.message || 'Undo failed' });
      setTimeout(() => set({ error: null }), 2000);
    }
  },

  reset: async () => {
    const state = get();
    if (!state.attemptId) return;
    if (state.status !== 'playing' && state.status !== 'completed') return;

    try {
      const res = await resetACAttemptApi(state.attemptId);
      set({
        state: res.state as AbsoluteCommandRuntimeState,
        status: 'playing',
        result: null,
        animatingPath: null,
        animatingIndex: 0,
      });
    } catch (err: any) {
      set({ error: err.message || 'Reset failed' });
    }
  },

  abandonGame: async () => {
    const state = get();
    if (!state.attemptId) return;
    try {
      await abandonACAttemptApi(state.attemptId);
    } finally {
      set({ status: 'abandoned' });
    }
  },

  resetStore: () => {
    set({ ...INITIAL } as any);
  },
}));
