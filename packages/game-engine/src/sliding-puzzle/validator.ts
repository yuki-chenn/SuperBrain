import type { SlidingPuzzleState, ValidationResult } from './types.js';
import { replayMoves } from './engine.js';

/**
 * Per-board-size cap on the length of a submitted move trace.
 *
 * Acts as anti-cheat (bounds bot floods) and as a server-side replay
 * resource guard (each entry triggers one move replay). Numbers are
 * empirical "humanly plausible" upper bounds with ~10× headroom.
 *
 * Single source of truth — do NOT duplicate this map elsewhere.
 */
export const MAX_MOVES_LIMIT: Record<number, number> = {
  3: 2_000,
  4: 10_000,
  5: 30_000,
};

const FALLBACK_MAX_MOVES = 30_000;

export function validateSlidingPuzzleAttempt(input: {
  initialState: SlidingPuzzleState;
  moveTrace: number[];
  finalState: SlidingPuzzleState;
  size: number;
}): ValidationResult {
  const { initialState, moveTrace, finalState, size } = input;

  // Check finalState size
  if (finalState.size !== size) {
    return { valid: false, reason: 'FINAL_STATE_SIZE_MISMATCH' };
  }

  // Check board length
  if (finalState.board.length !== size * size) {
    return { valid: false, reason: 'FINAL_STATE_BOARD_LENGTH_MISMATCH' };
  }

  // Check moveTrace entries are positive integers
  for (let i = 0; i < moveTrace.length; i++) {
    if (!Number.isInteger(moveTrace[i]) || moveTrace[i] <= 0) {
      return { valid: false, reason: `INVALID_MOVE_AT_INDEX_${i}`, invalidMoveIndex: i };
    }
  }

  // Check max moves limit
  const maxMoves = MAX_MOVES_LIMIT[size] ?? FALLBACK_MAX_MOVES;
  if (moveTrace.length > maxMoves) {
    return { valid: false, reason: 'MAX_MOVES_EXCEEDED' };
  }

  // Replay moves
  const replayResult = replayMoves(initialState, moveTrace);

  if (!replayResult.valid) {
    return {
      valid: false,
      reason: replayResult.reason,
      invalidMoveIndex: replayResult.invalidMoveIndex,
    };
  }

  // Check final state matches
  const replayBoard = replayResult.finalState.board;
  const submittedBoard = finalState.board;
  for (let i = 0; i < replayBoard.length; i++) {
    if (replayBoard[i] !== submittedBoard[i]) {
      return { valid: false, reason: 'FINAL_STATE_MISMATCH' };
    }
  }

  return {
    valid: true,
    metrics: { moves: moveTrace.length },
  };
}
