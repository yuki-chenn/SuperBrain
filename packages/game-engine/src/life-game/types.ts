export interface CellCoord {
  x: number;
  y: number;
}

export interface LocalCellCoord {
  x: number;
  y: number;
}

export interface LifeBoundaryRule {
  wrapX: boolean;
  wrapY: boolean;
}

export interface LifeBoardState {
  width: number;
  height: number;
  aliveCells: CellCoord[];
}

export interface LifeRegion {
  id: number;
  label: string;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  width: number;
  height: number;
}

export interface LifeSimulationResult {
  status: 'STABLE' | 'OSCILLATING' | 'MAX_GENERATION_REACHED';
  finalState: LifeBoardState;
  stableState?: LifeBoardState;
  generations: number;
  period?: number;
}

export const LIFE_BOARD_WIDTH = 120;
export const LIFE_BOARD_HEIGHT = 15;
export const LIFE_REGION_COUNT = 12;
export const LIFE_REGION_WIDTH = 10;
export const LIFE_MAX_GENERATIONS = 100;
export const LIFE_MAX_ERROR_COUNT = 100;

export const DEFAULT_LIFE_BOUNDARY_RULE: LifeBoundaryRule = {
  wrapX: true,
  wrapY: false,
};
