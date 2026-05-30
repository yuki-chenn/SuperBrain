export type {
  AbsoluteCommandDirection,
  MazeCoord,
  AbsoluteCommandCellType,
  AbsoluteCommandCell,
  AbsoluteCommandPuzzleSnapshot,
  AbsoluteCommandRuntimeState,
  AbsoluteCommandHistoryItem,
  AbsoluteCommandRuntimeStateSnapshot,
  AbsoluteCommandExecuteDirectionInput,
  AbsoluteCommandExecuteDirectionResult,
  AbsoluteCommandPuzzleValidationReport,
} from './types.js';

export {
  ALL_DIRECTIONS,
  AC_MAZE_WIDTH,
  AC_MAZE_HEIGHT,
  AC_MAZE_DEPTH,
  AC_TOTAL_CELLS,
} from './types.js';

export {
  coordKey,
  parseCoordKey,
  coordEquals,
  directionToDelta,
  addCoord,
  isInBounds,
  cloneCoord,
  directionLabel,
  directionShortLabel,
} from './coord.js';

export {
  executeDirection,
  undoCommand,
  createInitialState,
  buildPuzzleSnapshot,
  isCompleted,
} from './simulator.js';

export {
  validatePuzzleStructure,
  validateReferenceSolution,
  validateAbsoluteCommandPuzzle,
} from './validator.js';
