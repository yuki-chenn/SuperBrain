import type {
  AdjacencyMode,
  Coord,
  Radical,
  RoundSubmissionState,
  ValidateRoundPathInput,
  ValidateRoundPathResult,
} from './types.js';
import { BOARD_SIZE, PICKS_PER_ROUND } from './types.js';

export function indexToCoord(index: number): Coord {
  return {
    row: Math.floor(index / BOARD_SIZE),
    col: index % BOARD_SIZE,
  };
}

export function coordToIndex(row: number, col: number): number {
  return row * BOARD_SIZE + col;
}

export function isAdjacent8(a: Coord, b: Coord): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
}

export function isAdjacent4(a: Coord, b: Coord): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr + dc === 1;
}

export function isAdjacent(a: Coord, b: Coord, mode: AdjacencyMode): boolean {
  return mode === 'KING_8' ? isAdjacent8(a, b) : isAdjacent4(a, b);
}

export function validateRoundPath(
  input: ValidateRoundPathInput,
): ValidateRoundPathResult {
  const { currentPosition, selectedCellIndices, litCellIndices, adjacencyMode } =
    input;

  if (selectedCellIndices.length !== PICKS_PER_ROUND) {
    return { valid: false, reason: 'INVALID_PATH_LENGTH' };
  }

  const seen = new Set<number>();

  for (const index of selectedCellIndices) {
    if (index < 0 || index >= BOARD_SIZE * BOARD_SIZE) {
      return { valid: false, reason: 'CELL_OUT_OF_RANGE' };
    }
    if (seen.has(index)) {
      return { valid: false, reason: 'DUPLICATED_CELL_IN_ROUND' };
    }
    if (litCellIndices.has(index)) {
      return { valid: false, reason: 'CELL_ALREADY_LIT' };
    }
    seen.add(index);
  }

  const coords = selectedCellIndices.map(indexToCoord);

  if (currentPosition) {
    if (!isAdjacent(currentPosition, coords[0], adjacencyMode)) {
      return { valid: false, reason: 'FIRST_CELL_NOT_ADJACENT' };
    }
  }

  for (let i = 1; i < coords.length; i++) {
    if (!isAdjacent(coords[i - 1], coords[i], adjacencyMode)) {
      return { valid: false, reason: 'PATH_BROKEN' };
    }
  }

  return { valid: true };
}

export function getAvailableRadicals(
  radicalPool: Radical[],
  disabledKeys: string[],
): Radical[] {
  const disabled = new Set(disabledKeys);
  return radicalPool.filter((r) => !disabled.has(r.key));
}

export function isRadicalAvailable(
  radicalKey: string,
  disabledKeys: string[],
): boolean {
  return !disabledKeys.includes(radicalKey);
}

export function updateStateAfterSuccess(
  state: RoundSubmissionState,
  selectedCellIndices: number[],
  selectedRadicalKeys: string[],
): RoundSubmissionState {
  const lastCellIndex = selectedCellIndices[selectedCellIndices.length - 1];
  const lastCoord = indexToCoord(lastCellIndex);

  // Disabled keys = unique set of radicals used in this round
  const usedRadicalKeys = [...new Set(selectedRadicalKeys)];

  return {
    currentRoundIndex: state.currentRoundIndex + 1,
    currentPosition: lastCoord,
    litCellIndices: [...state.litCellIndices, ...selectedCellIndices],
    disabledRadicalKeys: usedRadicalKeys,
    errorCount: state.errorCount,
  };
}
