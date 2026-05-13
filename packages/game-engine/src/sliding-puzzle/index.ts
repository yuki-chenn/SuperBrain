export type { SlidingPuzzleState, ReplayResult, ValidationResult } from './types.js';
export {
  createSolvedBoard,
  isSolved,
  getBlankIndex,
  areAdjacent,
  canMoveTile,
  moveTile,
  replayMoves,
} from './engine.js';
export { generateSlidingPuzzleInitialState } from './generator.js';
export { validateSlidingPuzzleAttempt } from './validator.js';
