export interface AdminSessionUser {
    id: string;
    username: string;
    email: string;
    displayName?: string | null;
    avatarUrl?: string | null;
}
export interface AdminSessionListItem {
    id: string;
    userId: string;
    user: AdminSessionUser | null;
    status: string;
    userAgent: string | null;
    ipAddress: string | null;
    refreshTokenFamilyId: string;
    replacedBySessionId: string | null;
    expiresAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
    revokedReason: string | null;
    createdAt: string;
}
export interface AdminSessionDetail {
    id: string;
    userId: string;
    user: AdminSessionUser | null;
    status: string;
    userAgent: string | null;
    ipAddress: string | null;
    refreshTokenFamilyId: string;
    refreshTokenHashMasked: string;
    replacedBySessionId: string | null;
    expiresAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
    revokedReason: string | null;
    createdAt: string;
}
export interface AdminSessionStats {
    active: number;
    expired: number;
    revoked: number;
    expiringSoon: number;
}
export interface AdminSessionListParams {
    status?: string;
    userId?: string;
    sessionId?: string;
    familyId?: string;
    ipAddress?: string;
    createdFrom?: string;
    createdTo?: string;
    expiresFrom?: string;
    expiresTo?: string;
    special?: string;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortDir?: 'asc' | 'desc';
}
export interface AdminSessionListResponse {
    items: AdminSessionListItem[];
    total: number;
    page: number;
    pageSize: number;
}
export declare function adminGetSessionStatsApi(): Promise<AdminSessionStats>;
export declare function adminListSessionsApi(params?: AdminSessionListParams): Promise<AdminSessionListResponse>;
export declare function adminGetSessionApi(id: string): Promise<AdminSessionDetail>;
export declare function adminRevokeSessionApi(id: string, reason: string): Promise<{
    ok: boolean;
}>;
export declare function adminRevokeFamilyApi(familyId: string, reason: string): Promise<{
    ok: boolean;
    revokedCount: number;
}>;
//# sourceMappingURL=api.d.ts.map