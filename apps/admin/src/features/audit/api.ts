import { apiRequest } from '../../lib/api-client';

export interface AdminAuditLog {
  id: string;
  actorUserId?: string;
  actorUsername?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: any;
  after?: any;
  metadata?: any;
  ipAddress?: string;
  createdAt: string;
}

export interface AdminAuditLogListResponse {
  items: AdminAuditLog[];
  total: number;
}

export async function adminListAuditLogsApi(params?: {
  action?: string;
  resourceType?: string;
  actorUserId?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminAuditLogListResponse> {
  const sp = new URLSearchParams();
  if (params?.action) sp.set('action', params.action);
  if (params?.resourceType) sp.set('resourceType', params.resourceType);
  if (params?.actorUserId) sp.set('actorUserId', params.actorUserId);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  return apiRequest(`/admin/audit-logs${qs ? `?${qs}` : ''}`);
}

export async function adminGetAuditLogApi(logId: string): Promise<AdminAuditLog> {
  return apiRequest(`/admin/audit-logs/${logId}`);
}
