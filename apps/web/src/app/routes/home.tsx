import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../features/auth/auth-store';
import { getGamesApi } from '../../features/games/api';
import { MetricPill } from '../../components/ui/MetricPill';
import { GameCard } from '../../components/game/GameCard';
import { GameGrid } from '../../components/game/GameGrid';
import { CardSkeleton } from '../../components/ui/Skeleton';

export function HomePage() {
  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const { data, isLoading } = useQuery({
    queryKey: ['games'],
    queryFn: getGamesApi,
  });

  const games = data?.items || [];

  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--sb-border)] bg-[var(--sb-bg-elevated)]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-12 md:py-16">
          <p className="text-xs font-semibold tracking-widest text-[var(--sb-primary)] uppercase mb-3">
            SuperBrain Arena
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--sb-text-primary)] mb-3">
            用结构化挑战训练你的脑力
          </h1>
          <p className="text-[var(--sb-text-secondary)] text-base mb-8 max-w-xl">
            选择一个认知挑战，完成计时成绩，进入排行榜。
          </p>

          <div className="flex gap-4 mb-8">
            <Link
              to="/games"
              className="bg-[var(--sb-primary)] hover:bg-[var(--sb-primary-hover)] text-white px-6 py-3 rounded-[var(--sb-radius-button)] no-underline font-medium transition-colors"
            >
              进入游戏中心
            </Link>
            {!isAuthenticated && (
              <Link
                to="/register"
                className="border border-[var(--sb-border)] hover:border-[var(--sb-primary)] text-[var(--sb-text-primary)] px-6 py-3 rounded-[var(--sb-radius-button)] no-underline font-medium transition-colors"
              >
                注册账号
              </Link>
            )}
          </div>

          <div className="flex gap-3">
            <MetricPill label="Games" value={games.length || '1+'} />
            <MetricPill label="Dimensions" value="8" />
            <MetricPill label="Ranking" value="Live" />
          </div>
        </div>
      </section>

      {/* Game Cards */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-8 py-12">
        <h2 className="text-xl font-bold text-[var(--sb-text-primary)] mb-6">热门挑战</h2>
        {isLoading ? (
          <GameGrid>
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </GameGrid>
        ) : (
          <GameGrid>
            {games.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </GameGrid>
        )}
      </section>
    </>
  );
}
