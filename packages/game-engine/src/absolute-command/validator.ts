import type {
  AbsoluteCommandPuzzleSnapshot,
  AbsoluteCommandCell,
  AbsoluteCommandDirection,
  AbsoluteCommandPuzzleValidationReport,
  MazeCoord,
} from './types.js';
import { coordKey, isInBounds, directionToDelta, addCoord } from './coord.js';
import { createInitialState, executeDirection, isCompleted } from './simulator.js';

// ─── Puzzle structural validation ───────────────────────────────────

export function validatePuzzleStructure(
  puzzle: AbsoluteCommandPuzzleSnapshot,
): AbsoluteCommandPuzzleValidationReport {
  const errors: AbsoluteCommandPuzzleValidationReport['errors'] = [];
  const warnings: AbsoluteCommandPuzzleValidationReport['warnings'] = [];
  const { size, cells, startCoord } = puzzle;

  // Size must be 8x8x3
  if (size.width !== 8 || size.height !== 8 || size.depth !== 3) {
    errors.push({ code: 'INVALID_SIZE', message: 'Size must be 8x8x3' });
  }

  // Start coord in bounds
  if (!isInBounds(startCoord, size)) {
    errors.push({ code: 'START_OUT_OF_BOUNDS', message: 'Start coordinate out of bounds', coord: startCoord });
  }

  // Check for duplicate coords
  const coordSet = new Set<string>();
  let startCount = 0;

  for (const cell of cells) {
    const key = coordKey(cell.coord);

    if (!isInBounds(cell.coord, size)) {
      errors.push({ code: 'CELL_OUT_OF_BOUNDS', message: `Cell out of bounds: ${key}`, coord: cell.coord });
      continue;
    }

    if (coordSet.has(key)) {
      errors.push({ code: 'DUPLICATE_CELL', message: `Duplicate cell at ${key}`, coord: cell.coord });
    }
    coordSet.add(key);

    if (cell.type === 'START') {
      startCount++;
      if (!coordKey(cell.coord).includes(coordKey(startCoord).split(',')[0])) {
        // Start cell coord should match startCoord
      }
    }

    // Number cells must have requiredPasses > 0
    if (cell.type === 'NUMBER') {
      if (!cell.requiredPasses || cell.requiredPasses < 1) {
        errors.push({
          code: 'INVALID_NUMBER_CELL',
          message: `Number cell at ${key} must have requiredPasses >= 1`,
          coord: cell.coord,
        });
      }
    }

    // Start cell cannot be other special types
    if (cell.type === 'START') {
      // ok
    }
  }

  // Must have exactly one START
  const startCell = cells.find((c) => c.type === 'START');
  if (!startCell) {
    // If no explicit START cell, startCoord is used. That's fine.
  } else if (!coordEquals(startCell.coord, startCoord)) {
    warnings.push({
      code: 'START_MISMATCH',
      message: 'START cell coord does not match startCoord',
      coord: startCell.coord,
    });
  }

  // Check for unreachable areas (simplified: just warn if many disabled cells)
  const disabledCount = cells.filter((c) => c.type === 'DISABLED').length;
  if (disabledCount > 0) {
    warnings.push({
      code: 'HAS_DISABLED_CELLS',
      message: `Puzzle has ${disabledCount} disabled cells`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function coordEquals(a: MazeCoord, b: MazeCoord): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

// ─── Reference solution validation ──────────────────────────────────

export function validateReferenceSolution(
  puzzle: AbsoluteCommandPuzzleSnapshot,
  solution: AbsoluteCommandDirection[],
): NonNullable<AbsoluteCommandPuzzleValidationReport['referenceSolutionResult']> {
  let state = createInitialState(puzzle);

  for (const direction of solution) {
    const result = executeDirection({ puzzle, state, direction });
    if (!result.moved) {
      // Invalid move in reference solution
      return {
        completed: false,
        commandCount: state.commandCount,
        durationIndependent: true,
        visitedCellCount: state.visitedCells.length,
        requiredVisitCellCount: computeRequiredVisitCellCount(puzzle),
      };
    }
    state = result.nextState;
  }

  return {
    completed: state.completed,
    commandCount: state.commandCount,
    durationIndependent: true,
    visitedCellCount: state.visitedCells.length,
    requiredVisitCellCount: computeRequiredVisitCellCount(puzzle),
  };

  return {
    completed: state.completed,
    commandCount: state.commandCount,
    durationIndependent: true,
    visitedCellCount: state.visitedCells.length,
    requiredVisitCellCount: computeRequiredVisitCellCount(puzzle),
  };
}

function computeRequiredVisitCellCount(puzzle: AbsoluteCommandPuzzleSnapshot): number {
  const configuredKeys = new Set(puzzle.cells.map((c) => coordKey(c.coord)));
  let count = 0;

  for (const cell of puzzle.cells) {
    if (cell.type === 'DISABLED' || cell.type === 'INITIAL_RED') continue;
    count++;
  }

  // Unconfigured cells are NORMAL
  const { width, height, depth } = puzzle.size;
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!configuredKeys.has(coordKey({ x, y, z }))) {
          count++;
        }
      }
    }
  }

  return count;
}

// ─── Full puzzle validation (structure + optional reference solution) ──

export function validateAbsoluteCommandPuzzle(
  puzzle: AbsoluteCommandPuzzleSnapshot,
  referenceSolution?: AbsoluteCommandDirection[],
): AbsoluteCommandPuzzleValidationReport {
  const structureReport = validatePuzzleStructure(puzzle);
  if (!structureReport.valid) return structureReport;

  if (referenceSolution && referenceSolution.length > 0) {
    const solutionResult = validateReferenceSolution(puzzle, referenceSolution);
    structureReport.referenceSolutionResult = solutionResult;
    if (!solutionResult.completed) {
      structureReport.errors.push({
        code: 'SOLUTION_DOES_NOT_COMPLETE',
        message: 'Reference solution does not complete the puzzle',
      });
      structureReport.valid = false;
    }
  }

  return structureReport;
}
