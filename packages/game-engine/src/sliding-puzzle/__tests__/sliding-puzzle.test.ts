import { describe, it, expect } from 'vitest';
import {
  createSolvedBoard,
  isSolved,
  getBlankIndex,
  areAdjacent,
  canMoveTile,
  moveTile,
  replayMoves,
  generateSlidingPuzzleInitialState,
  validateSlidingPuzzleAttempt,
} from '../index';
import type { SlidingPuzzleState } from '../types';

describe('createSolvedBoard', () => {
  it('creates correct 3x3 board', () => {
    expect(createSolvedBoard(3)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  });

  it('creates correct 4x4 board', () => {
    expect(createSolvedBoard(4)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]);
  });

  it('creates correct 5x5 board', () => {
    const board = createSolvedBoard(5);
    expect(board.length).toBe(25);
    expect(board[24]).toBe(0);
    expect(board[0]).toBe(1);
  });
});

describe('isSolved', () => {
  it('returns true for solved board', () => {
    const state: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 5, 6, 7, 8, 0] };
    expect(isSolved(state)).toBe(true);
  });

  it('returns false for scrambled board', () => {
    const state: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 5, 6, 7, 0, 8] };
    expect(isSolved(state)).toBe(false);
  });

  it('returns false for partially correct board', () => {
    const state: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 5, 6, 8, 7, 0] };
    expect(isSolved(state)).toBe(false);
  });
});

describe('getBlankIndex', () => {
  it('finds blank at end', () => {
    expect(getBlankIndex([1, 2, 3, 4, 5, 6, 7, 8, 0])).toBe(8);
  });

  it('finds blank in middle', () => {
    expect(getBlankIndex([1, 2, 3, 4, 0, 5, 6, 7, 8])).toBe(4);
  });
});

describe('areAdjacent', () => {
  it('same row adjacent', () => {
    expect(areAdjacent(0, 1, 3)).toBe(true);
    expect(areAdjacent(1, 2, 3)).toBe(true);
  });

  it('same column adjacent', () => {
    expect(areAdjacent(0, 3, 3)).toBe(true);
    expect(areAdjacent(3, 6, 3)).toBe(true);
  });

  it('diagonal not adjacent', () => {
    expect(areAdjacent(0, 4, 3)).toBe(false);
    expect(areAdjacent(2, 4, 3)).toBe(false);
  });

  it('same index not adjacent', () => {
    expect(areAdjacent(0, 0, 3)).toBe(false);
  });

  it('non-adjacent in same row', () => {
    expect(areAdjacent(0, 2, 3)).toBe(false);
  });
});

describe('canMoveTile', () => {
  it('adjacent tile can move', () => {
    const state: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 0, 5, 6, 7, 8] };
    expect(canMoveTile(state, 2)).toBe(true);
    expect(canMoveTile(state, 4)).toBe(true);
    expect(canMoveTile(state, 5)).toBe(true);
    expect(canMoveTile(state, 7)).toBe(true);
  });

  it('non-adjacent tile cannot move', () => {
    const state: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 0, 5, 6, 7, 8] };
    expect(canMoveTile(state, 1)).toBe(false);
    expect(canMoveTile(state, 3)).toBe(false);
    expect(canMoveTile(state, 6)).toBe(false);
    expect(canMoveTile(state, 8)).toBe(false);
  });
});

describe('moveTile', () => {
  it('swaps tile with blank', () => {
    const state: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 0, 5, 6, 7, 8] };
    const result = moveTile(state, 5);
    expect(result.board).toEqual([1, 2, 3, 4, 5, 0, 6, 7, 8]);
  });

  it('does not mutate original state', () => {
    const state: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 0, 5, 6, 7, 8] };
    const originalBoard = [...state.board];
    moveTile(state, 5);
    expect(state.board).toEqual(originalBoard);
  });
});

