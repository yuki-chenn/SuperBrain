import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  simulateUntilStable,
  extractRegionAnswer,
  getLifeRegions,
  LIFE_BOARD_WIDTH,
  LIFE_BOARD_HEIGHT,
  DEFAULT_LIFE_BOUNDARY_RULE,
} from '@brain-games/game-engine';
import type { LifeBoardState, CellCoord } from '@brain-games/game-engine';

const prisma = new PrismaClient();

// Simple seeded PRNG
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateRandomBoard(
  seed: string,
  density: number,
): LifeBoardState {
  const rand = mulberry32(xmur3(seed)());
  const aliveCells: CellCoord[] = [];

  for (let x = 0; x < LIFE_BOARD_WIDTH; x++) {
    for (let y = 0; y < LIFE_BOARD_HEIGHT; y++) {
      if (rand() < density) {
        aliveCells.push({ x, y });
      }
    }
  }

  return {
    width: LIFE_BOARD_WIDTH,
    height: LIFE_BOARD_HEIGHT,
    aliveCells,
  };
}

const DIFFICULTY_DENSITIES: Record<string, number[]> = {
  easy: [0.13, 0.14, 0.15, 0.16, 0.17],
  normal: [0.18, 0.19, 0.2, 0.21, 0.22],
  hard: [0.23, 0.24, 0.25, 0.26, 0.27],
};

