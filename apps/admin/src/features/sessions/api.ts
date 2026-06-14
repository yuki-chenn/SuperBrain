import { apiRequest } from '../../lib/api-client';

export interface AdminSessionUser {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface AdminSessionListItem {
  id: string;
  userId: string;
  user: AdminSessionUser | null;
  status: string;
  userAgent: string | null;
  ipAddress: string | null;
  refreshTokenFamilyId: string;
  replacedBySessionId: string | null;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  createdAt: string;
}

export interface AdminSessionDetail {
  id: string;
  userId: string;
  user: AdminSessionUser | null;
  status: string;
  userAgent: string | null;
  ipAddress: string | null;
  refreshTokenFamilyId: string;
  refreshTokenHashMasked: string;
  replacedBySessionId: string | null;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  createdAt: string;
}

export interface AdminSessionStats {
  active: number;
  expired: number;
  revoked: number;
  expiringSoon: number;
}

export interface AdminSessionListParams {
  status?: string;
  userId?: string;
  sessionId?: string;
  familyId?: string;
  ipAddress?: string;
  createdFrom?: string;
  createdTo?: string;
  expiresFrom?: string;
  expiresTo?: string;
  special?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
}

export interface AdminSessionListResponse {
  items: AdminSessionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export function adminGetSessionStatsApi(): Promise<AdminSessionStats> {
  return apiRequest('/admin/sessions/stats');
}

export function adminListSessionsApi(params: AdminSessionListParams = {}): Promise<AdminSessionListResponse> {
  const query = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== '') query.set(key, String(val));
  }
  const qs = query.toString();
  return apiRequest(`/admin/sessions${qs ? `?${qs}` : ''}`);
}

export function adminGetSessionApi(id: string): Promise<AdminSessionDetail> {
  return apiRequest(`/admin/sessions/${id}`);
}

export function adminRevokeSessionApi(id: string, reason: string): Promise<{ ok: boolean }> {
  return apiRequest(`/admin/sessions/${id}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function adminRevokeFamilyApi(familyId: string, reason: string): Promise<{ ok: boolean; revokedCount: number }> {
  return apiRequest(`/admin/sessions/family/${familyId}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