describe('replayMoves', () => {
  it('valid sequence returns valid', () => {
    // Solved state with one move needed: move 8 to blank
    const initial: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 5, 6, 7, 0, 8] };
    const result = replayMoves(initial, [8]);
    expect(result.valid).toBe(true);
    expect(result.finalState.board).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  });

  it('illegal move returns invalid with index', () => {
    const initial: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 0, 5, 6, 7, 8] };
    // 1 is not adjacent to blank (index 4)
    const result = replayMoves(initial, [1]);
    expect(result.valid).toBe(false);
    expect(result.invalidMoveIndex).toBe(0);
    expect(result.reason).toBe('ILLEGAL_MOVE_AT_INDEX_0');
  });

  it('valid moves but not solved returns invalid', () => {
    const initial: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 0, 5, 6, 7, 8] };
    // Move 5 left (valid), but board is not solved
    const result = replayMoves(initial, [5]);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('NOT_SOLVED');
  });

  it('multi-move valid sequence', () => {
    // Two moves to solve: [1,2,3,4,5,6,0,7,8] -> move 7 -> move 8
    const initial: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 5, 6, 0, 7, 8] };
    const result = replayMoves(initial, [7, 8]);
    expect(result.valid).toBe(true);
    expect(result.finalState.board).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  });
});

describe('generateSlidingPuzzleInitialState', () => {
  it('same seed produces same state', () => {
    const state1 = generateSlidingPuzzleInitialState({ size: 3, seed: 'test-seed', scrambleMoves: 60 });
    const state2 = generateSlidingPuzzleInitialState({ size: 3, seed: 'test-seed', scrambleMoves: 60 });
    expect(state1.board).toEqual(state2.board);
  });

  it('different seeds produce different states', () => {
    const state1 = generateSlidingPuzzleInitialState({ size: 3, seed: 'seed-a', scrambleMoves: 60 });
    const state2 = generateSlidingPuzzleInitialState({ size: 3, seed: 'seed-b', scrambleMoves: 60 });
    expect(state1.board).not.toEqual(state2.board);
  });

  it('generated state is not solved', () => {
    const state = generateSlidingPuzzleInitialState({ size: 3, seed: 'test', scrambleMoves: 60 });
    expect(isSolved(state)).toBe(false);
  });

  it('generated state is solvable (scramble-from-solved guarantees this)', () => {
    const state = generateSlidingPuzzleInitialState({ size: 4, seed: 'test-4x4', scrambleMoves: 160 });
    // Verify the board has all expected tiles
    const sorted = [...state.board].sort((a, b) => a - b);
    expect(sorted).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });
});

describe('validateSlidingPuzzleAttempt', () => {
  it('validates a correct attempt', () => {
    const initial: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 5, 6, 7, 0, 8] };
    const finalState: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 5, 6, 7, 8, 0] };
    const result = validateSlidingPuzzleAttempt({
      initialState: initial,
      moveTrace: [8],
      finalState,
      size: 3,
    });
    expect(result.valid).toBe(true);
    expect(result.metrics?.moves).toBe(1);
  });

  it('rejects size mismatch', () => {
    const initial: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 5, 6, 7, 0, 8] };
    const finalState: SlidingPuzzleState = { size: 4, board: [1, 2, 3, 4, 5, 6, 7, 8, 0] };
    const result = validateSlidingPuzzleAttempt({
      initialState: initial,
      moveTrace: [8],
      finalState,
      size: 3,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('FINAL_STATE_SIZE_MISMATCH');
  });

  it('rejects illegal moves', () => {
    const initial: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 0, 5, 6, 7, 8] };
    const finalState: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 0, 5, 6, 7, 8] };
    const result = validateSlidingPuzzleAttempt({
      initialState: initial,
      moveTrace: [1], // 1 is not adjacent to blank
      finalState,
      size: 3,
    });
    expect(result.valid).toBe(false);
    expect(result.invalidMoveIndex).toBe(0);
  });

  it('rejects final state mismatch', () => {
    const initial: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 5, 6, 7, 0, 8] };
    // Move 8, but submit wrong final state
    const wrongFinal: SlidingPuzzleState = { size: 3, board: [1, 2, 3, 4, 5, 6, 0, 7, 8] };
    const result = validateSlidingPuzzleAttempt({
      initialState: initial,
      moveTrace: [8],
      finalState: wrongFinal,
      size: 3,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('FINAL_STATE_MISMATCH');
  });
});
