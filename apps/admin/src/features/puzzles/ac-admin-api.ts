import { apiRequest } from '../../lib/api-client';
import type {
  AdminCreateACPuzzle,
  AdminUpdateACPuzzle,
  AdminSaveMazeVersion,
  AdminListACPuzzlesResponse,
  AdminACPuzzleDetail,
  AdminValidatePuzzleResponse,
  AdminListAttemptsResponse,
  AdminAttemptReplay,
  AdminPuzzleLeaderboardResponse,
} from '@brain-games/shared';

const BASE = '/admin/absolute-command';

export function adminListACPuzzlesApi(params?: {
  status?: string;
  difficultyLabel?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminListACPuzzlesResponse> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set('status', params.status);
  if (params?.difficultyLabel) sp.set('difficultyLabel', params.difficultyLabel);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  return apiRequest(`${BASE}/puzzles${qs ? `?${qs}` : ''}`);
}

export function adminGetACPuzzleDetailApi(puzzleId: string): Promise<AdminACPuzzleDetail> {
  return apiRequest(`${BASE}/puzzles/${puzzleId}`);
}

export function adminCreateACPuzzleApi(input: AdminCreateACPuzzle) {
  return apiRequest(`${BASE}/puzzles`, { method: 'POST', body: JSON.stringify(input) });
}

export function adminUpdateACPuzzleApi(puzzleId: string, input: AdminUpdateACPuzzle) {
  return apiRequest(`${BASE}/puzzles/${puzzleId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function adminSaveMazeVersionApi(puzzleId: string, input: AdminSaveMazeVersion) {
  return apiRequest(`${BASE}/puzzles/${puzzleId}/versions`, { method: 'POST', body: JSON.stringify(input) });
}

export function adminValidatePuzzleApi(puzzleId: string): Promise<AdminValidatePuzzleResponse> {
  return apiRequest(`${BASE}/puzzles/${puzzleId}/validate`, { method: 'POST' });
}

export function adminPublishPuzzleApi(puzzleId: string) {
  return apiRequest(`${BASE}/puzzles/${puzzleId}/publish`, { method: 'POST' });
}

export function adminUnpublishPuzzleApi(puzzleId: string) {
  return apiRequest(`${BASE}/puzzles/${puzzleId}/unpublish`, { method: 'POST' });
}

export function adminGetACPuzzleAttemptsApi(puzzleId: string, params?: { page?: number; pageSize?: number }): Promise<AdminListAttemptsResponse> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  return apiRequest(`${BASE}/puzzles/${puzzleId}/attempts${qs ? `?${qs}` : ''}`);
}

export function adminGetAttemptReplayApi(attemptId: string): Promise<AdminAttemptReplay> {
  return apiRequest(`${BASE}/attempts/${attemptId}`);
}

export function adminGetACPuzzleLeaderboardApi(puzzleId: string, params?: { limit?: number; offset?: number }): Promise<AdminPuzzleLeaderboardResponse> {
  const sp = new URLSearchParams();
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.offset) sp.set('offset', String(params.offset));
  const qs = sp.toString();
  return apiRequest(`${BASE}/puzzles/${puzzleId}/leaderboard${qs ? `?${qs}` : ''}`);
}
