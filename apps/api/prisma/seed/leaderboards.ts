import type { PrismaClient } from '@prisma/client';

type BaseLb = {
  slug: string;
  name: string;
  difficultyKey?: string;
  rankMetric: string;
  rankDirection: 'ASC' | 'DESC';
  tieBreakers: Array<{ metric: string; direction: 'ASC' | 'DESC' }>;
  metadata: Record<string, unknown>;
};

const BASE_LEADERBOARDS: Record<string, BaseLb[]> = {
  'sliding-puzzle': [
    { slug: 'sliding-puzzle-easy-fastest', name: '数字华容道 3x3 最快通关榜', difficultyKey: 'easy',
      rankMetric: 'durationMs', rankDirection: 'ASC',
      tieBreakers: [{ metric: 'moves', direction: 'ASC' }, { metric: 'completedAt', direction: 'ASC' }],
      metadata: { displayColumns: [{ metric: 'durationMs', label: '用时', format: 'duration' }, { metric: 'moves', label: '步数' }] } },
    { slug: 'sliding-puzzle-normal-fastest', name: '数字华容道 4x4 最快通关榜', difficultyKey: 'normal',
      rankMetric: 'durationMs', rankDirection: 'ASC',
      tieBreakers: [{ metric: 'moves', direction: 'ASC' }, { metric: 'completedAt', direction: 'ASC' }],
      metadata: { displayColumns: [{ metric: 'durationMs', label: '用时', format: 'duration' }, { metric: 'moves', label: '步数' }] } },
    { slug: 'sliding-puzzle-hard-fastest', name: '数字华容道 5x5 最快通关榜', difficultyKey: 'hard',
      rankMetric: 'durationMs', rankDirection: 'ASC',
      tieBreakers: [{ metric: 'moves', direction: 'ASC' }, { metric: 'completedAt', direction: 'ASC' }],
      metadata: { displayColumns: [{ metric: 'durationMs', label: '用时', format: 'duration' }, { metric: 'moves', label: '步数' }] } },
  ],
  'life-game': [
    { slug: 'life-game-easy', name: '生命游戏 · 入门榜', difficultyKey: 'easy',
      rankMetric: 'durationMs', rankDirection: 'ASC',
      tieBreakers: [{ metric: 'errorCount', direction: 'ASC' }, { metric: 'completedAt', direction: 'ASC' }],
      metadata: { displayColumns: [{ metric: 'durationMs', label: '用时', format: 'duration' }, { metric: 'errorCount', label: '错误次数' }] } },
    { slug: 'life-game-normal', name: '生命游戏 · 标准榜', difficultyKey: 'normal',
      rankMetric: 'durationMs', rankDirection: 'ASC',
      tieBreakers: [{ metric: 'errorCount', direction: 'ASC' }, { metric: 'completedAt', direction: 'ASC' }],
      metadata: { displayColumns: [{ metric: 'durationMs', label: '用时', format: 'duration' }, { metric: 'errorCount', label: '错误次数' }] } },
    { slug: 'life-game-hard', name: '生命游戏 · 挑战榜', difficultyKey: 'hard',
      rankMetric: 'durationMs', rankDirection: 'ASC',
      tieBreakers: [{ metric: 'errorCount', direction: 'ASC' }, { metric: 'completedAt', direction: 'ASC' }],
      metadata: { displayColumns: [{ metric: 'durationMs', label: '用时', format: 'duration' }, { metric: 'errorCount', label: '错误次数' }] } },
  ],
  'precise-character-building': [
    { slug: 'pcb-easy-fastest', name: '精准造字 · 入门最快榜', difficultyKey: 'easy',
      rankMetric: 'durationMs', rankDirection: 'ASC',
      tieBreakers: [{ metric: 'completedAt', direction: 'ASC' }],
      metadata: { displayColumns: [{ metric: 'durationMs', label: '用时', format: 'duration' }] } },
    { slug: 'pcb-normal-fastest', name: '精准造字 · 标准最快榜', difficultyKey: 'normal',
      rankMetric: 'durationMs', rankDirection: 'ASC',
      tieBreakers: [{ metric: 'completedAt', direction: 'ASC' }],
      metadata: { displayColumns: [{ metric: 'durationMs', label: '用时', format: 'duration' }] } },
    { slug: 'pcb-hard-fastest', name: '精准造字 · 挑战最快榜', difficultyKey: 'hard',
      rankMetric: 'durationMs', rankDirection: 'ASC',
      tieBreakers: [{ metric: 'completedAt', direction: 'ASC' }],
      metadata: { displayColumns: [{ metric: 'durationMs', label: '用时', format: 'duration' }] } },
  ],
  'absolute-command': [
    { slug: 'absolute-command-standard-fastest', name: '绝对指令 · 标准最快通关榜', difficultyKey: 'standard',
      rankMetric: 'commandCount', rankDirection: 'ASC',
      tieBreakers: [{ metric: 'durationMs', direction: 'ASC' }, { metric: 'completedAt', direction: 'ASC' }],
      metadata: { displayColumns: [{ metric: 'commandCount', label: '步数' }, { metric: 'durationMs', label: '用时', format: 'duration' }, { metric: 'travelDistance', label: '距离' }] } },
  ],
};

