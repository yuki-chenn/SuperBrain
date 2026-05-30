import { apiRequest } from '../../lib/api-client';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
  attemptCount: number;
  completedCount: number;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
}

export interface AdminUserDetail extends AdminUser {
  sessions: AdminSession[];
}

export interface AdminSession {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  lastUsedAt?: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
}

export async function adminListUsersApi(params?: {
  keyword?: string;
  status?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminUserListResponse> {
  const sp = new URLSearchParams();
  if (params?.keyword) sp.set('keyword', params.keyword);
  if (params?.status) sp.set('status', params.status);
  if (params?.role) sp.set('role', params.role);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  return apiRequest(`/admin/users${qs ? `?${qs}` : ''}`);
}

export async function adminGetUserApi(userId: string): Promise<AdminUserDetail> {
  return apiRequest(`/admin/users/${userId}`);
}

export async function adminBanUserApi(userId: string): Promise<{ success: boolean }> {
  return apiRequest(`/admin/users/${userId}/ban`, { method: 'POST' });
}

export async function adminUnbanUserApi(userId: string): Promise<{ success: boolean }> {
  return apiRequest(`/admin/users/${userId}/unban`, { method: 'POST' });
}

export async function adminUpdateUserRoleApi(userId: string, role: string): Promise<{ success: boolean }> {
  return apiRequest(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function adminRevokeSessionApi(userId: string, sessionId: string): Promise<{ success: boolean }> {
  return apiRequest(`/admin/users/${userId}/sessions/${sessionId}/revoke`, { method: 'POST' });
}

export async function adminRevokeAllSessionsApi(userId: string): Promise<{ success: boolean }> {
  return apiRequest(`/admin/users/${userId}/sessions/revoke-all`, { method: 'POST' });
}
