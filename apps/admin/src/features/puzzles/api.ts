import { apiRequest } from '../../lib/api-client';

// ─── Types ────────────────────────────────────────────────────────

export interface AdminPuzzle {
  id: string;
  gameId: string;
  slug: string;
  title: string;
  description: string | null;
  difficultyId: string | null;
  status: string;
  currentVersionId: string | null;
  source: string | null;
  estimatedDurationSec: number | null;
  sortOrder: number;
  metadata: any;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  versions?: AdminPuzzleVersion[];
}

export interface AdminPuzzleVersion {
  id: string;
  puzzleId: string;
  version: number;
  schemaVersion: number;
  engineKey: string;
  engineVersion: string | null;
  content: any;
  contentHash: string;
  referenceSolution: any | null;
  validationStatus: string;
  validationReport: any;
  status: string;
  publishedAt: string | null;
  createdAt: string;
}

export interface AdminPuzzleListResponse {
  items: AdminPuzzle[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Puzzle APIs ──────────────────────────────────────────────────

export async function adminListPuzzlesApi(params?: {
  gameId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminPuzzleListResponse> {
  const sp = new URLSearchParams();
  if (params?.gameId) sp.set('gameId', params.gameId);
  if (params?.status) sp.set('status', params.status);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  return apiRequest(`/admin/puzzles${qs ? `?${qs}` : ''}`);
}

export async function adminGetPuzzleApi(id: string): Promise<AdminPuzzle> {
  return apiRequest(`/admin/puzzles/${id}`);
}

export async function adminUpdatePuzzleApi(id: string, body: {
  title?: string;
  description?: string;
  difficultyId?: string | null;
  sortOrder?: number;
  source?: string;
}): Promise<AdminPuzzle> {
  return apiRequest(`/admin/puzzles/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

// ─── Version APIs ─────────────────────────────────────────────────

export interface AdminPuzzleVersionListItem extends AdminPuzzleVersion {
  puzzle: { id: string; gameId: string; title: string; slug: string; currentVersionId: string | null };
}

export interface AdminPuzzleVersionListResponse {
  items: AdminPuzzleVersionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function adminListPuzzleVersionsApi(params?: {
  gameId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminPuzzleVersionListResponse> {
  const sp = new URLSearchParams();
  if (params?.gameId) sp.set('gameId', params.gameId);
  if (params?.status) sp.set('status', params.status);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  return apiRequest(`/admin/puzzles/versions${qs ? `?${qs}` : ''}`);
}

export async function adminCreatePuzzleVersionApi(puzzleId: string, body: {
  engineKey: string;
  content: any;
}): Promise<AdminPuzzleVersion> {
  return apiRequest(`/admin/puzzles/${puzzleId}/versions`, { method: 'POST', body: JSON.stringify(body) });
}

export async function adminUpdatePuzzleVersionApi(versionId: string, body: {
  content: any;
}): Promise<AdminPuzzleVersion> {
  return apiRequest(`/admin/puzzles/versions/${versionId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function adminValidatePuzzleVersionApi(versionId: string): Promise<AdminPuzzleVersion> {
  return apiRequest(`/admin/puzzles/versions/${versionId}/validate`, { method: 'POST' });
}

export async function adminPublishPuzzleVersionApi(versionId: string): Promise<AdminPuzzleVersion> {
  return apiRequest(`/admin/puzzles/versions/${versionId}/publish`, { method: 'POST' });
}
