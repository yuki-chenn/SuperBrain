import { apiRequest } from '../../lib/api-client';
// ─── Helper ──────────────────────────────────────────────────────
function buildQuery(params) {
    const sp = new URLSearchParams();
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            if (v)
                sp.set(k, v);
        }
    }
    const qs = sp.toString();
    return qs ? `?${qs}` : '';
}
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
// ─── Difficulty APIs ─────────────────────────────────────────────
export async function adminListDifficultiesApi(params) {
    return apiRequest(`/admin/games/difficulties${buildQuery(params)}`);
}
export async function adminGetDifficultyApi(id) {
    return apiRequest(`/admin/games/difficulties/${id}`);
}
export async function adminUpdateDifficultyApi(id, body) {
    return apiRequest(`/admin/games/difficulties/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}
export async function adminActivateDifficultyApi(id) {
    return apiRequest(`/admin/games/difficulties/${id}/activate`, { method: 'POST' });
}
// ─── Content Policy APIs ─────────────────────────────────────────
export async function adminListContentPoliciesApi(params) {
    return apiRequest(`/admin/games/content-policies${buildQuery(params)}`);
}
export async function adminGetContentPolicyApi(id) {
    return apiRequest(`/admin/games/content-policies/${id}`);
}
export async function adminUpdateContentPolicyApi(id, body) {
    return apiRequest(`/admin/games/content-policies/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}
export async function adminActivateContentPolicyApi(id) {
    return apiRequest(`/admin/games/content-policies/${id}/activate`, { method: 'POST' });
}
// ─── Rule Version APIs ───────────────────────────────────────────
export async function adminListRuleVersionsApi(params) {
    return apiRequest(`/admin/games/rule-versions${buildQuery(params)}`);
}
export async function adminGetRuleVersionApi(id) {
    return apiRequest(`/admin/games/rule-versions/${id}`);
}
export async function adminUpdateRuleVersionApi(id, body) {
    return apiRequest(`/admin/games/rule-versions/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}
export async function adminActivateRuleVersionApi(id) {
    return apiRequest(`/admin/games/rule-versions/${id}/activate`, { method: 'POST' });
}
// ─── Challenge Policy APIs ───────────────────────────────────────
export async function adminListChallengePoliciesApi(params) {
    return apiRequest(`/admin/games/challenge-policies${buildQuery(params)}`);
}
export async function adminGetChallengePolicyApi(id) {
    return apiRequest(`/admin/games/challenge-policies/${id}`);
}
export async function adminUpdateChallengePolicyApi(id, body) {
    return apiRequest(`/admin/games/challenge-policies/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}
export async function adminActivateChallengePolicyApi(id) {
    return apiRequest(`/admin/games/challenge-policies/${id}/activate`, { method: 'POST' });
}
//# sourceMappingURL=api.js.map