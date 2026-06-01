import { useEffect } from 'react';
import { challengeApi } from '../api/challenge-api';
import { useChallengeRuntimeStore } from './challenge-runtime-store';

/** BroadcastChannel: detects another tab claiming the same attempt. Loser → expired. */
export function useChallengeBroadcast(attemptId: string | null) {
  useEffect(() => {
    if (!attemptId) return;
    const ch = new BroadcastChannel(`challenge:${attemptId}`);
    const myPlaySessionId = useChallengeRuntimeStore.getState().playSessionId;
    ch.postMessage({ type: 'claim', playSessionId: myPlaySessionId });
    ch.onmessage = (ev) => {
      const data = ev.data as { type?: string; playSessionId?: string } | undefined;
      if (data?.type === 'claim' && data.playSessionId && data.playSessionId !== myPlaySessionId) {
        useChallengeRuntimeStore.getState().set({ phase: 'expired', conflictDetected: true, errorReason: 'tab-conflict' });
        const store = useChallengeRuntimeStore.getState();
        if (store.attemptId && store.playSessionId) {
          challengeApi.abandon(store.attemptId, { playSessionId: store.playSessionId, reason: 'tab-conflict' }).catch(() => {});
        }
      }
    };
    return () => { ch.close(); };
  }, [attemptId]);
}
