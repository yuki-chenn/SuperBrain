import type { AdminCreateACPuzzle, AdminUpdateACPuzzle, AdminSaveMazeVersion, AdminListACPuzzlesResponse, AdminACPuzzleDetail, AdminValidatePuzzleResponse, AdminListAttemptsResponse, AdminAttemptReplay, AdminPuzzleLeaderboardResponse } from '@brain-games/shared';
export declare function adminListACPuzzlesApi(params?: {
    status?: string;
    difficultyLabel?: string;
    page?: number;
    pageSize?: number;
}): Promise<AdminListACPuzzlesResponse>;
export declare function adminGetACPuzzleDetailApi(puzzleId: string): Promise<AdminACPuzzleDetail>;
export declare function adminCreateACPuzzleApi(input: AdminCreateACPuzzle): Promise<unknown>;
export declare function adminUpdateACPuzzleApi(puzzleId: string, input: AdminUpdateACPuzzle): Promise<unknown>;
export declare function adminSaveMazeVersionApi(puzzleId: string, input: AdminSaveMazeVersion): Promise<unknown>;
export declare function adminValidatePuzzleApi(puzzleId: string): Promise<AdminValidatePuzzleResponse>;
export declare function adminPublishPuzzleApi(puzzleId: string): Promise<unknown>;
export declare function adminUnpublishPuzzleApi(puzzleId: string): Promise<unknown>;
export declare function adminGetACPuzzleAttemptsApi(puzzleId: string, params?: {
    page?: number;
    pageSize?: number;
}): Promise<AdminListAttemptsResponse>;
export declare function adminGetAttemptReplayApi(attemptId: string): Promise<AdminAttemptReplay>;
export declare function adminGetACPuzzleLeaderboardApi(puzzleId: string, params?: {
    limit?: number;
    offset?: number;
}): Promise<AdminPuzzleLeaderboardResponse>;
//# sourceMappingURL=ac-admin-api.d.ts.map