import type {
  ChallengeMode, AttemptStatus,
} from '@brain-games/shared';

export type ChallengePhase =
  | 'idle' | 'starting' | 'countdown' | 'playing'
  | 'submitting' | 'done' | 'expired' | 'error';

export interface ChallengeRuntimeState {
  phase: ChallengePhase;
  attemptId: string | null;
  attemptStatus: AttemptStatus | null;
  mode: ChallengeMode | null;
  gameSlug: string | null;
  entryToken: string | null;
  playSessionId: string | null;
  initialState: unknown;
  startedAt: string | null;
  expiresAt: string | null;
  remainingMs: number;
  conflictDetected: boolean;
  errorReason: string | null;
}

export const initialChallengeState: ChallengeRuntimeState = {
  phase: 'idle',
  attemptId: null, attemptStatus: null, mode: null, gameSlug: null,
  entryToken: null, playSessionId: null,
  initialState: null,
  startedAt: null, expiresAt: null,
  remainingMs: 0,
  conflictDetected: false,
  errorReason: null,
};
