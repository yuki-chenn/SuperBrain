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
export declare const LIFE_GAME_DIFFICULTIES: readonly [{
    readonly key: "easy";
    readonly label: "入门";
    readonly targetRegionCount: 1;
    readonly description: "推理 1 个目标区域 · 100 代以内稳定";
    readonly maxDurationMs: number;
}, {
    readonly key: "normal";
    readonly label: "标准";
    readonly targetRegionCount: 2;
    readonly description: "推理 2 个目标区域 · 100 代以内稳定";
    readonly maxDurationMs: number;
}, {
    readonly key: "hard";
    readonly label: "挑战";
    readonly targetRegionCount: 3;
    readonly description: "推理 3 个目标区域 · 100 代以内稳定";
    readonly maxDurationMs: number;
}];
export declare const LIFE_MAX_ERROR_COUNT = 100;
export declare function getLifeGameMaxDurationMs(difficultyKey: string): number;
//# sourceMappingURL=config.d.ts.map