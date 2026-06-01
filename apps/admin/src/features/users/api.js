import { apiRequest } from '../../lib/api-client';
export async function adminListUsersApi(params) {
    const sp = new URLSearchParams();
    if (params?.keyword)
        sp.set('keyword', params.keyword);
    if (params?.status)
        sp.set('status', params.status);
    if (params?.role)
        sp.set('role', params.role);
    if (params?.page)
        sp.set('page', String(params.page));
    if (params?.pageSize)
        sp.set('pageSize', String(params.pageSize));
    const qs = sp.toString();
    return apiRequest(`/admin/users${qs ? `?${qs}` : ''}`);
}
export async function adminGetUserApi(userId) {
    return apiRequest(`/admin/users/${userId}`);
}
export async function adminBanUserApi(userId) {
    return apiRequest(`/admin/users/${userId}/ban`, { method: 'POST' });
}
export async function adminUnbanUserApi(userId) {
    return apiRequest(`/admin/users/${userId}/unban`, { method: 'POST' });
}
export async function adminUpdateUserRoleApi(userId, role) {
    return apiRequest(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
    });
}
export async function adminRevokeSessionApi(userId, sessionId) {
    return apiRequest(`/admin/users/${userId}/sessions/${sessionId}/revoke`, { method: 'POST' });
}
export async function adminRevokeAllSessionsApi(userId) {
    return apiRequest(`/admin/users/${userId}/sessions/revoke-all`, { method: 'POST' });
}
//# sourceMappingURL=api.js.map