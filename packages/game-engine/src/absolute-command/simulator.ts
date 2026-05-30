import type {
  MazeCoord,
  AbsoluteCommandDirection,
  AbsoluteCommandPuzzleSnapshot,
  AbsoluteCommandRuntimeState,
  AbsoluteCommandHistoryItem,
  AbsoluteCommandExecuteDirectionInput,
  AbsoluteCommandExecuteDirectionResult,
  AbsoluteCommandRuntimeStateSnapshot,
  AbsoluteCommandCell,
} from './types.js';
import { coordKey, directionToDelta, addCoord, isInBounds, cloneCoord } from './coord.js';

// ─── Cell lookup helpers ────────────────────────────────────────────

function buildCellMap(puzzle: AbsoluteCommandPuzzleSnapshot): Map<string, AbsoluteCommandCell> {
  const map = new Map<string, AbsoluteCommandCell>();
  for (const cell of puzzle.cells) {
    map.set(coordKey(cell.coord), cell);
  }
  return map;
}

function getCellAt(
  coord: MazeCoord,
  cellMap: Map<string, AbsoluteCommandCell>,
): AbsoluteCommandCell | undefined {
  return cellMap.get(coordKey(coord));
}

function isDisabledCell(coord: MazeCoord, cellMap: Map<string, AbsoluteCommandCell>): boolean {
  const cell = getCellAt(coord, cellMap);
  return cell?.type === 'DISABLED';
}

function isYellowStopCell(coord: MazeCoord, cellMap: Map<string, AbsoluteCommandCell>): boolean {
  const cell = getCellAt(coord, cellMap);
  return cell?.type === 'YELLOW_STOP';
}

function isNumberCell(coord: MazeCoord, cellMap: Map<string, AbsoluteCommandCell>): AbsoluteCommandCell | undefined {
  const cell = getCellAt(coord, cellMap);
  return cell?.type === 'NUMBER' ? cell : undefined;
}

function isInitialRedCell(coord: MazeCoord, cellMap: Map<string, AbsoluteCommandCell>): boolean {
  const cell = getCellAt(coord, cellMap);
  return cell?.type === 'INITIAL_RED';
}

// ─── State helpers ──────────────────────────────────────────────────

function isRedCell(coord: MazeCoord, state: AbsoluteCommandRuntimeState): boolean {
  return state.redCells.includes(coordKey(coord));
}

function isVisited(coord: MazeCoord, state: AbsoluteCommandRuntimeState): boolean {
  return state.visitedCells.includes(coordKey(coord));
}

function markVisited(coord: MazeCoord, state: AbsoluteCommandRuntimeState): void {
  const key = coordKey(coord);
  if (!state.visitedCells.includes(key)) {
    state.visitedCells.push(key);
  }
}

function getNumberState(
  coord: MazeCoord,
  state: AbsoluteCommandRuntimeState,
): { coord: MazeCoord; requiredPasses: number; remainingPasses: number } | undefined {
  const key = coordKey(coord);
  return state.numberStates.find((ns) => coordKey(ns.coord) === key);
}

function cloneState(state: AbsoluteCommandRuntimeState): AbsoluteCommandRuntimeStateSnapshot {
  return {
    position: cloneCoord(state.position),
    visitedCells: [...state.visitedCells],
    redCells: [...state.redCells],
    numberStates: state.numberStates.map((ns) => ({
      coord: cloneCoord(ns.coord),
      requiredPasses: ns.requiredPasses,
      remainingPasses: ns.remainingPasses,
    })),
    commandCount: state.commandCount,
    travelDistance: state.travelDistance,
  };
}

function restoreSnapshot(
  snapshot: AbsoluteCommandRuntimeStateSnapshot,
): AbsoluteCommandRuntimeState {
  return {
    position: cloneCoord(snapshot.position),
    visitedCells: [...snapshot.visitedCells],
    redCells: [...snapshot.redCells],
    numberStates: snapshot.numberStates.map((ns) => ({
      coord: cloneCoord(ns.coord),
      requiredPasses: ns.requiredPasses,
      remainingPasses: ns.remainingPasses,
    })),
    commandCount: snapshot.commandCount,
    travelDistance: snapshot.travelDistance,
    commandHistory: [],
    completed: false,
  };
}

// ─── Completion check ───────────────────────────────────────────────

function computeRequiredVisitCells(
  puzzle: AbsoluteCommandPuzzleSnapshot,
): string[] {
  const required: string[] = [];
  for (const cell of puzzle.cells) {
    if (cell.type === 'DISABLED' || cell.type === 'INITIAL_RED') continue;
    required.push(coordKey(cell.coord));
  }
  // Also include coords that have no explicit cell config (default NORMAL)
  const { width, height, depth } = puzzle.size;
  const configuredKeys = new Set(puzzle.cells.map((c) => coordKey(c.coord)));
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = coordKey({ x, y, z });
        if (!configuredKeys.has(key)) {
          required.push(key);
        }
      }
    }
  }
  return required;
}

export function isCompleted(
  state: AbsoluteCommandRuntimeState,
  puzzle: AbsoluteCommandPuzzleSnapshot,
): boolean {
  const required = computeRequiredVisitCells(puzzle);
  const visitedSet = new Set(state.visitedCells);
  return required.every((key) => visitedSet.has(key));
}

// ─── Core: executeDirection ─────────────────────────────────────────

