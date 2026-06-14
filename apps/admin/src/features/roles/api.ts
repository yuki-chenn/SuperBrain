import { apiRequest } from '../../lib/api-client';

// ─── Permission types ─────────────────────────────────────────────

export interface AdminPermission {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string | null;
  createdAt: string;
}

// ─── Role types ───────────────────────────────────────────────────

export interface AdminRole {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionKeys: string[];
}

// ─── Permission APIs ──────────────────────────────────────────────

export async function adminListPermissionsApi(): Promise<AdminPermission[]> {
  return apiRequest('/admin/permissions');
}

export async function adminCreatePermissionApi(body: {
  key: string;
  description?: string;
}): Promise<AdminPermission> {
  return apiRequest('/admin/permissions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function adminUpdatePermissionApi(
  id: string,
  body: { description?: string },
): Promise<{ ok: boolean }> {
  return apiRequest(`/admin/permissions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function adminDeletePermissionApi(id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/admin/permissions/${id}`, { method: 'DELETE' });
}

// ─── Role APIs ────────────────────────────────────────────────────

export async function adminListRolesApi(): Promise<AdminRole[]> {
  return apiRequest('/admin/roles');
}

export async function adminCreateRoleApi(body: {
  key: string;
  name: string;
  description?: string;
  permissionKeys?: string[];
}): Promise<AdminRole> {
  return apiRequest('/admin/roles', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function adminUpdateRoleApi(
  id: string,
  body: { name?: string; description?: string; permissionKeys?: string[] },
): Promise<{ ok: boolean }> {
  return apiRequest(`/admin/roles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function adminDeleteRoleApi(id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/admin/roles/${id}`, { method: 'DELETE' });
}

// ─── User-Role APIs ───────────────────────────────────────────────

export interface UserRoleAssignment {
  roleId: string;
  roleKey: string;
  roleName: string;
  assignedAt: string;
}

export async function adminListUserRolesApi(userId: string): Promise<UserRoleAssignment[]> {
  return apiRequest(`/admin/users/${userId}/roles`);
}

export async function adminAssignRoleApi(
  userId: string,
  roleKey: string,
): Promise<{ ok: boolean }> {
  return apiRequest(`/admin/users/${userId}/roles`, {
    method: 'POST',
    body: JSON.stringify({ roleKey }),
  });
}

export async function adminRevokeRoleApi(
  userId: string,
  roleKey: string,
): Promise<{ ok: boolean }> {
  return apiRequest(`/admin/users/${userId}/roles/${roleKey}`, { method: 'DELETE' });
}
