import type { AdjacencyMode, Coord, Radical, RoundSubmissionState, ValidateRoundPathInput, ValidateRoundPathResult } from './types.js';
export declare function indexToCoord(index: number): Coord;
export declare function coordToIndex(row: number, col: number): number;
export declare function isAdjacent8(a: Coord, b: Coord): boolean;
export declare function isAdjacent4(a: Coord, b: Coord): boolean;
export declare function isAdjacent(a: Coord, b: Coord, mode: AdjacencyMode): boolean;
export declare function validateRoundPath(input: ValidateRoundPathInput): ValidateRoundPathResult;
export declare function getAvailableRadicals(radicalPool: Radical[], disabledKeys: string[]): Radical[];
export declare function isRadicalAvailable(radicalKey: string, disabledKeys: string[]): boolean;
export declare function updateStateAfterSuccess(state: RoundSubmissionState, selectedCellIndices: number[], selectedRadicalKeys: string[]): RoundSubmissionState;
//# sourceMappingURL=engine.d.ts.map