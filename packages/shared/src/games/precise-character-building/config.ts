/**
 * Single source of truth for precise-character-building difficulty
 * parameters, including timeout durations.
 *
 * The same values are consumed by:
 *   - API:  `getPCBMaxDurationMs(key)` and the dispatcher
 *           `getGameMaxDurationMs('precise-character-building', key)` in
 *           `apps/api/src/games/attempt-timeout.ts` (used to invalidate
 *           timed-out attempts and refuse late round submissions).
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
export const PRECISE_CHARACTER_BUILDING_DIFFICULTIES = [
  {
    key: 'easy',
    label: '入门',
    boardSize: 6,
    picksPerRound: 4,
    radicalPoolSize: 6,
    maxDurationMs: 20 * 60 * 1000,
    adjacencyMode: 'ORTHOGONAL_4',
    allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM'],
    rootComplexity: 'LOW',
  },
  {
    key: 'normal',
    label: '标准',
    boardSize: 6,
    picksPerRound: 4,
    radicalPoolSize: 6,
    maxDurationMs: 40 * 60 * 1000,
    adjacencyMode: 'ORTHOGONAL_4',
    allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM', 'SEMI_SURROUND'],
    rootComplexity: 'MEDIUM',
    recommended: true,
  },
  {
    key: 'hard',
    label: '挑战',
    boardSize: 6,
    picksPerRound: 4,
    radicalPoolSize: 6,
    maxDurationMs: 60 * 60 * 1000,
    adjacencyMode: 'ORTHOGONAL_4',
    allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM', 'SEMI_SURROUND', 'SURROUND'],
    rootComplexity: 'HIGH',
  },
] as const;

export const PCB_MAX_ERROR_COUNT = 100;

export function getPCBMaxDurationMs(difficultyKey: string): number {
  const difficulty = PRECISE_CHARACTER_BUILDING_DIFFICULTIES.find(
    (d) => d.key === difficultyKey,
  );
  if (!difficulty) {
    throw new Error(`Invalid precise-character-building difficulty: ${difficultyKey}`);
  }
  return difficulty.maxDurationMs;
}