export async function seedLeaderboards(prisma: PrismaClient): Promise<void> {
  let total = 0;
  for (const [gameSlug, boards] of Object.entries(BASE_LEADERBOARDS)) {
    const game = await prisma.game.findUnique({ where: { slug: gameSlug } });
    if (!game) { console.log(`   ${gameSlug} not found, skip`); continue; }
    for (const b of boards) {
      const difficulty = b.difficultyKey
        ? await prisma.gameDifficulty.findFirst({
            where: { gameId: game.id, key: b.difficultyKey, status: 'ACTIVE' },
          })
        : null;
      await prisma.leaderboardDefinition.upsert({
        where: { gameId_slug: { gameId: game.id, slug: b.slug } },
        update: {
          name: b.name, difficultyId: difficulty?.id ?? null,
          rankMetric: b.rankMetric, rankDirection: b.rankDirection,
          tieBreakers: b.tieBreakers, metadata: b.metadata,
          status: 'ACTIVE', visible: true,
        },
        create: {
          gameId: game.id, slug: b.slug, name: b.name,
          scope: 'GLOBAL', periodType: 'ALL_TIME', mode: 'RANKED',
          difficultyId: difficulty?.id ?? null,
          rankMetric: b.rankMetric, rankDirection: b.rankDirection,
          tieBreakers: b.tieBreakers, entryPolicy: 'BEST_PER_USER',
          displayLimit: 100, adminQueryLimit: 1000, visible: true,
          status: 'ACTIVE', metadata: b.metadata,
        },
      });
      total++;
    }
  }

  // Per-puzzle boards for absolute-command (each AC puzzle = its own course record)
  const acGame = await prisma.game.findUnique({ where: { slug: 'absolute-command' } });
  if (acGame) {
    const acPuzzles = await prisma.puzzle.findMany({ where: { gameId: acGame.id } });
    for (const p of acPuzzles) {
      const slug = `ac-${p.slug}-fastest`;
      const name = `绝对指令 · ${p.title} 最快通关榜`;
      const tieBreakers = [
        { metric: 'durationMs', direction: 'ASC' as const },
        { metric: 'completedAt', direction: 'ASC' as const },
      ];
      const meta = {
        displayColumns: [
          { metric: 'commandCount', label: '步数' },
          { metric: 'durationMs', label: '用时', format: 'duration' },
          { metric: 'travelDistance', label: '距离' },
        ],
      };
      await prisma.leaderboardDefinition.upsert({
        where: { gameId_slug: { gameId: acGame.id, slug } },
        update: {
          name, puzzleId: p.id,
          rankMetric: 'commandCount', rankDirection: 'ASC',
          tieBreakers, metadata: meta,
          status: 'ACTIVE', visible: true,
        },
        create: {
          gameId: acGame.id, slug, name,
          scope: 'PUZZLE', periodType: 'ALL_TIME', mode: 'RANKED',
          puzzleId: p.id,
          rankMetric: 'commandCount', rankDirection: 'ASC',
          tieBreakers, entryPolicy: 'BEST_PER_USER',
          displayLimit: 100, adminQueryLimit: 1000, visible: true,
          status: 'ACTIVE', metadata: meta,
        },
      });
      total++;
    }
  }

  console.log(`   ${total} leaderboard definitions`);
}
