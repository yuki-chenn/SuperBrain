export interface AdminUser {
    id: string;
    email: string;
    username: string;
    role: string;
    status: string;
    lastLoginAt?: string;
    createdAt: string;
    attemptCount: number;
    completedCount: number;
}
export interface AdminUserListResponse {
    items: AdminUser[];
    total: number;
}
export interface AdminUserDetail extends AdminUser {
    sessions: AdminSession[];
}
export interface AdminSession {
    id: string;
    userAgent?: string;
    ipAddress?: string;
    lastUsedAt?: string;
    expiresAt: string;
    revokedAt?: string;
    createdAt: string;
}
export declare function adminListUsersApi(params?: {
    keyword?: string;
    status?: string;
    role?: string;
    page?: number;
    pageSize?: number;
}): Promise<AdminUserListResponse>;
export declare function adminGetUserApi(userId: string): Promise<AdminUserDetail>;
export declare function adminBanUserApi(userId: string): Promise<{
    success: boolean;
}>;
export declare function adminUnbanUserApi(userId: string): Promise<{
    success: boolean;
}>;
export declare function adminUpdateUserRoleApi(userId: string, role: string): Promise<{
    success: boolean;
}>;
export declare function adminRevokeSessionApi(userId: string, sessionId: string): Promise<{
    success: boolean;
}>;
export declare function adminRevokeAllSessionsApi(userId: string): Promise<{
    success: boolean;
}>;
//# sourceMappingURL=api.d.ts.map