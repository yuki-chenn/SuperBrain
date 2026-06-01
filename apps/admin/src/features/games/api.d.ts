export interface AdminGame {
    id: string;
    slug: string;
    title: string;
    subtitle?: string;
    description: string;
    source?: string;
    coverUrl?: string;
    status: string;
    difficultyLevels: any[];
    metadata: any;
    puzzleCount: number;
    attemptCount: number;
    createdAt: string;
    updatedAt: string;
}
export interface AdminGameListResponse {
    items: AdminGame[];
    total: number;
}
export declare function adminListGamesApi(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
}): Promise<AdminGameListResponse>;
export declare function adminGetGameApi(gameId: string): Promise<AdminGame>;
export declare function adminUpdateGameApi(gameId: string, input: Partial<AdminGame>): Promise<{
    success: boolean;
}>;
export declare function adminPublishGameApi(gameId: string): Promise<{
    success: boolean;
}>;
export declare function adminArchiveGameApi(gameId: string): Promise<{
    success: boolean;
}>;
export declare function adminUpdateDimensionsApi(gameId: string, dimensions: Array<{
    key: string;
    label: string;
    value: number;
}>): Promise<{
    success: boolean;
    dimensions: Array<{
        key: string;
        label: string;
        value: number;
    }>;
}>;
//# sourceMappingURL=api.d.ts.map