import { apiRequest } from '../../lib/api-client';
// ─── Permission APIs ──────────────────────────────────────────────
export async function adminListPermissionsApi() {
    return apiRequest('/admin/permissions');
}
export async function adminCreatePermissionApi(body) {
    return apiRequest('/admin/permissions', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
export async function adminUpdatePermissionApi(id, body) {
    return apiRequest(`/admin/permissions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}
export async function adminDeletePermissionApi(id) {
    return apiRequest(`/admin/permissions/${id}`, { method: 'DELETE' });
}
// ─── Role APIs ────────────────────────────────────────────────────
export async function adminListRolesApi() {
    return apiRequest('/admin/roles');
}
export async function adminCreateRoleApi(body) {
    return apiRequest('/admin/roles', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
export async function adminUpdateRoleApi(id, body) {
    return apiRequest(`/admin/roles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}
export async function adminDeleteRoleApi(id) {
    return apiRequest(`/admin/roles/${id}`, { method: 'DELETE' });
}
export async function adminListUserRolesApi(userId) {
    return apiRequest(`/admin/users/${userId}/roles`);
}
export async function adminAssignRoleApi(userId, roleKey) {
    return apiRequest(`/admin/users/${userId}/roles`, {
        method: 'POST',
        body: JSON.stringify({ roleKey }),
    });
}
export async function adminRevokeRoleApi(userId, roleKey) {
    return apiRequest(`/admin/users/${userId}/roles/${roleKey}`, { method: 'DELETE' });
}
//# sourceMappingURL=api.js.map