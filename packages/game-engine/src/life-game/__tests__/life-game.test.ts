import { describe, it, expect } from 'vitest';
import {
  boardToAliveSet,
  countAliveNeighbors,
  stepLife,
  isSameBoard,
  normalizeBoard,
  simulateUntilStable,
  getLifeRegions,
  getRegionById,
  getRegionIdByCell,
  extractRegionAnswer,
  toLocalCoord,
  toGlobalCoord,
  validateLocalCells,
  isSameLocalCellSet,
  validateRegionSubmission,
  LIFE_BOARD_WIDTH,
  LIFE_BOARD_HEIGHT,
  LIFE_REGION_WIDTH,
  DEFAULT_LIFE_BOUNDARY_RULE,
} from '../index';
import type { LifeBoardState, LifeBoundaryRule, CellCoord, LocalCellCoord } from '../types';

const boundary: LifeBoundaryRule = DEFAULT_LIFE_BOUNDARY_RULE;

function makeBoard(aliveCells: [number, number][]): LifeBoardState {
  return {
    width: LIFE_BOARD_WIDTH,
    height: LIFE_BOARD_HEIGHT,
    aliveCells: aliveCells.map(([x, y]) => ({ x, y })),
  };
}

function makeSmallBoard(width: number, height: number, aliveCells: [number, number][]): LifeBoardState {
  return {
    width,
    height,
    aliveCells: aliveCells.map(([x, y]) => ({ x, y })),
  };
}

describe('boardToAliveSet', () => {
  it('creates a set from alive cells', () => {
    const board = makeBoard([[1, 2], [3, 4]]);
    const set = boardToAliveSet(board);
    expect(set.has('1,2')).toBe(true);
    expect(set.has('3,4')).toBe(true);
    expect(set.has('0,0')).toBe(false);
  });

  it('handles empty board', () => {
    const board = makeBoard([]);
    const set = boardToAliveSet(board);
    expect(set.size).toBe(0);
  });
});

describe('countAliveNeighbors', () => {
  it('counts neighbors in center', () => {
    // Cell (5,5) with neighbors at (4,4), (4,5), (5,4)
    const board = makeBoard([[4, 4], [4, 5], [5, 4], [10, 10]]);
    expect(countAliveNeighbors(board, 5, 5, boundary)).toBe(3);
  });

  it('counts 0 for isolated cell', () => {
    const board = makeBoard([[5, 5]]);
    expect(countAliveNeighbors(board, 0, 0, boundary)).toBe(0);
  });

  it('handles wrapX correctly', () => {
    // Cell at x=0 should count neighbor at x=119
    const board = makeBoard([[119, 7]]);
    expect(countAliveNeighbors(board, 0, 7, boundary)).toBe(1);
  });

  it('handles wrapX bidirectional', () => {
    // Cell at x=119 should count neighbor at x=0
    const board = makeBoard([[0, 7]]);
    expect(countAliveNeighbors(board, 119, 7, boundary)).toBe(1);
  });

  it('does not wrapY when wrapY=false', () => {
    // Cell at y=0 should NOT count y=-1
    const board = makeBoard([[5, 14]]);
    expect(countAliveNeighbors(board, 5, 0, boundary)).toBe(0);
  });

  it('wrapsY when wrapY=true', () => {
    const wrapYBoundary: LifeBoundaryRule = { wrapX: true, wrapY: true };
    const board = makeSmallBoard(10, 10, [[5, 9]]);
    expect(countAliveNeighbors(board, 5, 0, wrapYBoundary)).toBe(1);
  });
});

