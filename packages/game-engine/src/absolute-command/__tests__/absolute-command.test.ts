import { describe, it, expect } from 'vitest';
import {
  coordKey,
  parseCoordKey,
  coordEquals,
  directionToDelta,
  addCoord,
  isInBounds,
  executeDirection,
  undoCommand,
  createInitialState,
  buildPuzzleSnapshot,
  isCompleted,
  validatePuzzleStructure,
  validateReferenceSolution,
  validateAbsoluteCommandPuzzle,
} from '../index';
import type {
  MazeCoord,
  AbsoluteCommandPuzzleSnapshot,
  AbsoluteCommandCell,
  AbsoluteCommandDirection,
  AbsoluteCommandRuntimeState,
} from '../types';

const DEFAULT_SIZE = { width: 8, height: 8, depth: 3 };

function makePuzzle(
  startCoord: MazeCoord,
  cells: AbsoluteCommandCell[],
): AbsoluteCommandPuzzleSnapshot {
  return buildPuzzleSnapshot('test-puzzle', 1, DEFAULT_SIZE, startCoord, cells);
}

// ─── coord.ts tests ─────────────────────────────────────────────────

describe('coordKey', () => {
  it('creates correct key', () => {
    expect(coordKey({ x: 1, y: 2, z: 3 })).toBe('1,2,3');
    expect(coordKey({ x: 0, y: 0, z: 0 })).toBe('0,0,0');
  });
});

describe('parseCoordKey', () => {
  it('parses key correctly', () => {
    expect(parseCoordKey('1,2,3')).toEqual({ x: 1, y: 2, z: 3 });
  });
});

describe('coordEquals', () => {
  it('returns true for equal coords', () => {
    expect(coordEquals({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toBe(true);
  });

  it('returns false for different coords', () => {
    expect(coordEquals({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 4 })).toBe(false);
  });
});

describe('directionToDelta', () => {
  it('returns correct deltas', () => {
    expect(directionToDelta('X_POS')).toEqual({ x: 1, y: 0, z: 0 });
    expect(directionToDelta('X_NEG')).toEqual({ x: -1, y: 0, z: 0 });
    expect(directionToDelta('Y_POS')).toEqual({ x: 0, y: 1, z: 0 });
    expect(directionToDelta('Y_NEG')).toEqual({ x: 0, y: -1, z: 0 });
    expect(directionToDelta('Z_POS')).toEqual({ x: 0, y: 0, z: 1 });
    expect(directionToDelta('Z_NEG')).toEqual({ x: 0, y: 0, z: -1 });
  });
});

describe('addCoord', () => {
  it('adds coords correctly', () => {
    expect(addCoord({ x: 1, y: 2, z: 3 }, { x: 1, y: -1, z: 0 })).toEqual({ x: 2, y: 1, z: 3 });
  });
});

describe('isInBounds', () => {
  it('returns true for valid coords', () => {
    expect(isInBounds({ x: 0, y: 0, z: 0 }, DEFAULT_SIZE)).toBe(true);
    expect(isInBounds({ x: 7, y: 7, z: 2 }, DEFAULT_SIZE)).toBe(true);
  });

  it('returns false for out-of-bounds coords', () => {
    expect(isInBounds({ x: 8, y: 0, z: 0 }, DEFAULT_SIZE)).toBe(false);
    expect(isInBounds({ x: 0, y: 8, z: 0 }, DEFAULT_SIZE)).toBe(false);
    expect(isInBounds({ x: 0, y: 0, z: 3 }, DEFAULT_SIZE)).toBe(false);
    expect(isInBounds({ x: -1, y: 0, z: 0 }, DEFAULT_SIZE)).toBe(false);
  });
});

// ─── simulator.ts tests ─────────────────────────────────────────────

describe('createInitialState', () => {
  it('initializes with start position visited', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, []);
    const state = createInitialState(puzzle);
    expect(state.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(state.visitedCells).toContain(coordKey({ x: 0, y: 0, z: 0 }));
    expect(state.commandCount).toBe(0);
    expect(state.travelDistance).toBe(0);
    expect(state.completed).toBe(false);
  });

  it('registers initial red cells', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, [
      { coord: { x: 3, y: 0, z: 0 }, type: 'INITIAL_RED' },
    ]);
    const state = createInitialState(puzzle);
    expect(state.redCells).toContain(coordKey({ x: 3, y: 0, z: 0 }));
  });

  it('registers number states', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, [
      { coord: { x: 2, y: 2, z: 0 }, type: 'NUMBER', requiredPasses: 3 },
    ]);
    const state = createInitialState(puzzle);
    expect(state.numberStates).toHaveLength(1);
    expect(state.numberStates[0].remainingPasses).toBe(3);
    expect(state.numberStates[0].requiredPasses).toBe(3);
  });
});

