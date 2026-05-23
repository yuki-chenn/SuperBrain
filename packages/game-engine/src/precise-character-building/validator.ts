import type { CharacterCombinationEntry, CharacterCell } from './types.js';

function isCombinationAllowedInDifficulty(
  combinationDifficulty: string,
  difficultyKey: string,
): boolean {
  if (combinationDifficulty === 'disabled') return false;
  if (difficultyKey === 'easy') return combinationDifficulty === 'easy';
  if (difficultyKey === 'normal') return combinationDifficulty === 'normal';
  return (
    combinationDifficulty === 'easy' ||
    combinationDifficulty === 'normal' ||
    combinationDifficulty === 'hard'
  );
}

export function validateCharacterCombination(
  radicalKey: string,
  rootKey: string,
  difficultyKey: string,
  combinations: CharacterCombinationEntry[],
): CharacterCombinationEntry | null {
  return (
    combinations.find(
      (c) =>
        c.radicalKey === radicalKey &&
        c.rootKey === rootKey &&
        isCombinationAllowedInDifficulty(c.difficulty, difficultyKey),
    ) ?? null
  );
}

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

export function validateRound(input: ValidateRoundInput): ValidateRoundResult {
  const { selectedRadicalKeys, selectedCells, combinations, difficultyKey } = input;

  const resultChars: string[] = [];
  const combinationIds: string[] = [];

  for (let i = 0; i < selectedRadicalKeys.length; i++) {
    const radicalKey = selectedRadicalKeys[i];
    const cell = selectedCells[i];

    const combo = combinations.find(
      (c) =>
        c.radicalKey === radicalKey &&
        c.rootKey === cell.rootKey &&
        isCombinationAllowedInDifficulty(c.difficulty, difficultyKey),
    );

    if (!combo) {
      return {
        valid: false,
        resultChars: [],
        combinationIds: [],
        errorReason: 'INVALID_COMBINATION',
        invalidSlotIndex: i,
      };
    }

    resultChars.push(combo.resultChar);
    combinationIds.push(`${combo.radicalKey}-${combo.rootKey}-${combo.resultChar}`);
  }

  return { valid: true, resultChars, combinationIds };
}
