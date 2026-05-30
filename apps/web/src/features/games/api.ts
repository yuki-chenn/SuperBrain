import { apiRequest } from '../../lib/api-client';
import type {
  GameListResponse,
  Game,
  StartAttemptResponse,
  FinishAttemptResponse,
  SubmitLifeRegionResponse,
  GetLifeAttemptResponse,
  AbandonLifeAttemptResponse,
  StartPCBAttemptResponse,
  SubmitPCBRoundResponse,
  GetPCBAttemptResponse,
  AbandonPCBAttemptResponse,
  ResetPCBAttemptResponse,
} from '@brain-games/shared';

export async function getGamesApi(): Promise<GameListResponse> {
  return apiRequest('/games');
}

export async function getGameBySlugApi(slug: string): Promise<Game> {
  return apiRequest(`/games/${slug}`);
}

export async function startAttemptApi(
  slug: string,
  difficultyKey: string,
): Promise<StartAttemptResponse> {
  return apiRequest(`/games/${slug}/attempts/start`, {
    method: 'POST',
    body: JSON.stringify({ difficultyKey }),
  });
}

export async function startPlayingApi(
  slug: string,
  attemptId: string,
): Promise<{ startedAt: string }> {
  return apiRequest(`/games/${slug}/attempts/${attemptId}/start-playing`, {
    method: 'POST',
  });
}

export async function finishAttemptApi(
  slug: string,
  attemptId: string,
  payload: {
    finalState: { size: number; board: number[] };
    moveTrace: number[];
    clientDurationMs: number;
  },
): Promise<FinishAttemptResponse> {
  return apiRequest(`/games/${slug}/attempts/${attemptId}/finish`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function abandonAttemptApi(
  slug: string,
  attemptId: string,
): Promise<{ success: boolean }> {
  return apiRequest(`/games/${slug}/attempts/${attemptId}/abandon`, {
    method: 'POST',
  });
}

export async function timeoutAttemptApi(
  slug: string,
  attemptId: string,
): Promise<{ success: boolean; status: 'FAILED'; reason: 'TIMEOUT' }> {
  return apiRequest(`/games/${slug}/attempts/${attemptId}/timeout`, {
    method: 'POST',
  });
}

// Life Game API

export async function startLifeAttemptApi(
  difficultyKey: string,
): Promise<StartAttemptResponse> {
  return apiRequest('/games/life-game/attempts/start', {
    method: 'POST',
    body: JSON.stringify({ difficultyKey }),
  });
}

export async function submitLifeRegionApi(
  attemptId: string,
  regionId: number,
  aliveCells: Array<{ x: number; y: number }>,
): Promise<SubmitLifeRegionResponse> {
  return apiRequest(`/games/life-game/attempts/${attemptId}/regions/${regionId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ aliveCells }),
  });
}

export async function getLifeAttemptApi(
  attemptId: string,
): Promise<GetLifeAttemptResponse> {
  return apiRequest(`/games/life-game/attempts/${attemptId}`);
}

export async function getLifeAnswersApi(
  attemptId: string,
): Promise<{ answers: Array<{ regionId: number; aliveCells: Array<{ x: number; y: number }> }> }> {
  return apiRequest(`/games/life-game/attempts/${attemptId}/answers`);
}

export async function abandonLifeAttemptApi(
  attemptId: string,
): Promise<AbandonLifeAttemptResponse> {
  return apiRequest(`/games/life-game/attempts/${attemptId}/abandon`, {
    method: 'POST',
  });
}

// Precise Character Building API

export async function startPCBAttemptApi(
  difficultyKey: string,
): Promise<StartPCBAttemptResponse> {
  return apiRequest('/games/precise-character-building/attempts/start', {
    method: 'POST',
    body: JSON.stringify({ difficultyKey }),
  });
}

export async function submitPCBRoundApi(
  attemptId: string,
  selectedRadicalKeys: string[],
  selectedCellIndices: number[],
): Promise<SubmitPCBRoundResponse> {
  return apiRequest(`/games/precise-character-building/attempts/${attemptId}/rounds/submit`, {
    method: 'POST',
    body: JSON.stringify({ selectedRadicalKeys, selectedCellIndices }),
  });
}

export async function getPCBAttemptApi(
  attemptId: string,
): Promise<GetPCBAttemptResponse> {
  return apiRequest(`/games/precise-character-building/attempts/${attemptId}`);
}

export async function abandonPCBAttemptApi(
  attemptId: string,
): Promise<AbandonPCBAttemptResponse> {
  return apiRequest(`/games/precise-character-building/attempts/${attemptId}/abandon`, {
    method: 'POST',
  });
}

export async function resetPCBAttemptApi(
  attemptId: string,
): Promise<ResetPCBAttemptResponse> {
  return apiRequest(`/games/precise-character-building/attempts/${attemptId}/reset`, {
    method: 'POST',
  });
}
