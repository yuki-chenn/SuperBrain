export type Tile = number; // 0 = blank

export interface SlidingPuzzleState {
  size: number;
  board: Tile[]; // length = size * size
}

export interface ReplayResult {
  valid: boolean;
  finalState: SlidingPuzzleState;
  invalidMoveIndex?: number;
  reason?: string;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  invalidMoveIndex?: number;
  metrics?: { moves: number };
}
