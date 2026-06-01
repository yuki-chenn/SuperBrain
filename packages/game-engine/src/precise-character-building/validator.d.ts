import type { CharacterCombinationEntry, CharacterCell } from './types.js';
export declare function validateCharacterCombination(radicalKey: string, rootKey: string, difficultyKey: string, combinations: CharacterCombinationEntry[]): CharacterCombinationEntry | null;
export interface ValidateRoundInput {
    selectedRadicalKeys: string[];
    selectedCells: CharacterCell[];
    difficultyKey: string;
    combinations: CharacterCombinationEntry[];
}
export interface ValidateRoundResult {
    valid: boolean;
    resultChars: string[];
    combinationIds: string[];
    errorReason?: string;
    invalidSlotIndex?: number;
}
export declare function validateRound(input: ValidateRoundInput): ValidateRoundResult;
//# sourceMappingURL=validator.d.ts.map