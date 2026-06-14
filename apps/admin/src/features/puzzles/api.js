import { apiRequest } from '../../lib/api-client';
// ─── Puzzle APIs ──────────────────────────────────────────────────
export async function adminListPuzzlesApi(params) {
    const sp = new URLSearchParams();
    if (params?.gameId)
        sp.set('gameId', params.gameId);
    if (params?.status)
        sp.set('status', params.status);
    if (params?.page)
        sp.set('page', String(params.page));
    if (params?.pageSize)
        sp.set('pageSize', String(params.pageSize));
    const qs = sp.toString();
    return apiRequest(`/admin/puzzles${qs ? `?${qs}` : ''}`);
}
export async function adminGetPuzzleApi(id) {
    return apiRequest(`/admin/puzzles/${id}`);
}
export async function adminUpdatePuzzleApi(id, body) {
    return apiRequest(`/admin/puzzles/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}
export async function adminListPuzzleVersionsApi(params) {
    const sp = new URLSearchParams();
    if (params?.gameId)
        sp.set('gameId', params.gameId);
    if (params?.status)
        sp.set('status', params.status);
    if (params?.page)
        sp.set('page', String(params.page));
    if (params?.pageSize)
        sp.set('pageSize', String(params.pageSize));
    const qs = sp.toString();
    return apiRequest(`/admin/puzzles/versions${qs ? `?${qs}` : ''}`);
}
export async function adminCreatePuzzleVersionApi(puzzleId, body) {
    return apiRequest(`/admin/puzzles/${puzzleId}/versions`, { method: 'POST', body: JSON.stringify(body) });
}
export async function adminUpdatePuzzleVersionApi(versionId, body) {
    return apiRequest(`/admin/puzzles/versions/${versionId}`, { method: 'PATCH', body: JSON.stringify(body) });
}
export async function adminValidatePuzzleVersionApi(versionId) {
    return apiRequest(`/admin/puzzles/versions/${versionId}/validate`, { method: 'POST' });
}
export async function adminPublishPuzzleVersionApi(versionId) {
    return apiRequest(`/admin/puzzles/versions/${versionId}/publish`, { method: 'POST' });
}
//# sourceMappingURL=api.js.map