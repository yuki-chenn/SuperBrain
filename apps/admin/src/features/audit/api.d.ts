export interface AdminAuditLog {
    id: string;
    actorUserId?: string;
    actorUsername?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    before?: any;
    after?: any;
    metadata?: any;
    ipAddress?: string;
    createdAt: string;
}
export interface AdminAuditLogListResponse {
    items: AdminAuditLog[];
    total: number;
}
export declare function adminListAuditLogsApi(params?: {
    action?: string;
    resourceType?: string;
    actorUserId?: string;
    page?: number;
    pageSize?: number;
}): Promise<AdminAuditLogListResponse>;
export declare function adminGetAuditLogApi(logId: string): Promise<AdminAuditLog>;
//# sourceMappingURL=api.d.ts.map