import type { LifeBoardState, LifeBoundaryRule } from './types.js';
export declare function cellKey(x: number, y: number): string;
export declare function boardToAliveSet(state: LifeBoardState): Set<string>;
export declare function countAliveNeighbors(state: LifeBoardState, x: number, y: number, boundary: LifeBoundaryRule): number;
export declare function stepLife(state: LifeBoardState, boundary: LifeBoundaryRule): LifeBoardState;
export declare function normalizeBoard(state: LifeBoardState): LifeBoardState;
export declare function isSameBoard(a: LifeBoardState, b: LifeBoardState): boolean;
export declare function boardHash(state: LifeBoardState): string;
//# sourceMappingURL=engine.d.ts.map