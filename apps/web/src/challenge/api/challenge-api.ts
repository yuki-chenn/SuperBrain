import { apiRequest } from '../../lib/api-client';
import type { ChallengeMode } from '@brain-games/shared';

export interface StartChallengePayload {
  gameSlug: string;
  mode: ChallengeMode;
  difficultyKey: string;
  puzzleSlug?: string;
  idempotencyKey?: string;
}

const post = <T>(path: string, body: unknown) =>
  apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

const get = <T>(path: string) => apiRequest<T>(path, { method: 'GET' });

export const challengeApi = {
  start: (body: StartChallengePayload) => post<any>('/challenges/start', body),
  claim: (attemptId: string, body: { entryToken: string; playSessionId: string }) =>
    post<any>(`/challenges/${attemptId}/claim`, body),
  heartbeat: (attemptId: string, body: any) =>
    post<any>(`/challenges/${attemptId}/heartbeat`, body),
  abandon: (attemptId: string, body: { playSessionId: string; reason: string }) =>
    post<any>(`/challenges/${attemptId}/abandon`, body),
  finish: (attemptId: string, body: { playSessionId: string; finalState: unknown; metrics?: any }) =>
    post<any>(`/challenges/${attemptId}/finish`, body),
  status: (attemptId: string) => get<any>(`/challenges/${attemptId}/status`),
};
