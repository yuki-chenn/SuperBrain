import { useSearch } from '@tanstack/react-router';

export function ChallengeExpiredPage({ gameSlug }: { gameSlug: string }) {
  const search = useSearch({ strict: false }) as { reason?: string };
  return (
    <div style={{ padding: 24 }}>
      <h2>挑战已结束 — {gameSlug}</h2>
      <p>原因：{search.reason ?? 'unknown'}</p>
      <a href={`/games/${gameSlug}/start`}>重新开始</a>
    </div>
  );
}
