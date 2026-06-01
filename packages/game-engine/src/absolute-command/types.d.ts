export type AbsoluteCommandDirection = 'X_POS' | 'X_NEG' | 'Y_POS' | 'Y_NEG' | 'Z_POS' | 'Z_NEG';
export declare const ALL_DIRECTIONS: AbsoluteCommandDirection[];
export interface MazeCoord {
    x: number;
    y: number;
    z: number;
}
export type AbsoluteCommandCellType = 'NORMAL' | 'YELLOW_STOP' | 'NUMBER' | 'INITIAL_RED' | 'DISABLED' | 'START';
export interface AbsoluteCommandCell {
    coord: MazeCoord;
    type: AbsoluteCommandCellType;
    requiredPasses?: number;
    label?: string;
    adminNote?: string;
}
export interface AbsoluteCommandPuzzleSnapshot {
    puzzleId: string;
    puzzleVersion: number;
    size: {
        width: number;
        height: number;
        depth: number;
    };
    startCoord: MazeCoord;
    cells: AbsoluteCommandCell[];
}
export interface AbsoluteCommandRuntimeState {
    position: MazeCoord;
    visitedCells: string[];
    redCells: string[];
    numberStates: Array<{
        coord: MazeCoord;
        requiredPasses: number;
        remainingPasses: number;
    }>;
    commandCount: number;
    travelDistance: number;
    commandHistory: AbsoluteCommandHistoryItem[];
    completed: boolean;
}
export interface AbsoluteCommandHistoryItem {
    index: number;
    direction: AbsoluteCommandDirection;
    from: MazeCoord;
    to: MazeCoord;
    path: MazeCoord[];
    stopReason: 'BOUNDARY' | 'DISABLED' | 'RED_BLOCK' | 'YELLOW_STOP';
    changedNumberCells: Array<{
        coord: MazeCoord;
        beforeRemaining: number;
        afterRemaining: number;
        becameRed: boolean;
    }>;
    snapshotBefore: AbsoluteCommandRuntimeStateSnapshot;
    snapshotAfter: AbsoluteCommandRuntimeStateSnapshot;
    createdAt: string;
}
export interface AbsoluteCommandRuntimeStateSnapshot {
    position: MazeCoord;
    visitedCells: string[];
    redCells: string[];
    numberStates: Array<{
        coord: MazeCoord;
        requiredPasses: number;
        remainingPasses: number;
    }>;
    commandCount: number;
    travelDistance: number;
}
export interface AbsoluteCommandExecuteDirectionInput {
    puzzle: AbsoluteCommandPuzzleSnapshot;
    state: AbsoluteCommandRuntimeState;
    direction: AbsoluteCommandDirection;
    now?: string;
}
export interface AbsoluteCommandExecuteDirectionResult {
    moved: boolean;
    invalidReason?: 'NO_MOVEMENT';
    nextState: AbsoluteCommandRuntimeState;
    historyItem?: AbsoluteCommandHistoryItem;
    completed: boolean;
}
export interface AbsoluteCommandPuzzleValidationReport {
    valid: boolean;
    errors: Array<{
        code: string;
        message: string;
        coord?: MazeCoord;
    }>;
    warnings: Array<{
        code: string;
        message: string;
        coord?: MazeCoord;
    }>;
    referenceSolutionResult?: {
        completed: boolean;
        commandCount: number;
        durationIndependent: true;
        visitedCellCount: number;
        requiredVisitCellCount: number;
    };
}
export declare const AC_MAZE_WIDTH = 8;
export declare const AC_MAZE_HEIGHT = 8;
export declare const AC_MAZE_DEPTH = 3;
export declare const AC_TOTAL_CELLS: number;
//# sourceMappingURL=types.d.ts.map