describe('executeDirection', () => {
  it('moves until boundary', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, []);
    const state = createInitialState(puzzle);

    const result = executeDirection({ puzzle, state, direction: 'X_POS' });
    expect(result.moved).toBe(true);
    expect(result.nextState.position).toEqual({ x: 7, y: 0, z: 0 });
    expect(result.nextState.commandCount).toBe(1);
    expect(result.nextState.travelDistance).toBe(7);
    expect(result.historyItem?.stopReason).toBe('BOUNDARY');
  });

  it('stops at yellow cell', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, [
      { coord: { x: 3, y: 0, z: 0 }, type: 'YELLOW_STOP' },
    ]);
    const state = createInitialState(puzzle);

    const result = executeDirection({ puzzle, state, direction: 'X_POS' });
    expect(result.moved).toBe(true);
    expect(result.nextState.position).toEqual({ x: 3, y: 0, z: 0 });
    expect(result.historyItem?.stopReason).toBe('YELLOW_STOP');
  });

  it('stops before red cell', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, [
      { coord: { x: 3, y: 0, z: 0 }, type: 'INITIAL_RED' },
    ]);
    const state = createInitialState(puzzle);

    const result = executeDirection({ puzzle, state, direction: 'X_POS' });
    expect(result.moved).toBe(true);
    expect(result.nextState.position).toEqual({ x: 2, y: 0, z: 0 });
    expect(result.historyItem?.stopReason).toBe('RED_BLOCK');
  });

  it('stops at disabled cell', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, [
      { coord: { x: 3, y: 0, z: 0 }, type: 'DISABLED' },
    ]);
    const state = createInitialState(puzzle);

    const result = executeDirection({ puzzle, state, direction: 'X_POS' });
    expect(result.moved).toBe(true);
    expect(result.nextState.position).toEqual({ x: 2, y: 0, z: 0 });
    expect(result.historyItem?.stopReason).toBe('DISABLED');
  });

  it('returns NO_MOVEMENT when immediately blocked', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, [
      { coord: { x: 1, y: 0, z: 0 }, type: 'INITIAL_RED' },
    ]);
    const state = createInitialState(puzzle);

    const result = executeDirection({ puzzle, state, direction: 'X_POS' });
    expect(result.moved).toBe(false);
    expect(result.invalidReason).toBe('NO_MOVEMENT');
    expect(result.nextState.commandCount).toBe(0);
  });

  it('handles number cell countdown', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, [
      { coord: { x: 2, y: 0, z: 0 }, type: 'NUMBER', requiredPasses: 2 },
    ]);
    const state = createInitialState(puzzle);

    // First pass
    const result1 = executeDirection({ puzzle, state, direction: 'X_POS' });
    expect(result1.moved).toBe(true);
    const ns1 = result1.nextState.numberStates.find(
      (ns) => coordKey(ns.coord) === coordKey({ x: 2, y: 0, z: 0 }),
    );
    expect(ns1?.remainingPasses).toBe(1);
    expect(result1.nextState.redCells).not.toContain(coordKey({ x: 2, y: 0, z: 0 }));

    // Second pass - should turn red
    const result2 = executeDirection({
      puzzle,
      state: result1.nextState,
      direction: 'X_NEG',
    });
    // After X_NEG from (7,0,0), it would move to (0,0,0)
    // But the number cell at (2,0,0) is on the way back
    // Actually, going X_NEG from (7,0,0) stops at boundary (0,0,0)
    // The number cell is at (2,0,0) which is passed through
    const ns2 = result2.nextState.numberStates.find(
      (ns) => coordKey(ns.coord) === coordKey({ x: 2, y: 0, z: 0 }),
    );
    expect(ns2?.remainingPasses).toBe(0);
    expect(result2.nextState.redCells).toContain(coordKey({ x: 2, y: 0, z: 0 }));
  });

  it('marks cells as visited', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, []);
    const state = createInitialState(puzzle);

    const result = executeDirection({ puzzle, state, direction: 'X_POS' });
    // Should have visited (0,0,0) through (7,0,0)
    for (let x = 0; x <= 7; x++) {
      expect(result.nextState.visitedCells).toContain(coordKey({ x, y: 0, z: 0 }));
    }
  });

  it('handles Z direction (layer change)', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, []);
    const state = createInitialState(puzzle);

    const result = executeDirection({ puzzle, state, direction: 'Z_POS' });
    expect(result.moved).toBe(true);
    expect(result.nextState.position).toEqual({ x: 0, y: 0, z: 2 });
    expect(result.historyItem?.stopReason).toBe('BOUNDARY');
  });
});

describe('undoCommand', () => {
  it('undoes the last command', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, []);
    let state = createInitialState(puzzle);

    const r1 = executeDirection({ puzzle, state, direction: 'X_POS' });
    state = r1.nextState;
    expect(state.position).toEqual({ x: 7, y: 0, z: 0 });
    expect(state.commandCount).toBe(1);

    const undoResult = undoCommand(state);
    expect(undoResult.success).toBe(true);
    expect(undoResult.nextState.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(undoResult.nextState.commandCount).toBe(0);
    expect(undoResult.nextState.commandHistory).toHaveLength(0);
  });

  it('returns false when no commands to undo', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, []);
    const state = createInitialState(puzzle);

    const result = undoCommand(state);
    expect(result.success).toBe(false);
  });
});

