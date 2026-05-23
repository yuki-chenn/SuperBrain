export type {
  AdjacencyMode,
  CharacterStructure,
  CharacterCell,
  Radical,
  CharacterCombinationEntry,
  SolutionRound,
  PuzzleConfig,
  PreciseCharacterPuzzleData,
  Coord,
  RoundSubmissionState,
  ValidateRoundPathInput,
  ValidateRoundPathResult,
} from './types.js';

export {
  BOARD_SIZE,
  CELLS_TO_LIGHT,
  PICKS_PER_ROUND,
  COOLDOWN_ROUNDS,
  PCB_MAX_ERROR_COUNT,
} from './types.js';

export {
  indexToCoord,
  coordToIndex,
  isAdjacent8,
  isAdjacent4,
  isAdjacent,
  validateRoundPath,
  getAvailableRadicals,
  isRadicalAvailable,
  updateStateAfterSuccess,
} from './engine.js';

export {
  validateCharacterCombination,
  validateRound,
} from './validator.js';

export type { ValidateRoundInput, ValidateRoundResult } from './validator.js';
