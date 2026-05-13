export type {
  CellCoord,
  LocalCellCoord,
  LifeBoundaryRule,
  LifeBoardState,
  LifeRegion,
  LifeSimulationResult,
} from './types.js';

export {
  LIFE_BOARD_WIDTH,
  LIFE_BOARD_HEIGHT,
  LIFE_REGION_COUNT,
  LIFE_REGION_WIDTH,
  LIFE_MAX_GENERATIONS,
  LIFE_MAX_ERROR_COUNT,
  DEFAULT_LIFE_BOUNDARY_RULE,
} from './types.js';

export {
  getLifeRegions,
  getRegionById,
  getRegionIdByCell,
  extractRegionAnswer,
  toLocalCoord,
  toGlobalCoord,
} from './regions.js';

export {
  cellKey,
  boardToAliveSet,
  countAliveNeighbors,
  stepLife,
  normalizeBoard,
  isSameBoard,
  boardHash,
} from './engine.js';

export { simulateUntilStable } from './simulation.js';
export type { SimulateUntilStableInput } from './simulation.js';

export {
  validateLocalCells,
  isSameLocalCellSet,
  validateRegionSubmission,
} from './validator.js';
export type { ValidateLocalCellsInput, ValidateLocalCellsResult, ValidateRegionSubmissionInput } from './validator.js';
