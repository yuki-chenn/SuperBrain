import type { CellCoord, LocalCellCoord, LifeRegion, LifeBoardState } from './types.js';
import { LIFE_BOARD_WIDTH, LIFE_BOARD_HEIGHT, LIFE_REGION_COUNT, LIFE_REGION_WIDTH } from './types.js';

const regions: LifeRegion[] = Array.from({ length: LIFE_REGION_COUNT }, (_, i) => ({
  id: i + 1,
  label: `区域 ${i + 1}`,
  xStart: i * LIFE_REGION_WIDTH,
  xEnd: (i + 1) * LIFE_REGION_WIDTH - 1,
  yStart: 0,
  yEnd: LIFE_BOARD_HEIGHT - 1,
  width: LIFE_REGION_WIDTH,
  height: LIFE_BOARD_HEIGHT,
}));

export function getLifeRegions(): LifeRegion[] {
  return regions;
}

export function getRegionById(regionId: number): LifeRegion {
  const region = regions.find((r) => r.id === regionId);
  if (!region) throw new Error(`Invalid region ID: ${regionId}`);
  return region;
}

export function getRegionIdByCell(x: number, y: number): number {
  if (x < 0 || x >= LIFE_BOARD_WIDTH || y < 0 || y >= LIFE_BOARD_HEIGHT) {
    throw new Error(`Cell (${x}, ${y}) is out of bounds`);
  }
  return Math.floor(x / LIFE_REGION_WIDTH) + 1;
}

export function extractRegionAnswer(
  stableState: LifeBoardState,
  regionId: number,
): LocalCellCoord[] {
  const region = getRegionById(regionId);
  return stableState.aliveCells
    .filter((cell) => cell.x >= region.xStart && cell.x <= region.xEnd && cell.y >= region.yStart && cell.y <= region.yEnd)
    .map((cell) => toLocalCoord(cell, region));
}

export function toLocalCoord(cell: CellCoord, region: LifeRegion): LocalCellCoord {
  return {
    x: cell.x - region.xStart,
    y: cell.y,
  };
}

export function toGlobalCoord(cell: LocalCellCoord, region: LifeRegion): CellCoord {
  return {
    x: region.xStart + cell.x,
    y: cell.y,
  };
}
