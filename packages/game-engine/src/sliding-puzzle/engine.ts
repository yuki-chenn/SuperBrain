import type { SlidingPuzzleState, ReplayResult } from './types.js';

export function createSolvedBoard(size: number): number[] {
  const board: number[] = [];
  for (let i = 1; i < size * size; i++) {
    board.push(i);
  }
  board.push(0);
  return board;
}

export function isSolved(state: SlidingPuzzleState): boolean {
  const { size, board } = state;
  const total = size * size;
  for (let i = 0; i < total - 1; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[total - 1] === 0;
}

export function getBlankIndex(board: number[]): number {
  return board.indexOf(0);
}

export function areAdjacent(indexA: number, indexB: number, size: number): boolean {
  const rowA = Math.floor(indexA / size);
  const colA = indexA % size;
  const rowB = Math.floor(indexB / size);
  const colB = indexB % size;
  return (
    (rowA === rowB && Math.abs(colA - colB) === 1) ||
    (colA === colB && Math.abs(rowA - rowB) === 1)
  );
}

export function canMoveTile(state: SlidingPuzzleState, tile: number): boolean {
  const tileIndex = state.board.indexOf(tile);
  if (tileIndex === -1) return false;
  const blankIndex = getBlankIndex(state.board);
  return areAdjacent(tileIndex, blankIndex, state.size);
}

export function moveTile(state: SlidingPuzzleState, tile: number): SlidingPuzzleState {
  const newBoard = [...state.board];
  const tileIndex = newBoard.indexOf(tile);
  const blankIndex = newBoard.indexOf(0);
  newBoard[tileIndex] = 0;
  newBoard[blankIndex] = tile;
  return { size: state.size, board: newBoard };
}

export function replayMoves(
  initial: SlidingPuzzleState,
  moves: number[]
): ReplayResult {
  let current = { size: initial.size, board: [...initial.board] };

  for (let i = 0; i < moves.length; i++) {
    const tile = moves[i];
    if (!canMoveTile(current, tile)) {
      return {
        valid: false,
        finalState: current,
        invalidMoveIndex: i,
        reason: `ILLEGAL_MOVE_AT_INDEX_${i}`,
      };
    }
    current = moveTile(current, tile);
  }

  return {
    valid: isSolved(current),
    finalState: current,
    reason: isSolved(current) ? undefined : 'NOT_SOLVED',
  };
}
