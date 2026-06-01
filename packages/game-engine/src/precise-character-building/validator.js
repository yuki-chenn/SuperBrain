function isCombinationAllowedInDifficulty(combinationDifficulty, difficultyKey) {
    if (combinationDifficulty === 'disabled')
        return false;
    if (difficultyKey === 'easy')
        return combinationDifficulty === 'easy';
    if (difficultyKey === 'normal')
        return combinationDifficulty === 'normal';
    return (combinationDifficulty === 'easy' ||
        combinationDifficulty === 'normal' ||
        combinationDifficulty === 'hard');
}
export function validateCharacterCombination(radicalKey, rootKey, difficultyKey, combinations) {
    return (combinations.find((c) => c.radicalKey === radicalKey &&
        c.rootKey === rootKey &&
        isCombinationAllowedInDifficulty(c.difficulty, difficultyKey)) ?? null);
}
export function validateRound(input) {
    const { selectedRadicalKeys, selectedCells, combinations, difficultyKey } = input;
    const resultChars = [];
    const combinationIds = [];
    for (let i = 0; i < selectedRadicalKeys.length; i++) {
        const radicalKey = selectedRadicalKeys[i];
        const cell = selectedCells[i];
        const combo = combinations.find((c) => c.radicalKey === radicalKey &&
            c.rootKey === cell.rootKey &&
            isCombinationAllowedInDifficulty(c.difficulty, difficultyKey));
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
//# sourceMappingURL=validator.js.map