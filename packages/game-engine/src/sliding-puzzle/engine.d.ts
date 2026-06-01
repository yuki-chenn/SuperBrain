import type { SlidingPuzzleState, ReplayResult } from './types.js';
export declare function createSolvedBoard(size: number): number[];
export declare function isSolved(state: SlidingPuzzleState): boolean;
export declare function getBlankIndex(board: number[]): number;
export declare function areAdjacent(indexA: number, indexB: number, size: number): boolean;
export declare function canMoveTile(state: SlidingPuzzleState, tile: number): boolean;
export declare function moveTile(state: SlidingPuzzleState, tile: number): SlidingPuzzleState;
export declare function replayMoves(initial: SlidingPuzzleState, moves: number[]): ReplayResult;
//# sourceMappingURL=engine.d.ts.map