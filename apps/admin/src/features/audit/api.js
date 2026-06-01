import { apiRequest } from '../../lib/api-client';
export async function adminListAuditLogsApi(params) {
    const sp = new URLSearchParams();
    if (params?.action)
        sp.set('action', params.action);
    if (params?.resourceType)
        sp.set('resourceType', params.resourceType);
    if (params?.actorUserId)
        sp.set('actorUserId', params.actorUserId);
    if (params?.page)
        sp.set('page', String(params.page));
    if (params?.pageSize)
        sp.set('pageSize', String(params.pageSize));
    const qs = sp.toString();
    return apiRequest(`/admin/audit-logs${qs ? `?${qs}` : ''}`);
}
export async function adminGetAuditLogApi(logId) {
    return apiRequest(`/admin/audit-logs/${logId}`);
}
//# sourceMappingURL=api.js.map