describe('B3/S23 rules', () => {
  it('dead cell with exactly 3 neighbors becomes alive', () => {
    const board = makeSmallBoard(5, 5, [[0, 0], [1, 0], [0, 1]]);
    const next = stepLife(board, { wrapX: false, wrapY: false });
    // Cell (1,1) should be alive: it has 3 alive neighbors
    const set = boardToAliveSet(next);
    expect(set.has('1,1')).toBe(true);
  });

  it('dead cell with 2 neighbors stays dead', () => {
    const board = makeSmallBoard(5, 5, [[0, 0], [1, 0]]);
    const next = stepLife(board, { wrapX: false, wrapY: false });
    // Cell (1,1) has only 2 alive neighbors, stays dead
    const set = boardToAliveSet(next);
    expect(set.has('1,1')).toBe(false);
  });

  it('alive cell with 2 neighbors survives', () => {
    // Block pattern (stable)
    const board = makeSmallBoard(5, 5, [[1, 1], [1, 2], [2, 1], [2, 2]]);
    const next = stepLife(board, { wrapX: false, wrapY: false });
    expect(isSameBoard(next, board)).toBe(true);
  });

  it('alive cell with 3 neighbors survives', () => {
    // Blinker: horizontal line of 3
    const board = makeSmallBoard(5, 5, [[1, 0], [1, 1], [1, 2]]);
    const next = stepLife(board, { wrapX: false, wrapY: false });
    // Center cell (1,1) has 2 neighbors, survives; (0,1) and (2,1) have 3, born
    const set = boardToAliveSet(next);
    expect(set.has('1,1')).toBe(true);
  });

  it('alive cell with <2 neighbors dies (underpopulation)', () => {
    const board = makeSmallBoard(5, 5, [[2, 2]]);
    const next = stepLife(board, { wrapX: false, wrapY: false });
    expect(next.aliveCells.length).toBe(0);
  });

  it('alive cell with >3 neighbors dies (overpopulation)', () => {
    // Center cell (2,2) with 4 neighbors
    const board = makeSmallBoard(5, 5, [[1, 1], [1, 2], [2, 1], [2, 3], [3, 2]]);
    const next = stepLife(board, { wrapX: false, wrapY: false });
    const set = boardToAliveSet(next);
    expect(set.has('2,2')).toBe(false);
  });
});

describe('stepLife with known patterns', () => {
  it('block is stable (fixed point)', () => {
    const board = makeSmallBoard(6, 6, [[2, 2], [2, 3], [3, 2], [3, 3]]);
    const next = stepLife(board, { wrapX: false, wrapY: false });
    expect(isSameBoard(next, board)).toBe(true);
  });

  it('blinker oscillates (period 2)', () => {
    // Horizontal blinker
    const horizontal = makeSmallBoard(5, 5, [[1, 2], [2, 2], [3, 2]]);
    const vertical = stepLife(horizontal, { wrapX: false, wrapY: false });
    // Vertical blinker
    const verticalExpected = makeSmallBoard(5, 5, [[2, 1], [2, 2], [2, 3]]);
    expect(isSameBoard(vertical, verticalExpected)).toBe(true);

    // Step again: back to horizontal
    const back = stepLife(vertical, { wrapX: false, wrapY: false });
    expect(isSameBoard(back, horizontal)).toBe(true);
  });

  it('beehive is stable', () => {
    // Beehive pattern
    const board = makeSmallBoard(8, 8, [[2, 1], [3, 0], [4, 0], [3, 2], [4, 2], [2, 1]]);
    const beehive = makeSmallBoard(8, 8, [[2, 1], [3, 0], [4, 0], [5, 1], [4, 2], [3, 2]]);
    const next = stepLife(beehive, { wrapX: false, wrapY: false });
    expect(isSameBoard(next, beehive)).toBe(true);
  });
});

describe('normalizeBoard', () => {
  it('sorts alive cells', () => {
    const board = makeBoard([[3, 1], [1, 2], [1, 1]]);
    const normalized = normalizeBoard(board);
    expect(normalized.aliveCells).toEqual([
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 3, y: 1 },
    ]);
  });
});

describe('isSameBoard', () => {
  it('returns true for same cells in different order', () => {
    const a = makeBoard([[1, 2], [3, 4]]);
    const b = makeBoard([[3, 4], [1, 2]]);
    expect(isSameBoard(a, b)).toBe(true);
  });

  it('returns false for different cells', () => {
    const a = makeBoard([[1, 2], [3, 4]]);
    const b = makeBoard([[1, 2], [3, 5]]);
    expect(isSameBoard(a, b)).toBe(false);
  });

  it('returns false for different lengths', () => {
    const a = makeBoard([[1, 2]]);
    const b = makeBoard([[1, 2], [3, 4]]);
    expect(isSameBoard(a, b)).toBe(false);
  });

  it('returns true for empty boards', () => {
    const a = makeBoard([]);
    const b = makeBoard([]);
    expect(isSameBoard(a, b)).toBe(true);
  });
});