function generateValidPuzzle(
  seed: string,
  difficultyKey: string,
  targetRegionCount: number,
): {
  initialState: LifeBoardState;
  stableState: LifeBoardState;
  targetRegionIds: number[];
  targetAnswers: Array<{ regionId: number; aliveCells: Array<{ x: number; y: number }> }>;
  stableGeneration: number;
} | null {
  const densities = DIFFICULTY_DENSITIES[difficultyKey] || [0.15, 0.16, 0.17, 0.18, 0.19];
  const regions = getLifeRegions();

  for (let attempt = 0; attempt < 50; attempt++) {
    const density = densities[attempt % densities.length];
    const boardSeed = `${seed}-${attempt}`;
    const initialState = generateRandomBoard(boardSeed, density);

    if (initialState.aliveCells.length === 0) continue;

    const result = simulateUntilStable({
      initialState,
      boundary: DEFAULT_LIFE_BOUNDARY_RULE,
      maxGenerations: 300,
    });

    if (result.status !== 'STABLE' || !result.stableState) continue;
    if (result.stableState.aliveCells.length === 0) continue;

    // Find ALL regions with alive cells in stable state
    const regionsWithCells = regions.filter((region) => {
      const answer = extractRegionAnswer(result.stableState!, region.id);
      return answer.length > 0 && answer.length <= 80;
    });

    if (regionsWithCells.length < targetRegionCount) continue;

    // Fisher-Yates shuffle for true random selection
    const shuffleRand = mulberry32(xmur3(boardSeed + '-shuffle')());
    const shuffled = [...regionsWithCells];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(shuffleRand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Select target regions — they can be from anywhere on the board
    const selectedRegions = shuffled.slice(0, targetRegionCount);

    // Log for verification
    console.log(
      `  Puzzle regions: [${selectedRegions.map((r) => r.id).join(', ')}] from ${regionsWithCells.length} candidates`,
    );

    const targetRegionIds = selectedRegions.map((r) => r.id);
    const targetAnswers = selectedRegions.map((region) => ({
      regionId: region.id,
      aliveCells: extractRegionAnswer(result.stableState!, region.id),
    }));

    return {
      initialState,
      stableState: result.stableState,
      targetRegionIds,
      targetAnswers,
      stableGeneration: result.generations,
    };
  }

  return null;
}

async function main() {
  console.log('Seeding database...');

  // Create sliding-puzzle game
  const slidingPuzzle = await prisma.game.upsert({
    where: { slug: 'sliding-puzzle' },
    update: {},
    create: {
      slug: 'sliding-puzzle',
      title: '数字华容道',
      subtitle: '滑动数字方块，复原顺序',
      description:
        '在 N x N 棋盘中移动数字方块，使其按从小到大排列，空格位于右下角。',
      source: '经典滑块谜题 / 最强大脑风格益智题',
      status: 'PUBLISHED',
      difficultyLevels: [
        { key: 'easy', label: '3x3', size: 3, scrambleMoves: 60 },
        { key: 'normal', label: '4x4', size: 4, scrambleMoves: 160 },
        { key: 'hard', label: '5x5', size: 5, scrambleMoves: 300 },
      ],
      metadata: {
        tags: ['空间推理', '路径规划', '经典谜题'],
        estimatedDuration: '1-10 min',
      },
    },
  });

  console.log(`Created game: ${slidingPuzzle.title} (${slidingPuzzle.slug})`);

  // --- Leaderboard configs (reusable for all games) ---

  interface LbDef {
    slug: string;
    name: string;
    difficultyKey: string | null;
    rankMetric: string;
    rankDirection: 'ASC' | 'DESC';
    tieBreakers: Array<{ metric: string; direction: 'ASC' | 'DESC' }>;
    metadata: Record<string, unknown>;
  }

  const GAME_LEADERBOARD_CONFIGS: Record<string, LbDef[]> = {
    'sliding-puzzle': [
      // Best-time leaderboards per difficulty
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
      // Stats leaderboards per difficulty
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
      // Best-time leaderboards per difficulty
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
      // Stats leaderboards per difficulty
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

  async function seedLeaderboards(gameId: string, defs: LbDef[]) {
    for (const def of defs) {
      await prisma.leaderboardDefinition.upsert({
        where: { slug: def.slug },
        update: { metadata: def.metadata as any },
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

  // Seed sliding-puzzle leaderboards
  await seedLeaderboards(slidingPuzzle.id, GAME_LEADERBOARD_CONFIGS['sliding-puzzle']);

  // Create life-game game
  const lifeGame = await prisma.game.upsert({
    where: { slug: 'life-game' },
    update: {},
    create: {
      slug: 'life-game',
      title: '生命游戏',
      subtitle: '推演细胞自动机，预测稳定区域',
      description:
        '观察 120×15 环屏网格中的初始细胞分布，根据 B3/S23 生命游戏规则，推理目标区域进入稳定状态后的存活细胞位置。',
      source: "最强大脑第十三季第一期 / Conway's Game of Life",
      status: 'PUBLISHED',
      difficultyLevels: [
        { key: 'easy', label: '入门', targetRegionCount: 1, description: '推理 1 个目标区域' },
        { key: 'normal', label: '标准', targetRegionCount: 2, description: '推理 2 个目标区域' },
        { key: 'hard', label: '挑战', targetRegionCount: 3, description: '推理 3 个目标区域' },
      ],
      metadata: {
        tags: ['细胞自动机', '逻辑推演', '空间观察', '稳定状态'],
        estimatedDuration: '3-15 min',
      },
    },
  });

  console.log(`Created game: ${lifeGame.title} (${lifeGame.slug})`);

  // Seed life-game leaderboards
  await seedLeaderboards(lifeGame.id, GAME_LEADERBOARD_CONFIGS['life-game']);

  // Generate seed puzzles for life-game
  const puzzleConfigs = [
    { difficultyKey: 'easy', targetRegionCount: 1, count: 3 },
    { difficultyKey: 'normal', targetRegionCount: 2, count: 3 },
    { difficultyKey: 'hard', targetRegionCount: 3, count: 3 },
  ];

  let puzzleIndex = 0;
  for (const config of puzzleConfigs) {
    for (let i = 0; i < config.count; i++) {
      const seed = `life-puzzle-${config.difficultyKey}-${i}`;
      const puzzle = generateValidPuzzle(seed, config.difficultyKey, config.targetRegionCount);

      if (!puzzle) {
        console.log(`Could not generate puzzle for ${config.difficultyKey} #${i}, skipping`);
        continue;
      }

      await prisma.lifePuzzle.create({
        data: {
          gameId: lifeGame.id,
          difficultyKey: config.difficultyKey,
          width: LIFE_BOARD_WIDTH,
          height: LIFE_BOARD_HEIGHT,
          boundary: DEFAULT_LIFE_BOUNDARY_RULE as any,
          initialState: puzzle.initialState as any,
          stableState: puzzle.stableState as any,
          targetRegionIds: puzzle.targetRegionIds,
          targetAnswers: puzzle.targetAnswers as any,
          stableGeneration: puzzle.stableGeneration,
          status: 'ACTIVE',
        },
      });

      puzzleIndex++;
      console.log(
        `Created life puzzle #${puzzleIndex}: ${config.difficultyKey} (gen=${puzzle.stableGeneration}, regions=${puzzle.targetRegionIds.join(',')})`,
      );
    }
  }

  // Create demo user
  const demoPasswordHash = await argon2.hash('Demo123456', {
    type: argon2.argon2id,
  });

  await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: { role: 'ADMIN' },
    create: {
      email: 'demo@example.com',
      username: 'demo',
      passwordHash: demoPasswordHash,
      role: 'ADMIN',
    },
  });

  console.log('Created demo user: demo@example.com / Demo123456');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
