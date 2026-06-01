import { apiRequest } from '../../lib/api-client';
export async function adminListGamesApi(params) {
    const sp = new URLSearchParams();
    if (params?.status)
        sp.set('status', params.status);
    if (params?.page)
        sp.set('page', String(params.page));
    if (params?.pageSize)
        sp.set('pageSize', String(params.pageSize));
    const qs = sp.toString();
    return apiRequest(`/admin/games${qs ? `?${qs}` : ''}`);
}
export async function adminGetGameApi(gameId) {
    return apiRequest(`/admin/games/${gameId}`);
}
export async function adminUpdateGameApi(gameId, input) {
    return apiRequest(`/admin/games/${gameId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
    });
}
export async function adminPublishGameApi(gameId) {
    return apiRequest(`/admin/games/${gameId}/publish`, { method: 'POST' });
}
export async function adminArchiveGameApi(gameId) {
    return apiRequest(`/admin/games/${gameId}/archive`, { method: 'POST' });
}
export async function adminUpdateDimensionsApi(gameId, dimensions) {
    return apiRequest(`/admin/games/${gameId}/dimensions`, {
        method: 'PATCH',
        body: JSON.stringify({ dimensions }),
    });
}
//# sourceMappingURL=api.js.map