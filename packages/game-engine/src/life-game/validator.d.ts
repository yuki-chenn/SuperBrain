import type { LocalCellCoord } from './types.js';
export interface ValidateLocalCellsInput {
    cells: LocalCellCoord[];
    regionWidth?: number;
    regionHeight?: number;
}
export interface ValidateLocalCellsResult {
    valid: boolean;
    reason?: string;
}
export declare function validateLocalCells(input: ValidateLocalCellsInput): ValidateLocalCellsResult;
export declare function isSameLocalCellSet(a: LocalCellCoord[], b: LocalCellCoord[]): boolean;
export interface ValidateRegionSubmissionInput {
    submittedCells: LocalCellCoord[];
    answerCells: LocalCellCoord[];
}
export declare function validateRegionSubmission(input: ValidateRegionSubmissionInput): {
    correct: boolean;
};
//# sourceMappingURL=validator.d.ts.map