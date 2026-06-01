import { LIFE_REGION_WIDTH, LIFE_BOARD_HEIGHT } from './types.js';
export function validateLocalCells(input) {
    const { cells, regionWidth = LIFE_REGION_WIDTH, regionHeight = LIFE_BOARD_HEIGHT } = input;
    // Max 150 cells
    if (cells.length > 150) {
        return { valid: false, reason: 'TOO_MANY_CELLS' };
    }
    const seen = new Set();
    for (const cell of cells) {
        // Bounds check
        if (cell.x < 0 || cell.x >= regionWidth || cell.y < 0 || cell.y >= regionHeight) {
            return { valid: false, reason: 'OUT_OF_BOUNDS' };
        }
        // Duplicate check
        const key = `${cell.x},${cell.y}`;
        if (seen.has(key)) {
            return { valid: false, reason: 'DUPLICATE_COORDINATE' };
        }
        seen.add(key);
    }
    return { valid: true };
}
export function isSameLocalCellSet(a, b) {
    if (a.length !== b.length)
        return false;
    const normalize = (cells) => cells.map((c) => `${c.x},${c.y}`).sort();
    const na = normalize(a);
    const nb = normalize(b);
    for (let i = 0; i < na.length; i++) {
        if (na[i] !== nb[i])
            return false;
    }
    return true;
}
export function validateRegionSubmission(input) {
    return { correct: isSameLocalCellSet(input.submittedCells, input.answerCells) };
}
//# sourceMappingURL=validator.js.map