/**
 * Single source of truth for sliding-puzzle difficulty parameters,
 * including timeout durations.
 *
 * The same values are consumed by:
 *   - API:  `getSlidingPuzzleMaxDurationMs(key)` and the dispatcher
 *           `getGameMaxDurationMs('sliding-puzzle', key)` in
 *           `apps/api/src/games/attempt-timeout.ts` (used to invalidate
 *           timed-out attempts and refuse late submissions).
 *   - Web:  the `startAttempt` response carries `maxDurationMs` from the
 *           server, which the play page surfaces in the difficulty
 *           selector and uses to drive the timeout-trigger inside the
 *           Zustand store.
 *
 * To change a timeout, edit the `maxDurationMs` field below and rebuild
 * the shared package so both apps pick up the new value:
 *
 *     pnpm --filter @brain-games/shared build
 *
 * No database migration is required — these values are read at runtime
 * from this constant, not from `Game.difficultyLevels`.
 */
export const SLIDING_PUZZLE_DIFFICULTIES = [
  { key: 'easy', label: '3x3', size: 3, scrambleMoves: 60, maxDurationMs: 10 * 60 * 1000 },
  { key: 'normal', label: '4x4', size: 4, scrambleMoves: 160, maxDurationMs: 15 * 60 * 1000 },
  { key: 'hard', label: '5x5', size: 5, scrambleMoves: 300, maxDurationMs: 20 * 60 * 1000 },
] as const;

export function getSlidingPuzzleMaxDurationMs(difficultyKey: string): number {
  const difficulty = SLIDING_PUZZLE_DIFFICULTIES.find((d) => d.key === difficultyKey);
  if (!difficulty) {
    throw new Error(`Invalid sliding-puzzle difficulty: ${difficultyKey}`);
  }
  return difficulty.maxDurationMs;
}

// `MAX_MOVES_LIMIT` previously also lived here as duplicate dead code.
// It has moved to its single source of truth in
// `@brain-games/game-engine` (see `packages/game-engine/src/sliding-puzzle/validator.ts`).
// Import it from there if you need it.
