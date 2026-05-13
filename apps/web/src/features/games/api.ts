import { apiRequest } from '../../lib/api-client';
import type {
  GameListResponse,
  Game,
  StartAttemptResponse,
  FinishAttemptResponse,
  SubmitLifeRegionResponse,
  GetLifeAttemptResponse,
  AbandonLifeAttemptResponse,
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
