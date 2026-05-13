import { useQuery } from '@tanstack/react-query';
import { getGamesApi } from '../../features/games/api';
import { PageContainer } from '../../components/layout/PageContainer';
import { GameCard } from '../../components/game/GameCard';
import { GameGrid } from '../../components/game/GameGrid';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

export function GamesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['games'],
    queryFn: getGamesApi,
  });

  if (error) {
    return (
      <PageContainer>
        <EmptyState
          title="加载失败"
          description="网络异常或服务暂不可用"
          action={{ label: '重试', onClick: () => window.location.reload() }}
        />
      </PageContainer>
    );
  }

  const games = data?.items || [];

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)] mb-8">游戏中心</h1>
      {isLoading ? (
        <GameGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </GameGrid>
      ) : games.length === 0 ? (
        <EmptyState title="暂无游戏" description="敬请期待新游戏上线" />
      ) : (
        <GameGrid>
          {games.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </GameGrid>
      )}
    </PageContainer>
  );
}
