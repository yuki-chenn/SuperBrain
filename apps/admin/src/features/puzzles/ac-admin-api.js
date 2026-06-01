import { apiRequest } from '../../lib/api-client';
const BASE = '/admin/absolute-command';
export function adminListACPuzzlesApi(params) {
    const sp = new URLSearchParams();
    if (params?.status)
        sp.set('status', params.status);
    if (params?.difficultyLabel)
        sp.set('difficultyLabel', params.difficultyLabel);
    if (params?.page)
        sp.set('page', String(params.page));
    if (params?.pageSize)
        sp.set('pageSize', String(params.pageSize));
    const qs = sp.toString();
    return apiRequest(`${BASE}/puzzles${qs ? `?${qs}` : ''}`);
}
export function adminGetACPuzzleDetailApi(puzzleId) {
    return apiRequest(`${BASE}/puzzles/${puzzleId}`);
}
export function adminCreateACPuzzleApi(input) {
    return apiRequest(`${BASE}/puzzles`, { method: 'POST', body: JSON.stringify(input) });
}
export function adminUpdateACPuzzleApi(puzzleId, input) {
    return apiRequest(`${BASE}/puzzles/${puzzleId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
export function adminSaveMazeVersionApi(puzzleId, input) {
    return apiRequest(`${BASE}/puzzles/${puzzleId}/versions`, { method: 'POST', body: JSON.stringify(input) });
}
export function adminValidatePuzzleApi(puzzleId) {
    return apiRequest(`${BASE}/puzzles/${puzzleId}/validate`, { method: 'POST' });
}
export function adminPublishPuzzleApi(puzzleId) {
    return apiRequest(`${BASE}/puzzles/${puzzleId}/publish`, { method: 'POST' });
}
export function adminUnpublishPuzzleApi(puzzleId) {
    return apiRequest(`${BASE}/puzzles/${puzzleId}/unpublish`, { method: 'POST' });
}
export function adminGetACPuzzleAttemptsApi(puzzleId, params) {
    const sp = new URLSearchParams();
    if (params?.page)
        sp.set('page', String(params.page));
    if (params?.pageSize)
        sp.set('pageSize', String(params.pageSize));
    const qs = sp.toString();
    return apiRequest(`${BASE}/puzzles/${puzzleId}/attempts${qs ? `?${qs}` : ''}`);
}
export function adminGetAttemptReplayApi(attemptId) {
    return apiRequest(`${BASE}/attempts/${attemptId}`);
}
export function adminGetACPuzzleLeaderboardApi(puzzleId, params) {
    const sp = new URLSearchParams();
    if (params?.limit)
        sp.set('limit', String(params.limit));
    if (params?.offset)
        sp.set('offset', String(params.offset));
    const qs = sp.toString();
    return apiRequest(`${BASE}/puzzles/${puzzleId}/leaderboard${qs ? `?${qs}` : ''}`);
}
//# sourceMappingURL=ac-admin-api.js.map