describe('isCompleted', () => {
  it('returns false when not all cells visited', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, []);
    const state = createInitialState(puzzle);
    expect(isCompleted(state, puzzle)).toBe(false);
  });

  it('returns true when all required cells visited', () => {
    // Tiny 2x2x1 puzzle for easy testing
    const tinyPuzzle = buildPuzzleSnapshot('tiny', 1, { width: 2, height: 2, depth: 1 }, { x: 0, y: 0, z: 0 }, []);
    let state = createInitialState(tinyPuzzle);

    // Visit all 4 cells
    const r1 = executeDirection({ puzzle: tinyPuzzle, state, direction: 'X_POS' });
    state = r1.nextState;
    const r2 = executeDirection({ puzzle: tinyPuzzle, state, direction: 'Y_POS' });
    state = r2.nextState;
    const r3 = executeDirection({ puzzle: tinyPuzzle, state, direction: 'X_NEG' });
    state = r3.nextState;

    expect(state.visitedCells).toContain(coordKey({ x: 0, y: 0, z: 0 }));
    expect(state.visitedCells).toContain(coordKey({ x: 1, y: 0, z: 0 }));
    expect(state.visitedCells).toContain(coordKey({ x: 1, y: 1, z: 0 }));
    expect(state.visitedCells).toContain(coordKey({ x: 0, y: 1, z: 0 }));
    expect(isCompleted(state, tinyPuzzle)).toBe(true);
  });

  it('does not require disabled or initial red cells', () => {
    const tinyPuzzle = buildPuzzleSnapshot('tiny', 1, { width: 2, height: 1, depth: 1 }, { x: 0, y: 0, z: 0 }, [
      { coord: { x: 1, y: 0, z: 0 }, type: 'INITIAL_RED' },
    ]);
    const state = createInitialState(tinyPuzzle);
    // Only (0,0,0) needs to be visited, and it already is
    expect(isCompleted(state, tinyPuzzle)).toBe(true);
  });
});

// ─── validator.ts tests ─────────────────────────────────────────────

describe('validatePuzzleStructure', () => {
  it('validates a correct puzzle', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, []);
    const report = validatePuzzleStructure(puzzle);
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it('rejects wrong size', () => {
    const puzzle = buildPuzzleSnapshot('test', 1, { width: 4, height: 4, depth: 2 }, { x: 0, y: 0, z: 0 }, []);
    const report = validatePuzzleStructure(puzzle);
    expect(report.valid).toBe(false);
    expect(report.errors[0].code).toBe('INVALID_SIZE');
  });

  it('rejects number cell without requiredPasses', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, [
      { coord: { x: 2, y: 2, z: 0 }, type: 'NUMBER' },
    ]);
    const report = validatePuzzleStructure(puzzle);
    expect(report.valid).toBe(false);
    expect(report.errors[0].code).toBe('INVALID_NUMBER_CELL');
  });
});

describe('validateReferenceSolution', () => {
  it('validates a correct solution', () => {
    // Tiny 2x2x1 puzzle
    const tinyPuzzle = buildPuzzleSnapshot('tiny', 1, { width: 2, height: 2, depth: 1 }, { x: 0, y: 0, z: 0 }, []);
    const solution: AbsoluteCommandDirection[] = ['X_POS', 'Y_POS', 'X_NEG'];
    const result = validateReferenceSolution(tinyPuzzle, solution);
    expect(result.completed).toBe(true);
    expect(result.commandCount).toBe(3);
  });

  it('reports incomplete solution', () => {
    const tinyPuzzle = buildPuzzleSnapshot('tiny', 1, { width: 2, height: 2, depth: 1 }, { x: 0, y: 0, z: 0 }, []);
    const solution: AbsoluteCommandDirection[] = ['X_POS'];
    const result = validateReferenceSolution(tinyPuzzle, solution);
    expect(result.completed).toBe(false);
  });
});

describe('validateAbsoluteCommandPuzzle', () => {
  it('validates structure without reference solution', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, []);
    const report = validateAbsoluteCommandPuzzle(puzzle);
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it('rejects puzzle with wrong size', () => {
    const smallPuzzle = buildPuzzleSnapshot('small', 1, { width: 4, height: 4, depth: 2 }, { x: 0, y: 0, z: 0 }, []);
    const report = validateAbsoluteCommandPuzzle(smallPuzzle);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.code === 'INVALID_SIZE')).toBe(true);
  });

  it('rejects when reference solution does not complete', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, []);
    const incompleteSolution: AbsoluteCommandDirection[] = ['X_POS'];
    const report = validateAbsoluteCommandPuzzle(puzzle, incompleteSolution);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.code === 'SOLUTION_DOES_NOT_COMPLETE')).toBe(true);
  });

  it('accepts valid structure with special cells', () => {
    const puzzle = makePuzzle({ x: 0, y: 0, z: 0 }, [
      { coord: { x: 3, y: 3, z: 0 }, type: 'NUMBER', requiredPasses: 2 },
      { coord: { x: 5, y: 5, z: 1 }, type: 'YELLOW_STOP' },
      { coord: { x: 7, y: 7, z: 2 }, type: 'INITIAL_RED' },
    ]);
    const report = validateAbsoluteCommandPuzzle(puzzle);
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });
});
