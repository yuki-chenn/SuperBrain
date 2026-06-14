export interface AdminGame {
    id: string;
    slug: string;
    title: string;
    subtitle?: string;
    description: string;
    source?: string;
    coverUrl?: string;
    status: string;
    sortOrder: number;
    difficultyLevels: any[];
    metadata: any;
    puzzleCount: number;
    attemptCount: number;
    createdAt: string;
    updatedAt: string;
    ruleSetVersions?: any[];
    difficulties?: any[];
    contentPolicies?: any[];
    challengePolicies?: any[];
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
export interface AdminDifficulty {
    id: string;
    gameId: string;
    key: string;
    label: string;
    version: number;
    sortOrder: number;
    maxDurationMs: number | null;
    config: any;
    configHash: string;
    status: string;
    activatedAt: string | null;
    createdAt: string;
    updatedAt: string;
    game?: {
        id: string;
        title: string;
        slug: string;
    };
    contentPolicies?: AdminContentPolicy[];
    challengePolicies?: AdminChallengePolicy[];
}
export interface AdminContentPolicy {
    id: string;
    gameId: string;
    difficultyId: string | null;
    mode: string | null;
    contentMode: string;
    selectionStrategy: string;
    generatorKey: string | null;
    generatorConfig: any;
    puzzlePoolFilter: any;
    scheduleGranularity: string | null;
    allowRepeatedPuzzle: boolean;
    repeatCooldownHours: number | null;
    weightConfig: any;
    status: string;
    activatedAt: string | null;
    createdAt: string;
    updatedAt: string;
    game?: {
        id: string;
        title: string;
        slug: string;
    };
}
export interface AdminRuleVersion {
    id: string;
    gameId: string;
    version: number;
    name: string;
    engineKey: string;
    engineVersion: string | null;
    schemaVersion: number;
    config: any;
    configHash: string;
    validationStatus: string;
    validationReport: any;
    status: string;
    activatedAt: string | null;
    createdAt: string;
    game?: {
        id: string;
        title: string;
        slug: string;
    };
}
export interface AdminChallengePolicy {
    id: string;
    gameId: string;
    mode: string;
    difficultyId: string | null;
    allowResume: boolean;
    allowMultipleActive: boolean;
    requiresHeartbeat: boolean;
    heartbeatIntervalSec: number;
    heartbeatTimeoutSec: number;
    operationLogMode: string;
    operationBatchSize: number;
    snapshotEveryNEvents: number | null;
    saveInitialSnapshot: boolean;
    saveFinalSnapshot: boolean;
    eligibleForLeaderboard: boolean;
    maxSubmitRetry: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    game?: {
        id: string;
        title: string;
        slug: string;
    };
}
export interface EntityListResponse<T> {
    items: T[];
    total: number;
}
export declare function adminListDifficultiesApi(params?: {
    gameId?: string;
    status?: string;
    key?: string;
}): Promise<EntityListResponse<AdminDifficulty>>;
export declare function adminGetDifficultyApi(id: string): Promise<AdminDifficulty>;
export declare function adminUpdateDifficultyApi(id: string, body: Partial<AdminDifficulty>): Promise<AdminDifficulty>;
export declare function adminActivateDifficultyApi(id: string): Promise<AdminDifficulty>;
export declare function adminListContentPoliciesApi(params?: {
    gameId?: string;
    difficultyId?: string;
    status?: string;
}): Promise<EntityListResponse<AdminContentPolicy>>;
export declare function adminGetContentPolicyApi(id: string): Promise<AdminContentPolicy>;
export declare function adminUpdateContentPolicyApi(id: string, body: Partial<AdminContentPolicy>): Promise<AdminContentPolicy>;
export declare function adminActivateContentPolicyApi(id: string): Promise<AdminContentPolicy>;
export declare function adminListRuleVersionsApi(params?: {
    gameId?: string;
    status?: string;
}): Promise<EntityListResponse<AdminRuleVersion>>;
export declare function adminGetRuleVersionApi(id: string): Promise<AdminRuleVersion>;
export declare function adminUpdateRuleVersionApi(id: string, body: Partial<AdminRuleVersion>): Promise<AdminRuleVersion>;
export declare function adminActivateRuleVersionApi(id: string): Promise<AdminRuleVersion>;
export declare function adminListChallengePoliciesApi(params?: {
    gameId?: string;
    difficultyId?: string;
    status?: string;
}): Promise<EntityListResponse<AdminChallengePolicy>>;
export declare function adminGetChallengePolicyApi(id: string): Promise<AdminChallengePolicy>;
export declare function adminUpdateChallengePolicyApi(id: string, body: Partial<AdminChallengePolicy>): Promise<AdminChallengePolicy>;
export declare function adminActivateChallengePolicyApi(id: string): Promise<AdminChallengePolicy>;
//# sourceMappingURL=api.d.ts.map