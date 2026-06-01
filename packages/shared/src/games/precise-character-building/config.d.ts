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
export declare const PRECISE_CHARACTER_BUILDING_DIFFICULTIES: readonly [{
    readonly key: "easy";
    readonly label: "入门";
    readonly boardSize: 6;
    readonly picksPerRound: 4;
    readonly radicalPoolSize: 6;
    readonly maxDurationMs: number;
    readonly adjacencyMode: "ORTHOGONAL_4";
    readonly allowedStructures: readonly ["LEFT_RIGHT", "TOP_BOTTOM"];
    readonly rootComplexity: "LOW";
}, {
    readonly key: "normal";
    readonly label: "标准";
    readonly boardSize: 6;
    readonly picksPerRound: 4;
    readonly radicalPoolSize: 6;
    readonly maxDurationMs: number;
    readonly adjacencyMode: "ORTHOGONAL_4";
    readonly allowedStructures: readonly ["LEFT_RIGHT", "TOP_BOTTOM", "SEMI_SURROUND"];
    readonly rootComplexity: "MEDIUM";
    readonly recommended: true;
}, {
    readonly key: "hard";
    readonly label: "挑战";
    readonly boardSize: 6;
    readonly picksPerRound: 4;
    readonly radicalPoolSize: 6;
    readonly maxDurationMs: number;
    readonly adjacencyMode: "ORTHOGONAL_4";
    readonly allowedStructures: readonly ["LEFT_RIGHT", "TOP_BOTTOM", "SEMI_SURROUND", "SURROUND"];
    readonly rootComplexity: "HIGH";
}];
export declare const PCB_MAX_ERROR_COUNT = 100;
export declare function getPCBMaxDurationMs(difficultyKey: string): number;
//# sourceMappingURL=config.d.ts.map