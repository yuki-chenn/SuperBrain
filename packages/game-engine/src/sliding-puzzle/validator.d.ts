import type { SlidingPuzzleState, ValidationResult } from './types.js';
/**
 * Per-board-size cap on the length of a submitted move trace.
 *
 * Acts as anti-cheat (bounds bot floods) and as a server-side replay
 * resource guard (each entry triggers one move replay). Numbers are
 * empirical "humanly plausible" upper bounds with ~10× headroom.
 *
 * Single source of truth — do NOT duplicate this map elsewhere.
 */
export declare const MAX_MOVES_LIMIT: Record<number, number>;
export declare function validateSlidingPuzzleAttempt(input: {
    initialState: SlidingPuzzleState;
    moveTrace: number[];
    finalState: SlidingPuzzleState;
    size: number;
}): ValidationResult;
//# sourceMappingURL=validator.d.ts.map