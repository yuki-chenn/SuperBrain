export type Tile = number;
export interface SlidingPuzzleState {
    size: number;
    board: Tile[];
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
    metrics?: {
        moves: number;
    };
}
//# sourceMappingURL=types.d.ts.map