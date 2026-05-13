import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGameBySlugApi } from '../../features/games/api';
import { getLeaderboardsByGameApi, getLeaderboardEntriesApi } from '../../features/leaderboard/api';
import { PageContainer } from '../../components/layout/PageContainer';
import { Tabs } from '../../components/ui/Tabs';
import { LeaderboardTable } from '../../features/leaderboard/LeaderboardTable';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

export function LeaderboardPage() {
  const actualSlug = window.location.pathname.match(/\/games\/([^/]+)/)?.[1] || '';
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const urlTab = searchParams.get('tab');
  const urlDifficulty = searchParams.get('difficulty');
  const [activeTab, setActiveTab] = useState<string | null>(urlTab);

  const { data: game } = useQuery({
    queryKey: ['game', actualSlug],
    queryFn: () => getGameBySlugApi(actualSlug),
    enabled: !!actualSlug,
  });

  const { data: definitions } = useQuery({
    queryKey: ['leaderboards', actualSlug],
    queryFn: () => getLeaderboardsByGameApi(actualSlug),
    enabled: !!actualSlug,
  });

  const difficulties = ((game?.difficultyLevels as any[]) || []).map((d: any) => ({
    key: d.key,
    label: d.label || d.key,
  }));

  const [selectedDifficulty, setSelectedDifficulty] = useState<string>(urlDifficulty || '');

  // Auto-select first difficulty
  if (!selectedDifficulty && difficulties.length > 0) {
    setSelectedDifficulty(difficulties[0].key);
  }

  // Filter definitions by selected difficulty
  const defsForDifficulty = (definitions || []).filter(
    (d) => d.difficultyKey === selectedDifficulty,
  );

  // Resolve active tab: try matching by slug first, then by type (best/stats)
  const activeDef = useMemo(() => {
    if (activeTab) {
      // Try exact slug match
      const bySlug = defsForDifficulty.find((d) => d.slug === activeTab);
      if (bySlug) return bySlug;
      // Try type match (tab=best or tab=stats)
      const byType = defsForDifficulty.find((d) => {
        const isStats = (d.metadata as any)?.type === 'stats';
        return activeTab === 'stats' ? isStats : !isStats;
      });
      if (byType) return byType;
    }
    return defsForDifficulty[0];
  }, [activeTab, defsForDifficulty]);

  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['leaderboard-entries', activeDef?.slug],
    queryFn: () => getLeaderboardEntriesApi(activeDef!.slug),
    enabled: !!activeDef,
  });

  const tabs = defsForDifficulty.map((d) => ({
    key: (d.metadata as any)?.type === 'stats' ? 'stats' : 'best',
    label: (d.metadata as any)?.type === 'stats' ? '统计' : '最快通关',
  }));

  // Resolve active tab key for the Tabs component
  const activeTabKey = activeDef
    ? ((activeDef.metadata as any)?.type === 'stats' ? 'stats' : 'best')
    : 'best';

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)] mb-6">排行榜</h1>

      {/* Difficulty selector */}
      {difficulties.length > 1 && (
        <div className="flex gap-2 mb-4">
          {difficulties.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => { setSelectedDifficulty(d.key); setActiveTab(null); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedDifficulty === d.key
                  ? 'bg-[var(--sb-primary)] text-white'
                  : 'bg-[var(--sb-bg-muted)] text-[var(--sb-text-secondary)] hover:bg-[var(--sb-bg-elevated)]'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {tabs.length > 0 && (
        <Tabs
          tabs={tabs}
          activeKey={activeTabKey}
          onChange={(key) => setActiveTab(key)}
          className="mb-6"
        />
      )}

      {entriesLoading ? (
        <TableSkeleton rows={8} />
      ) : entriesData && entriesData.items.length > 0 ? (
        <LeaderboardTable
          entries={entriesData.items}
          rankMetric={entriesData.leaderboard.rankMetric}
          displayColumns={(entriesData.leaderboard.metadata as any)?.displayColumns}
        />
      ) : (
        <EmptyState
          title="暂无记录"
          description="完成一次挑战后，你的成绩会出现在这里"
        />
      )}
    </PageContainer>
  );
}
