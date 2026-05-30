import { apiRequest } from '../../../lib/api-client';
import type {
  StartAbsoluteCommandAttemptResponse,
  ExecuteAbsoluteCommandResponse,
  UndoAbsoluteCommandResponse,
  ResetAbsoluteCommandResponse,
  GetAbsoluteCommandAttemptResponse,
  AbandonAbsoluteCommandResponse,
  ListAbsoluteCommandPuzzlesResponse,
  GetAbsoluteCommandPuzzleDetailResponse,
  GetPuzzleLeaderboardResponse,
} from '@brain-games/shared';

export async function listACPuzzlesApi(
  params?: { difficultyLabel?: string; page?: number; pageSize?: number },
): Promise<ListAbsoluteCommandPuzzlesResponse> {
  const query = new URLSearchParams();
  if (params?.difficultyLabel) query.set('difficultyLabel', params.difficultyLabel);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  return apiRequest(`/games/absolute-command/puzzles${qs ? `?${qs}` : ''}`);
}

export async function getACPuzzleDetailApi(
  puzzleSlug: string,
): Promise<GetAbsoluteCommandPuzzleDetailResponse> {
  return apiRequest(`/games/absolute-command/puzzles/${puzzleSlug}`);
}

export async function getACPuzzleLeaderboardApi(
  puzzleId: string,
  params?: { limit?: number; offset?: number },
): Promise<GetPuzzleLeaderboardResponse> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  const qs = query.toString();
  return apiRequest(`/games/absolute-command/puzzles/${puzzleId}/leaderboard${qs ? `?${qs}` : ''}`);
}

export async function startACAttemptApi(
  puzzleId: string,
): Promise<StartAbsoluteCommandAttemptResponse> {
  return apiRequest(`/games/absolute-command/puzzles/${puzzleId}/attempts/start`, {
    method: 'POST',
  });
}

export async function getACAttemptApi(
  attemptId: string,
): Promise<GetAbsoluteCommandAttemptResponse> {
  return apiRequest(`/games/absolute-command/attempts/${attemptId}`);
}

export async function executeACCommandApi(
  attemptId: string,
  direction: string,
): Promise<ExecuteAbsoluteCommandResponse> {
  return apiRequest(`/games/absolute-command/attempts/${attemptId}/commands`, {
    method: 'POST',
    body: JSON.stringify({ direction }),
  });
}

export async function undoACCommandApi(
  attemptId: string,
): Promise<UndoAbsoluteCommandResponse> {
  return apiRequest(`/games/absolute-command/attempts/${attemptId}/undo`, {
    method: 'POST',
  });
}

export async function resetACAttemptApi(
  attemptId: string,
): Promise<ResetAbsoluteCommandResponse> {
  return apiRequest(`/games/absolute-command/attempts/${attemptId}/reset`, {
    method: 'POST',
  });
}

export async function abandonACAttemptApi(
  attemptId: string,
): Promise<AbandonAbsoluteCommandResponse> {
  return apiRequest(`/games/absolute-command/attempts/${attemptId}/abandon`, {
    method: 'POST',
  });
}
