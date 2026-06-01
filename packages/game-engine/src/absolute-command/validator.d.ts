import type { AbsoluteCommandPuzzleSnapshot, AbsoluteCommandDirection, AbsoluteCommandPuzzleValidationReport } from './types.js';
export declare function validatePuzzleStructure(puzzle: AbsoluteCommandPuzzleSnapshot): AbsoluteCommandPuzzleValidationReport;
export declare function validateReferenceSolution(puzzle: AbsoluteCommandPuzzleSnapshot, solution: AbsoluteCommandDirection[]): NonNullable<AbsoluteCommandPuzzleValidationReport['referenceSolutionResult']>;
export declare function validateAbsoluteCommandPuzzle(puzzle: AbsoluteCommandPuzzleSnapshot, referenceSolution?: AbsoluteCommandDirection[]): AbsoluteCommandPuzzleValidationReport;
//# sourceMappingURL=validator.d.ts.map