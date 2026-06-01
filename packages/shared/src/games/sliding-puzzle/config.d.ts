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
export declare const SLIDING_PUZZLE_DIFFICULTIES: readonly [{
    readonly key: "easy";
    readonly label: "3x3";
    readonly size: 3;
    readonly scrambleMoves: 60;
    readonly maxDurationMs: number;
}, {
    readonly key: "normal";
    readonly label: "4x4";
    readonly size: 4;
    readonly scrambleMoves: 160;
    readonly maxDurationMs: number;
}, {
    readonly key: "hard";
    readonly label: "5x5";
    readonly size: 5;
    readonly scrambleMoves: 300;
    readonly maxDurationMs: number;
}];
export declare function getSlidingPuzzleMaxDurationMs(difficultyKey: string): number;
//# sourceMappingURL=config.d.ts.map