/**
 * Single source of truth for life-game difficulty parameters,
 * including timeout durations.
 *
 * The same values are consumed by:
 *   - API:  `getLifeGameMaxDurationMs(key)` and the dispatcher
 *           `getGameMaxDurationMs('life-game', key)` in
 *           `apps/api/src/games/attempt-timeout.ts` (used to invalidate
 *           timed-out attempts and refuse late region submissions).
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
export const LIFE_GAME_DIFFICULTIES = [
  {
    key: 'easy',
    label: '入门',
    targetRegionCount: 1,
    description: '推理 1 个目标区域 · 100 代以内稳定',
    maxDurationMs: 20 * 60 * 1000,
  },
  {
    key: 'normal',
    label: '标准',
    targetRegionCount: 2,
    description: '推理 2 个目标区域 · 100 代以内稳定',
    maxDurationMs: 40 * 60 * 1000,
  },
  {
    key: 'hard',
    label: '挑战',
    targetRegionCount: 3,
    description: '推理 3 个目标区域 · 100 代以内稳定',
    maxDurationMs: 60 * 60 * 1000,
  },
] as const;

export const LIFE_MAX_ERROR_COUNT = 100;

export function getLifeGameMaxDurationMs(difficultyKey: string): number {
  const difficulty = LIFE_GAME_DIFFICULTIES.find((d) => d.key === difficultyKey);
  if (!difficulty) {
    throw new Error(`Invalid life-game difficulty: ${difficultyKey}`);
  }
  return difficulty.maxDurationMs;
}
