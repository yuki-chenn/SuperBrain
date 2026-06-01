import type { MazeCoord, AbsoluteCommandPuzzleSnapshot, AbsoluteCommandRuntimeState, AbsoluteCommandExecuteDirectionInput, AbsoluteCommandExecuteDirectionResult, AbsoluteCommandCell } from './types.js';
export declare function isCompleted(state: AbsoluteCommandRuntimeState, puzzle: AbsoluteCommandPuzzleSnapshot): boolean;
export declare function executeDirection(input: AbsoluteCommandExecuteDirectionInput): AbsoluteCommandExecuteDirectionResult;
export declare function undoCommand(state: AbsoluteCommandRuntimeState): {
    success: boolean;
    nextState: AbsoluteCommandRuntimeState;
};
export declare function createInitialState(puzzle: AbsoluteCommandPuzzleSnapshot): AbsoluteCommandRuntimeState;
export declare function buildPuzzleSnapshot(puzzleId: string, puzzleVersion: number, size: {
    width: number;
    height: number;
    depth: number;
}, startCoord: MazeCoord, cells: AbsoluteCommandCell[]): AbsoluteCommandPuzzleSnapshot;
//# sourceMappingURL=simulator.d.ts.map