import { useEffect, useRef } from 'react';
import { challengeApi } from '../api/challenge-api';
import { useChallengeRuntimeStore } from './challenge-runtime-store';

/** Heartbeat hook. Default 5s interval per Doc 9 RANKED policy. */
export function useChallengeHeartbeat(intervalSec = 5) {
  const store = useChallengeRuntimeStore;
  const lastSync = useRef<number>(Date.now());

  useEffect(() => {
    const tick = async () => {
      const s = store.getState();
      if (!s.attemptId || !s.playSessionId) return;
      if (s.phase !== 'countdown' && s.phase !== 'playing') return;
      try {
        const r = await challengeApi.heartbeat(s.attemptId, {
          playSessionId: s.playSessionId,
          clientNow: new Date().toISOString(),
          phase: s.phase === 'countdown' ? 'countdown' : 'playing',
          localElapsedMs: Date.now() - lastSync.current,
        });
        lastSync.current = Date.now();
        store.getState().set({
          attemptStatus: r.status,
          remainingMs: r.remainingMs,
          phase: r.accepted ? (r.status === 'PLAYING' ? 'playing' : 'countdown') : 'expired',
        });
      } catch {
        // Network / 4xx errors are absorbed; route guard will also detect terminal.
      }
    };
    tick();
    const id = setInterval(tick, intervalSec * 1000);
    return () => clearInterval(id);
  }, [intervalSec, store]);
}
