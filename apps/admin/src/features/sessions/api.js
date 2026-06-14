import { apiRequest } from '../../lib/api-client';
export function adminGetSessionStatsApi() {
    return apiRequest('/admin/sessions/stats');
}
export function adminListSessionsApi(params = {}) {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== '')
            query.set(key, String(val));
    }
    const qs = query.toString();
    return apiRequest(`/admin/sessions${qs ? `?${qs}` : ''}`);
}
export function adminGetSessionApi(id) {
    return apiRequest(`/admin/sessions/${id}`);
}
export function adminRevokeSessionApi(id, reason) {
    return apiRequest(`/admin/sessions/${id}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}
export function adminRevokeFamilyApi(familyId, reason) {
    return apiRequest(`/admin/sessions/family/${familyId}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}
//# sourceMappingURL=api.js.map