export function executeDirection(
  input: AbsoluteCommandExecuteDirectionInput,
): AbsoluteCommandExecuteDirectionResult {
  const { puzzle, state, direction } = input;
  const now = input.now ?? new Date().toISOString();

  const snapshotBefore = cloneState(state);
  const cellMap = buildCellMap(puzzle);

  let current = cloneCoord(state.position);
  const delta = directionToDelta(direction);
  const path: MazeCoord[] = [];
  const changedNumberCells: AbsoluteCommandHistoryItem['changedNumberCells'] = [];
  let stopReason: AbsoluteCommandHistoryItem['stopReason'] = 'BOUNDARY';

  // Work on a mutable copy of the state
  const workingState: AbsoluteCommandRuntimeState = {
    position: cloneCoord(state.position),
    visitedCells: [...state.visitedCells],
    redCells: [...state.redCells],
    numberStates: state.numberStates.map((ns) => ({
      coord: cloneCoord(ns.coord),
      requiredPasses: ns.requiredPasses,
      remainingPasses: ns.remainingPasses,
    })),
    commandCount: state.commandCount,
    travelDistance: state.travelDistance,
    commandHistory: [...state.commandHistory],
    completed: state.completed,
  };

  while (true) {
    const next = addCoord(current, delta);

    // Check boundary
    if (!isInBounds(next, puzzle.size)) {
      stopReason = 'BOUNDARY';
      break;
    }

    // Check disabled
    if (isDisabledCell(next, cellMap)) {
      stopReason = 'DISABLED';
      break;
    }

    // Check red (blocking)
    if (isRedCell(next, workingState)) {
      stopReason = 'RED_BLOCK';
      break;
    }

    // Check initial red
    if (isInitialRedCell(next, cellMap)) {
      stopReason = 'RED_BLOCK';
      break;
    }

    // Enter the cell
    current = next;
    path.push(cloneCoord(current));
    markVisited(current, workingState);

    // Handle number cell
    const numCell = isNumberCell(current, cellMap);
    if (numCell) {
      const ns = getNumberState(current, workingState);
      if (ns && ns.remainingPasses > 0) {
        const before = ns.remainingPasses;
        ns.remainingPasses -= 1;
        const becameRed = ns.remainingPasses === 0;
        changedNumberCells.push({
          coord: cloneCoord(current),
          beforeRemaining: before,
          afterRemaining: ns.remainingPasses,
          becameRed,
        });
        if (becameRed) {
          const key = coordKey(current);
          if (!workingState.redCells.includes(key)) {
            workingState.redCells.push(key);
          }
        }
      }
    }

    // Check yellow stop
    if (isYellowStopCell(current, cellMap)) {
      stopReason = 'YELLOW_STOP';
      break;
    }
  }

  // No movement = invalid
  if (path.length === 0) {
    return {
      moved: false,
      invalidReason: 'NO_MOVEMENT',
      nextState: state,
      completed: false,
    };
  }

  // Update working state
  workingState.position = current;
  workingState.commandCount += 1;
  workingState.travelDistance += path.length;

  const snapshotAfter = cloneState(workingState);
  const historyItem: AbsoluteCommandHistoryItem = {
    index: state.commandHistory.length,
    direction,
    from: cloneCoord(state.position),
    to: cloneCoord(current),
    path: path.map(cloneCoord),
    stopReason,
    changedNumberCells,
    snapshotBefore,
    snapshotAfter,
    createdAt: now,
  };

  workingState.commandHistory.push(historyItem);
  workingState.completed = isCompleted(workingState, puzzle);

  return {
    moved: true,
    nextState: workingState,
    historyItem,
    completed: workingState.completed,
  };
}

// ─── Undo ───────────────────────────────────────────────────────────

export function undoCommand(
  state: AbsoluteCommandRuntimeState,
): { success: boolean; nextState: AbsoluteCommandRuntimeState } {
  if (state.commandHistory.length === 0) {
    return { success: false, nextState: state };
  }

  const lastItem = state.commandHistory[state.commandHistory.length - 1];
  const restored = restoreSnapshot(lastItem.snapshotBefore);
  restored.commandHistory = state.commandHistory.slice(0, -1);
  restored.completed = false;

  return { success: true, nextState: restored };
}

// ─── Reset ──────────────────────────────────────────────────────────

export function createInitialState(
  puzzle: AbsoluteCommandPuzzleSnapshot,
): AbsoluteCommandRuntimeState {
  const visitedCells = [coordKey(puzzle.startCoord)];
  const redCells: string[] = [];
  const numberStates: AbsoluteCommandRuntimeState['numberStates'] = [];

  for (const cell of puzzle.cells) {
    if (cell.type === 'INITIAL_RED') {
      redCells.push(coordKey(cell.coord));
    }
    if (cell.type === 'NUMBER' && cell.requiredPasses) {
      numberStates.push({
        coord: cloneCoord(cell.coord),
        requiredPasses: cell.requiredPasses,
        remainingPasses: cell.requiredPasses,
      });
    }
  }

  return {
    position: cloneCoord(puzzle.startCoord),
    visitedCells,
    redCells,
    numberStates,
    commandCount: 0,
    travelDistance: 0,
    commandHistory: [],
    completed: false,
  };
}

// ─── Puzzle snapshot from DB data ───────────────────────────────────

export function buildPuzzleSnapshot(
  puzzleId: string,
  puzzleVersion: number,
  size: { width: number; height: number; depth: number },
  startCoord: MazeCoord,
  cells: AbsoluteCommandCell[],
): AbsoluteCommandPuzzleSnapshot {
  return { puzzleId, puzzleVersion, size, startCoord, cells };
}
