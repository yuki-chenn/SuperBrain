import type { PrismaClient } from '@prisma/client';

export interface LbDef {
  slug: string;
  name: string;
  difficultyKey: string | null;
  rankMetric: string;
  rankDirection: 'ASC' | 'DESC';
  tieBreakers: Array<{ metric: string; direction: 'ASC' | 'DESC' }>;
  metadata: Record<string, unknown>;
}

export const GAME_LEADERBOARD_CONFIGS: Record<string, LbDef[]> = {
  'sliding-puzzle': [
    ...([
      { slug: 'sliding-puzzle-easy-fastest', name: '数字华容道 3x3 最快通关榜', difficultyKey: 'easy' },
      { slug: 'sliding-puzzle-normal-fastest', name: '数字华容道 4x4 最快通关榜', difficultyKey: 'normal' },
      { slug: 'sliding-puzzle-hard-fastest', name: '数字华容道 5x5 最快通关榜', difficultyKey: 'hard' },
    ].map((d) => ({
      slug: d.slug,
      name: d.name,
      difficultyKey: d.difficultyKey,
      rankMetric: 'durationMs',
      rankDirection: 'ASC' as const,
      tieBreakers: [
        { metric: 'moves', direction: 'ASC' as const },
        { metric: 'completedAt', direction: 'ASC' as const },
      ],
      metadata: {
        displayColumns: [
          { metric: 'durationMs', label: '用时', format: 'duration' },
          { metric: 'moves', label: '步数' },
        ],
      },
    }))),
    ...([
      { slug: 'sliding-puzzle-easy-stats', name: '数字华容道 3x3 · 统计榜', difficultyKey: 'easy' },
      { slug: 'sliding-puzzle-normal-stats', name: '数字华容道 4x4 · 统计榜', difficultyKey: 'normal' },
      { slug: 'sliding-puzzle-hard-stats', name: '数字华容道 5x5 · 统计榜', difficultyKey: 'hard' },
    ].map((d) => ({
      slug: d.slug,
      name: d.name,
      difficultyKey: d.difficultyKey,
      rankMetric: 'avgTimeLast10',
      rankDirection: 'ASC' as const,
      tieBreakers: [
        { metric: 'completionCount', direction: 'DESC' as const },
        { metric: 'completedAt', direction: 'ASC' as const },
      ],
      metadata: {
        type: 'stats',
        displayColumns: [
          { metric: 'avgTimeLast10', label: '平均用时', format: 'duration' },
          { metric: 'completionCount', label: '通关次数' },
        ],
      },
    }))),
  ],
  'life-game': [
    ...([
      { slug: 'life-game-easy', name: '生命游戏 · 入门榜', difficultyKey: 'easy' },
      { slug: 'life-game-normal', name: '生命游戏 · 标准榜', difficultyKey: 'normal' },
      { slug: 'life-game-hard', name: '生命游戏 · 挑战榜', difficultyKey: 'hard' },
    ].map((d) => ({
      slug: d.slug,
      name: d.name,
      difficultyKey: d.difficultyKey,
      rankMetric: 'durationMs',
      rankDirection: 'ASC' as const,
      tieBreakers: [
        { metric: 'errorCount', direction: 'ASC' as const },
        { metric: 'completedAt', direction: 'ASC' as const },
      ],
      metadata: {
        displayColumns: [
          { metric: 'durationMs', label: '用时', format: 'duration' },
          { metric: 'errorCount', label: '错误次数' },
        ],
      },
    }))),
    ...([
      { slug: 'life-game-easy-stats', name: '生命游戏 入门 · 统计榜', difficultyKey: 'easy' },
      { slug: 'life-game-normal-stats', name: '生命游戏 标准 · 统计榜', difficultyKey: 'normal' },
      { slug: 'life-game-hard-stats', name: '生命游戏 挑战 · 统计榜', difficultyKey: 'hard' },
    ].map((d) => ({
      slug: d.slug,
      name: d.name,
      difficultyKey: d.difficultyKey,
      rankMetric: 'avgTimeLast10',
      rankDirection: 'ASC' as const,
      tieBreakers: [
        { metric: 'completionCount', direction: 'DESC' as const },
        { metric: 'completedAt', direction: 'ASC' as const },
      ],
      metadata: {
        type: 'stats',
        displayColumns: [
          { metric: 'avgTimeLast10', label: '平均用时', format: 'duration' },
          { metric: 'completionCount', label: '通关次数' },
        ],
      },
    }))),
  ],
};

export const PCB_LEADERBOARD_CONFIGS: LbDef[] = [
  ...([
    { slug: 'pcb-easy-fastest', name: '精准造字 · 入门最快榜', difficultyKey: 'easy' },
    { slug: 'pcb-normal-fastest', name: '精准造字 · 标准最快榜', difficultyKey: 'normal' },
    { slug: 'pcb-hard-fastest', name: '精准造字 · 挑战最快榜', difficultyKey: 'hard' },
  ].map((d) => ({
    slug: d.slug,
    name: d.name,
    difficultyKey: d.difficultyKey,
    rankMetric: 'durationMs',
    rankDirection: 'ASC' as const,
    // PCB ranks purely by completion time. errorCount / rounds are still
    // tracked in attempt.metrics for game logic (error budget, replay) but
    // are intentionally NOT used as tie-breakers and NOT shown on the board.
    tieBreakers: [
      { metric: 'completedAt', direction: 'ASC' as const },
    ],
    metadata: {
      displayColumns: [
        { metric: 'durationMs', label: '用时', format: 'duration' },
      ],
    },
  }))),
  ...([
    { slug: 'pcb-easy-stats', name: '精准造字 入门 · 统计榜', difficultyKey: 'easy' },
    { slug: 'pcb-normal-stats', name: '精准造字 标准 · 统计榜', difficultyKey: 'normal' },
    { slug: 'pcb-hard-stats', name: '精准造字 挑战 · 统计榜', difficultyKey: 'hard' },
  ].map((d) => ({
    slug: d.slug,
    name: d.name,
    difficultyKey: d.difficultyKey,
    rankMetric: 'avgTimeLast10',
    rankDirection: 'ASC' as const,
    tieBreakers: [
      { metric: 'completedAt', direction: 'ASC' as const },
    ],
    metadata: {
      type: 'stats',
      displayColumns: [
        { metric: 'avgTimeLast10', label: '平均用时', format: 'duration' },
      ],
    },
  }))),
];

export async function seedLeaderboards(prisma: PrismaClient, gameId: string, defs: LbDef[]) {
  for (const def of defs) {
    await prisma.leaderboardDefinition.upsert({
      where: { slug: def.slug },
      // Update ALL fields on re-seed so config changes (rank metric, tie-breakers,
      // display columns) propagate without manual SQL or DB resets.
      update: {
        name: def.name,
        difficultyKey: def.difficultyKey,
        rankMetric: def.rankMetric,
        rankDirection: def.rankDirection,
        tieBreakers: def.tieBreakers as any,
        metadata: def.metadata as any,
      },
      create: {
        gameId,
        slug: def.slug,
        name: def.name,
        scope: 'GLOBAL',
        difficultyKey: def.difficultyKey,
        rankMetric: def.rankMetric,
        rankDirection: def.rankDirection,
        tieBreakers: def.tieBreakers,
        entryPolicy: 'BEST_PER_USER',
        metadata: def.metadata as any,
      },
    });
    console.log(`Created leaderboard: ${def.name}`);
  }
}
