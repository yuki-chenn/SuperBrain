import { apiRequest } from '../../lib/api-client';

export interface AdminGame {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  source?: string;
  coverUrl?: string;
  status: string;
  difficultyLevels: any[];
  metadata: any;
  puzzleCount: number;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGameListResponse {
  items: AdminGame[];
  total: number;
}

export async function adminListGamesApi(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminGameListResponse> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set('status', params.status);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  return apiRequest(`/admin/games${qs ? `?${qs}` : ''}`);
}

export async function adminGetGameApi(gameId: string): Promise<AdminGame> {
  return apiRequest(`/admin/games/${gameId}`);
}

export async function adminUpdateGameApi(gameId: string, input: Partial<AdminGame>): Promise<{ success: boolean }> {
  return apiRequest(`/admin/games/${gameId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function adminPublishGameApi(gameId: string): Promise<{ success: boolean }> {
  return apiRequest(`/admin/games/${gameId}/publish`, { method: 'POST' });
}

export async function adminArchiveGameApi(gameId: string): Promise<{ success: boolean }> {
  return apiRequest(`/admin/games/${gameId}/archive`, { method: 'POST' });
}

export async function adminUpdateDimensionsApi(
  gameId: string,
  dimensions: Array<{ key: string; label: string; value: number }>,
): Promise<{ success: boolean; dimensions: Array<{ key: string; label: string; value: number }> }> {
  return apiRequest(`/admin/games/${gameId}/dimensions`, {
    method: 'PATCH',
    body: JSON.stringify({ dimensions }),
  });
}
