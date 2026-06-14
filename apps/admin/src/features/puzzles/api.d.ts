export interface AdminPuzzle {
    id: string;
    gameId: string;
    slug: string;
    title: string;
    description: string | null;
    difficultyId: string | null;
    status: string;
    currentVersionId: string | null;
    source: string | null;
    estimatedDurationSec: number | null;
    sortOrder: number;
    metadata: any;
    publishedAt: string | null;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
    versions?: AdminPuzzleVersion[];
}
export interface AdminPuzzleVersion {
    id: string;
    puzzleId: string;
    version: number;
    schemaVersion: number;
    engineKey: string;
    engineVersion: string | null;
    content: any;
    contentHash: string;
    referenceSolution: any | null;
    validationStatus: string;
    validationReport: any;
    status: string;
    publishedAt: string | null;
    createdAt: string;
}
export interface AdminPuzzleListResponse {
    items: AdminPuzzle[];
    total: number;
    page: number;
    pageSize: number;
}
export declare function adminListPuzzlesApi(params?: {
    gameId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
}): Promise<AdminPuzzleListResponse>;
export declare function adminGetPuzzleApi(id: string): Promise<AdminPuzzle>;
export declare function adminUpdatePuzzleApi(id: string, body: {
    title?: string;
    description?: string;
    difficultyId?: string | null;
    sortOrder?: number;
    source?: string;
}): Promise<AdminPuzzle>;
export interface AdminPuzzleVersionListItem extends AdminPuzzleVersion {
    puzzle: {
        id: string;
        gameId: string;
        title: string;
        slug: string;
        currentVersionId: string | null;
    };
}
export interface AdminPuzzleVersionListResponse {
    items: AdminPuzzleVersionListItem[];
    total: number;
    page: number;
    pageSize: number;
}
export declare function adminListPuzzleVersionsApi(params?: {
    gameId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
}): Promise<AdminPuzzleVersionListResponse>;
export declare function adminCreatePuzzleVersionApi(puzzleId: string, body: {
    engineKey: string;
    content: any;
}): Promise<AdminPuzzleVersion>;
export declare function adminUpdatePuzzleVersionApi(versionId: string, body: {
    content: any;
}): Promise<AdminPuzzleVersion>;
export declare function adminValidatePuzzleVersionApi(versionId: string): Promise<AdminPuzzleVersion>;
export declare function adminPublishPuzzleVersionApi(versionId: string): Promise<AdminPuzzleVersion>;
//# sourceMappingURL=api.d.ts.map