import { challengeApi, type StartChallengePayload } from '../api/challenge-api';
import { useChallengeRuntimeStore } from './challenge-runtime-store';
import { ChallengeError } from './challenge-errors';

export const challengeNavigation = {
  async beginChallenge(payload: StartChallengePayload): Promise<{ attemptId: string; playPath: string }> {
    useChallengeRuntimeStore.getState().reset();
    useChallengeRuntimeStore.getState().set({ phase: 'starting', gameSlug: payload.gameSlug });
    const result = await challengeApi.start(payload);
    useChallengeRuntimeStore.getState().set({
      attemptId: result.attemptId,
      attemptStatus: result.status,
      mode: result.mode,
      gameSlug: payload.gameSlug,
      entryToken: result.entryToken,
      playSessionId: result.playSessionId,
      initialState: result.initialState,
      startedAt: result.startedAt,
      expiresAt: result.expiresAt,
      phase: 'countdown',
    });
    return { attemptId: result.attemptId, playPath: `/games/${payload.gameSlug}/attempts/${result.attemptId}/play?token=${encodeURIComponent(result.entryToken ?? '')}` };
  },

  async claim(attemptId: string, entryToken: string, playSessionId?: string) {
    const store = useChallengeRuntimeStore.getState();
    const ps = playSessionId ?? store.playSessionId;
    if (!ps) throw new ChallengeError('no-play-session');
    const result = await challengeApi.claim(attemptId, { entryToken, playSessionId: ps });
    if (!result.canEnter) {
      throw new ChallengeError(result.reason ?? 'claim-rejected');
    }
    store.set({
      attemptId,
      attemptStatus: result.status,
      initialState: result.initialState ?? store.initialState,
      startedAt: result.startedAt,
      expiresAt: result.expiresAt,
      phase: 'countdown',
    });
    return result;
  },

  async submit(finalState: unknown, metrics?: Record<string, unknown>) {
    const store = useChallengeRuntimeStore.getState();
    if (!store.attemptId || !store.playSessionId) throw new ChallengeError('no-attempt');
    store.set({ phase: 'submitting' });
    const result = await challengeApi.finish(store.attemptId, {
      playSessionId: store.playSessionId, finalState, metrics,
    });
    store.set({ phase: 'done', attemptStatus: result.status });
    return result;
  },

  async leave(reason: string) {
    const store = useChallengeRuntimeStore.getState();
    if (!store.attemptId || !store.playSessionId) return;
    await challengeApi.abandon(store.attemptId, { playSessionId: store.playSessionId, reason });
    store.set({ phase: 'expired' });
  },
};
