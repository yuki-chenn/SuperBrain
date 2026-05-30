import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { getGameBySlugApi } from '../../features/games/api';
import { getLeaderboardsByGameApi, getLeaderboardEntriesApi } from '../../features/leaderboard/api';
import { useAuthStore } from '../../features/auth/auth-store';
import { webGameRegistry } from '../../features/games/game-registry';
import { GAME_DIMENSIONS } from '../../features/games/dimensions';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { BrainDimensionPanel } from '../../components/game/BrainDimensionPanel';
import { DifficultySelector } from '../../components/game/DifficultySelector';
import { LeaderboardPreviewPanel } from '../../components/game/LeaderboardPreviewPanel';
import type { GameDimension } from '../../features/games/config/types';

export function GameDetailPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const actualSlug = window.location.pathname.match(/\/games\/([^/]+)/)?.[1] || '';
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', actualSlug],
    queryFn: () => getGameBySlugApi(actualSlug),
  });

  const { data: definitions } = useQuery({
    queryKey: ['leaderboards', actualSlug],
    queryFn: () => getLeaderboardsByGameApi(actualSlug),
    enabled: !!actualSlug,
  });

  const defsForDifficulty = definitions?.filter((d) => d.difficultyKey === selectedDifficulty) || [];
  const bestDef = defsForDifficulty.find((d) => !(d.metadata as any)?.type) || definitions?.[0];
  const statsDef = defsForDifficulty.find((d) => (d.metadata as any)?.type === 'stats');

  const { data: bestEntries } = useQuery({
    queryKey: ['leaderboard-entries', bestDef?.slug],
    queryFn: () => getLeaderboardEntriesApi(bestDef!.slug),
    enabled: !!bestDef,
  });

  const { data: statsEntries } = useQuery({
    queryKey: ['leaderboard-entries', statsDef?.slug],
    queryFn: () => getLeaderboardEntriesApi(statsDef!.slug),
    enabled: !!statsDef,
  });

  if (isLoading) {
    return (
      <PageContainer>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!game) {
    return (
      <PageContainer>
        <p className="text-[var(--sb-danger)]">游戏不存在</p>
      </PageContainer>
    );
  }

  const difficulties = (game.difficultyLevels as any[]) || [];
  const tags = (game.metadata as any)?.tags || [];
  const duration = (game.metadata as any)?.estimatedDuration;
  const metaDimensions = (game.metadata as any)?.dimensions as GameDimension[] | undefined;
  const dimensions = (metaDimensions && metaDimensions.length > 0) ? metaDimensions : (GAME_DIMENSIONS[game.slug] || []);

  if (!selectedDifficulty && difficulties.length > 0) {
    setSelectedDifficulty(difficulties[0].key);
  }

  const handleStart = () => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    const reg = webGameRegistry[game.slug];
    if (reg) navigate({ to: `${reg.playRoute}?difficulty=${selectedDifficulty}` });
  };

  return (
    <PageContainer>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Game Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h1 className="text-2xl font-bold text-[var(--sb-text-primary)] mb-2">{game.title}</h1>
            {game.subtitle && (
              <p className="text-[var(--sb-text-secondary)] mb-4">{game.subtitle}</p>
            )}
            {game.source && (
              <p className="text-sm text-[var(--sb-text-muted)] mb-4">来源: {game.source}</p>
            )}
            <p className="text-[var(--sb-text-secondary)] leading-relaxed mb-6">{game.description}</p>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {tags.map((tag: string) => (
                  <Badge key={tag} variant="primary">{tag}</Badge>
                ))}
              </div>
            )}

            {dimensions.length > 0 && (
              <div className="mb-6">
                <BrainDimensionPanel dimensions={dimensions} />
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[var(--sb-text-secondary)] mb-3">难度选择</h3>
              <DifficultySelector
                levels={difficulties}
                value={selectedDifficulty}
                onChange={setSelectedDifficulty}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="primary" size="lg" onClick={handleStart}>
                {isAuthenticated ? '开始挑战' : '登录后开始'}
              </Button>
              {game.slug === 'life-game' && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate({ to: '/games/life-game/practice' })}
                >
                  备战间
                </Button>
              )}
              {duration && (
                <span className="flex items-center text-sm text-[var(--sb-text-muted)]">
                  预计 {duration}
                </span>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Leaderboard Previews */}
        <div className="space-y-4">
          <LeaderboardPreviewPanel
            gameSlug={game.slug}
            title="最快通关"
            tab="best"
            difficulty={selectedDifficulty}
            entries={bestEntries?.items || []}
            rankMetric={bestEntries?.leaderboard.rankMetric || 'durationMs'}
            displayColumns={(bestEntries?.leaderboard.metadata as any)?.displayColumns}
          />
          {statsDef && (
            <LeaderboardPreviewPanel
              gameSlug={game.slug}
              title="通关统计"
              tab="stats"
              difficulty={selectedDifficulty}
              entries={statsEntries?.items || []}
              rankMetric={statsEntries?.leaderboard.rankMetric || 'avgTimeLast10'}
              displayColumns={(statsEntries?.leaderboard.metadata as any)?.displayColumns}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
