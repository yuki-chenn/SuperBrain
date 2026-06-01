import { useQuery } from '@tanstack/react-query';

import { challengeApi } from '../api/challenge-api';
import { challengeQueryKeys } from '../api/challenge-query-keys';

export function ChallengeResultPage({ gameSlug, attemptId }: { gameSlug: string; attemptId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: challengeQueryKeys.status(attemptId),
    queryFn: () => challengeApi.status(attemptId),
  });
  if (isLoading) return <div style={{ padding: 24 }}>加载结果…</div>;
  return (
    <div style={{ padding: 24 }}>
      <h2>挑战结果 — {gameSlug}</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <a href={`/games/${gameSlug}/start`}>开始新挑战</a>
    </div>
  );
}
