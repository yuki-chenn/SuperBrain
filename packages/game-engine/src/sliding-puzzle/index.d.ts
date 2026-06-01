export type { SlidingPuzzleState, ReplayResult, ValidationResult } from './types.js';
export { createSolvedBoard, isSolved, getBlankIndex, areAdjacent, canMoveTile, moveTile, replayMoves, } from './engine.js';
export { generateSlidingPuzzleInitialState } from './generator.js';
export { validateSlidingPuzzleAttempt, MAX_MOVES_LIMIT } from './validator.js';
export { validateContent as slidingpuzzleValidateContent } from './content-validator.js';
//# sourceMappingURL=index.d.ts.map