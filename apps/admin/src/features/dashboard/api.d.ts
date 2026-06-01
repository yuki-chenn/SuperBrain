export interface DashboardOverview {
    totalUsers: number;
    activeUsers: number;
    totalAttempts: number;
    completedAttempts: number;
    totalPuzzles: number;
    publishedPuzzles: number;
    totalGames: number;
    recentAuditLogs: AuditLogEntry[];
}
export interface AuditLogEntry {
    id: string;
    actorUsername?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    createdAt: string;
}
export declare function getDashboardOverviewApi(): Promise<DashboardOverview>;
//# sourceMappingURL=api.d.ts.map