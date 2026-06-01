import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { challengeApi } from '../api/challenge-api';
import { challengeNavigation } from '../core/challenge-navigation-manager';
import { useChallengeRuntimeStore } from '../core/challenge-runtime-store';
import { useChallengeHeartbeat } from '../core/challenge-heartbeat';
import { useChallengeBroadcast } from '../core/challenge-broadcast';

export function ChallengePlayHost({ gameSlug, attemptId, token }: {
  gameSlug: string; attemptId: string; token: string | null;
}) {
  const navigate = useNavigate();
  const store = useChallengeRuntimeStore();
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await challengeApi.status(attemptId);
        if (cancelled) return;
        if (['COMPLETED'].includes(status.status)) {
          navigate({ to: `/games/${gameSlug}/attempts/${attemptId}/result` });
          return;
        }
        if (['ABANDONED','TIMEOUT','INTERRUPTED','INVALIDATED','REVIEW_REQUIRED','REVOKED','ADMIN_CORRECTED'].includes(status.status)) {
          navigate({ to: `/games/${gameSlug}/attempts/${attemptId}/expired?reason=${status.status.toLowerCase()}` });
          return;
        }
        if (!token && !store.entryToken) {
          navigate({ to: `/games/${gameSlug}/attempts/${attemptId}/expired?reason=no-entry-token` });
          return;
        }
        const useToken = token ?? store.entryToken!;
        if (!store.playSessionId) {
          navigate({ to: `/games/${gameSlug}/start` });
          return;
        }
        await challengeNavigation.claim(attemptId, useToken, store.playSessionId);
        if (cancelled) return;
        setClaimed(true);
      } catch (e) {
        if (!cancelled) navigate({ to: `/games/${gameSlug}/attempts/${attemptId}/expired?reason=${(e as Error).message}` });
      }
    })();
    return () => { cancelled = true; };
  }, [attemptId, gameSlug, navigate, store.entryToken, store.playSessionId, token]);

  useChallengeHeartbeat(5);
  useChallengeBroadcast(claimed ? attemptId : null);

  if (!claimed) return <div style={{ padding: 24 }}>正在认领挑战 ({attemptId})…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>挑战进行中 — {gameSlug}</h2>
      <p>状态：{store.attemptStatus} · 阶段：{store.phase} · 剩余：{Math.floor(store.remainingMs / 1000)}s</p>
      <p>
        <small>
          注：本页是 Change 3 引入的统一挑战 host shell。具体游戏渲染通过 GameRuntimeAdapter 接入；
          当前仅 sliding-puzzle 的提交流程在 Change 3 内联跑通，其他游戏的中间提交在 Change 7 接入。
        </small>
      </p>
      <button
        onClick={async () => {
          // Demo finish — pass-through finalState; real game adapter integration in Change 7.
          const result = await challengeNavigation.submit(store.initialState ?? {}, {});
          navigate({ to: `/games/${gameSlug}/attempts/${attemptId}/result` });
          void result;
        }}
      >提交（占位）</button>
      &nbsp;
      <button onClick={async () => {
        await challengeNavigation.leave('user-click');
        navigate({ to: `/games/${gameSlug}/attempts/${attemptId}/expired?reason=user-click` });
      }}>放弃</button>
    </div>
  );
}