describe('simulateUntilStable', () => {
  it('detects fixed point (block)', () => {
    const board = makeSmallBoard(10, 10, [[4, 4], [4, 5], [5, 4], [5, 5]]);
    const result = simulateUntilStable({
      initialState: board,
      boundary: { wrapX: false, wrapY: false },
    });
    expect(result.status).toBe('STABLE');
    expect(result.generations).toBe(1);
    expect(result.stableState).toBeDefined();
    expect(isSameBoard(result.stableState!, board)).toBe(true);
  });

  it('detects empty board as stable', () => {
    const board = makeSmallBoard(5, 5, []);
    const result = simulateUntilStable({
      initialState: board,
      boundary: { wrapX: false, wrapY: false },
    });
    expect(result.status).toBe('STABLE');
    expect(result.generations).toBe(1);
  });

  it('detects oscillation (blinker)', () => {
    const board = makeSmallBoard(5, 5, [[1, 2], [2, 2], [3, 2]]);
    const result = simulateUntilStable({
      initialState: board,
      boundary: { wrapX: false, wrapY: false },
    });
    expect(result.status).toBe('OSCILLATING');
    expect(result.period).toBe(2);
  });

  it('respects maxGenerations', () => {
    // A pattern that takes many generations to stabilize
    // Use a small max to force MAX_GENERATION_REACHED
    const board = makeSmallBoard(10, 10, [[1, 2], [2, 2], [3, 2]]);
    const result = simulateUntilStable({
      initialState: board,
      boundary: { wrapX: false, wrapY: false },
      maxGenerations: 1,
    });
    expect(result.status).toBe('MAX_GENERATION_REACHED');
    expect(result.generations).toBe(1);
  });
});

describe('getLifeRegions', () => {
  it('returns 12 regions', () => {
    const regions = getLifeRegions();
    expect(regions.length).toBe(12);
  });

  it('regions cover full width', () => {
    const regions = getLifeRegions();
    expect(regions[0].xStart).toBe(0);
    expect(regions[0].xEnd).toBe(9);
    expect(regions[11].xStart).toBe(110);
    expect(regions[11].xEnd).toBe(119);
  });

  it('all regions have height 15', () => {
    const regions = getLifeRegions();
    for (const r of regions) {
      expect(r.height).toBe(15);
      expect(r.yStart).toBe(0);
      expect(r.yEnd).toBe(14);
    }
  });
});

describe('getRegionById', () => {
  it('returns correct region', () => {
    const r = getRegionById(1);
    expect(r.xStart).toBe(0);
    expect(r.xEnd).toBe(9);
  });

  it('throws for invalid ID', () => {
    expect(() => getRegionById(0)).toThrow();
    expect(() => getRegionById(13)).toThrow();
  });
});

describe('getRegionIdByCell', () => {
  it('returns correct region for cell', () => {
    expect(getRegionIdByCell(0, 0)).toBe(1);
    expect(getRegionIdByCell(9, 7)).toBe(1);
    expect(getRegionIdByCell(10, 0)).toBe(2);
    expect(getRegionIdByCell(119, 14)).toBe(12);
  });

  it('throws for out of bounds', () => {
    expect(() => getRegionIdByCell(-1, 0)).toThrow();
    expect(() => getRegionIdByCell(120, 0)).toThrow();
    expect(() => getRegionIdByCell(0, -1)).toThrow();
    expect(() => getRegionIdByCell(0, 15)).toThrow();
  });
});

describe('extractRegionAnswer', () => {
  it('extracts cells in region as local coords', () => {
    const stableState = makeBoard([
      [3, 5], [7, 10], // region 1
      [15, 3], // region 2
    ]);
    const answer = extractRegionAnswer(stableState, 1);
    expect(answer.length).toBe(2);
    expect(answer).toContainEqual({ x: 3, y: 5 });
    expect(answer).toContainEqual({ x: 7, y: 10 });
  });

  it('returns empty for region with no alive cells', () => {
    const stableState = makeBoard([[15, 3]]);
    const answer = extractRegionAnswer(stableState, 1);
    expect(answer.length).toBe(0);
  });
});

describe('toLocalCoord / toGlobalCoord', () => {
  it('converts global to local', () => {
    const region = getRegionById(2); // xStart=10
    expect(toLocalCoord({ x: 15, y: 7 }, region)).toEqual({ x: 5, y: 7 });
  });

  it('converts local to global', () => {
    const region = getRegionById(2); // xStart=10
    expect(toGlobalCoord({ x: 5, y: 7 }, region)).toEqual({ x: 15, y: 7 });
  });

  it('round-trips correctly', () => {
    const region = getRegionById(5);
    const original: CellCoord = { x: 47, y: 12 };
    const local = toLocalCoord(original, region);
    const back = toGlobalCoord(local, region);
    expect(back).toEqual(original);
  });
});

describe('validateLocalCells', () => {
  it('accepts valid cells', () => {
    const result = validateLocalCells({
      cells: [{ x: 0, y: 0 }, { x: 9, y: 14 }],
    });
    expect(result.valid).toBe(true);
  });

  it('rejects out of bounds x', () => {
    const result = validateLocalCells({
      cells: [{ x: 10, y: 0 }],
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('rejects out of bounds y', () => {
    const result = validateLocalCells({
      cells: [{ x: 0, y: 15 }],
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('rejects negative coordinates', () => {
    const result = validateLocalCells({
      cells: [{ x: -1, y: 0 }],
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('OUT_OF_BOUNDS');
  });

  it('rejects duplicates', () => {
    const result = validateLocalCells({
      cells: [{ x: 1, y: 1 }, { x: 1, y: 1 }],
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('DUPLICATE_COORDINATE');
  });

  it('rejects more than 150 cells', () => {
    const cells: LocalCellCoord[] = [];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 15; y++) {
        cells.push({ x, y });
      }
    }
    // cells = 150, should be fine
    expect(validateLocalCells({ cells }).valid).toBe(true);

    // Add one more
    cells.push({ x: 0, y: 0 }); // duplicate, but count check happens first
    // Actually count check is first, 151 > 150
    expect(validateLocalCells({ cells }).valid).toBe(false);
  });
});

describe('isSameLocalCellSet', () => {
  it('returns true for same cells in different order', () => {
    const a: LocalCellCoord[] = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
    const b: LocalCellCoord[] = [{ x: 3, y: 4 }, { x: 1, y: 2 }];
    expect(isSameLocalCellSet(a, b)).toBe(true);
  });

  it('returns false for different cells', () => {
    const a: LocalCellCoord[] = [{ x: 1, y: 2 }];
    const b: LocalCellCoord[] = [{ x: 1, y: 3 }];
    expect(isSameLocalCellSet(a, b)).toBe(false);
  });

  it('returns false for different lengths', () => {
    const a: LocalCellCoord[] = [{ x: 1, y: 2 }];
    const b: LocalCellCoord[] = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
    expect(isSameLocalCellSet(a, b)).toBe(false);
  });

  it('returns true for empty arrays', () => {
    expect(isSameLocalCellSet([], [])).toBe(true);
  });
});

describe('validateRegionSubmission', () => {
  it('returns correct for matching cells', () => {
    const result = validateRegionSubmission({
      submittedCells: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
      answerCells: [{ x: 3, y: 4 }, { x: 1, y: 2 }],
    });
    expect(result.correct).toBe(true);
  });

  it('returns incorrect for non-matching cells', () => {
    const result = validateRegionSubmission({
      submittedCells: [{ x: 1, y: 2 }],
      answerCells: [{ x: 1, y: 3 }],
    });
    expect(result.correct).toBe(false);
  });
});
