import type { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

function stableHash(value: unknown): string {
  const json = JSON.stringify(value);
  return createHash('sha256').update(json).digest('hex');
}

type DifficultySeed = {
  key: string;
  label: string;
  sortOrder: number;
  maxDurationMs?: number;
  config: Record<string, unknown>;
};

type GameSeed = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  source: string;
  sortOrder: number;
  metadata: Record<string, unknown>;
  ruleSet: {
    name: string;
    engineKey: string;
    engineVersion: string;
    config: Record<string, unknown>;
  };
  difficulties: DifficultySeed[];
  contentPolicy: {
    contentMode: 'GENERATED' | 'CURATED';
    generatorKey?: string;
    generatorConfig?: Record<string, unknown>;
  };
};

const GAMES: GameSeed[] = [
  {
    slug: 'sliding-puzzle',
    title: '数字华容道',
    subtitle: '滑动数字方块，复原顺序',
    description: '在 N x N 棋盘中移动数字方块，使其按从小到大排列，空格位于右下角。',
    source: '经典滑块谜题 / 最强大脑风格益智题',
    sortOrder: 10,
    metadata: {
      tags: ['空间推理', '路径规划', '经典谜题'],
      estimatedDuration: '1-10 min',
      dimensions: [
        { key: 'observe', label: '观察', value: 2 },
        { key: 'memory', label: '记忆', value: 2 },
        { key: 'spatial', label: '空间', value: 1 },
        { key: 'creative', label: '创造', value: 3 },
        { key: 'reasoning', label: '推理', value: 3 },
        { key: 'calculation', label: '计算', value: 3 },
      ],
    },
    ruleSet: {
      name: 'sliding-puzzle rules v1',
      engineKey: 'sliding-puzzle',
      engineVersion: '1.0.0',
      config: { goal: 'restore-ascending', emptyCorner: 'bottom-right' },
    },
    difficulties: [
      { key: 'easy', label: '3x3', sortOrder: 10, maxDurationMs: 10 * 60_000, config: { size: 3, scrambleMoves: 60 } },
      { key: 'normal', label: '4x4', sortOrder: 20, maxDurationMs: 20 * 60_000, config: { size: 4, scrambleMoves: 160 } },
      { key: 'hard', label: '5x5', sortOrder: 30, maxDurationMs: 30 * 60_000, config: { size: 5, scrambleMoves: 300 } },
    ],
    contentPolicy: {
      contentMode: 'GENERATED',
      generatorKey: 'sliding_puzzle_generator',
      generatorConfig: { seedScheme: 'cuid' },
    },
  },
  {
    slug: 'life-game',
    title: '生命游戏',
    subtitle: '推演细胞自动机，预测稳定区域',
    description: '观察 120×15 环屏网格中的初始细胞分布，根据 B3/S23 生命游戏规则，推理目标区域进入稳定状态后的存活细胞位置。',
    source: '最强大脑第十三季第一期 / Conway\u0027s Game of Life',
    sortOrder: 20,
    metadata: {
      tags: ['细胞自动机', '逻辑推演', '空间观察', '稳定状态'],
      estimatedDuration: '3-15 min',
      dimensions: [
        { key: 'observe', label: '观察', value: 3 },
        { key: 'memory', label: '记忆', value: 3 },
        { key: 'spatial', label: '空间', value: 1 },
        { key: 'creative', label: '创造', value: 2 },
        { key: 'reasoning', label: '推理', value: 5 },
        { key: 'calculation', label: '计算', value: 3 },
      ],
    },
    ruleSet: {
      name: 'life-game rules v1',
      engineKey: 'life-game',
      engineVersion: '1.0.0',
      config: { rule: 'B3/S23', boundary: 'horizontal-toroidal', width: 120, height: 15 },
    },
    difficulties: [
      { key: 'easy', label: '入门', sortOrder: 10, maxDurationMs: 15 * 60_000, config: { targetRegionCount: 1, description: '推理 1 个目标区域' } },
      { key: 'normal', label: '标准', sortOrder: 20, maxDurationMs: 20 * 60_000, config: { targetRegionCount: 2, description: '推理 2 个目标区域' } },
      { key: 'hard', label: '挑战', sortOrder: 30, maxDurationMs: 30 * 60_000, config: { targetRegionCount: 3, description: '推理 3 个目标区域' } },
    ],
    contentPolicy: { contentMode: 'CURATED' },
  },
  {
    slug: 'precise-character-building',
    title: '精准造字',
    subtitle: '选择部首，重组汉字，点亮文字池',
    description: '在 6×6 文字池中，每回合选择 4 个部首与 4 个连续格子中的字根组合成有效汉字。成功则点亮格子，部首进入冷却。点亮全部 36 格即挑战成功。',
    source: '最强大脑第十三季第二期',
    sortOrder: 30,
    metadata: {
      tags: ['汉字结构', '逻辑推理', '路径规划', '工作记忆'],
      estimatedDuration: '5-15 min',
      dimensions: [
        { key: 'observe', label: '观察', value: 3 },
        { key: 'memory', label: '记忆', value: 2 },
        { key: 'spatial', label: '空间', value: 1 },
        { key: 'creative', label: '创造', value: 2 },
        { key: 'reasoning', label: '推理', value: 5 },
        { key: 'calculation', label: '计算', value: 2 },
      ],
    },
    ruleSet: {
      name: 'precise-character-building rules v1',
      engineKey: 'precise-character-building',
      engineVersion: '1.0.0',
      config: { boardSize: 6, picksPerRound: 4, cooldownRounds: 1, adjacencyMode: 'ORTHOGONAL_4' },
    },
    difficulties: [
      { key: 'easy', label: '入门', sortOrder: 10, maxDurationMs: 20 * 60_000,
        config: { radicalPoolSize: 6, allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM'], rootComplexity: 'LOW' } },
      { key: 'normal', label: '标准', sortOrder: 20, maxDurationMs: 25 * 60_000,
        config: { radicalPoolSize: 6, allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM', 'SEMI_SURROUND'], rootComplexity: 'MEDIUM', recommended: true } },
      { key: 'hard', label: '挑战', sortOrder: 30, maxDurationMs: 30 * 60_000,
        config: { radicalPoolSize: 6, allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM', 'SEMI_SURROUND', 'SURROUND'], rootComplexity: 'HIGH' } },
    ],
    contentPolicy: { contentMode: 'CURATED' },
  },
  {
    slug: 'absolute-command',
    title: '绝对指令',
    subtitle: '三维路径规划与绝对方向指令挑战',
    description: '在 8×8×3 的三维迷宫中，输入绝对方向指令控制角色移动。经过所有可访问方格即为完成，步数越少排名越高。',
    source: '最强大脑第十三季第二期',
    sortOrder: 40,
    metadata: {
      tags: ['三维空间', '路径规划', '规则推演', '工作记忆'],
      estimatedDuration: '5-40 min',
      dimensions: [
        { key: 'observe', label: '观察', value: 3 },
        { key: 'memory', label: '记忆', value: 1 },
        { key: 'spatial', label: '空间', value: 5 },
        { key: 'creative', label: '创造', value: 2 },
        { key: 'reasoning', label: '推理', value: 4 },
        { key: 'calculation', label: '计算', value: 2 },
      ],
    },
    ruleSet: {
      name: 'absolute-command rules v1',
      engineKey: 'absolute-command',
      engineVersion: '1.0.0',
      config: { directions: ['X_POS', 'X_NEG', 'Y_POS', 'Y_NEG', 'Z_POS', 'Z_NEG'], stopReasons: ['WALL', 'BLOCKED', 'DESTINATION'] },
    },
    difficulties: [
      { key: 'standard', label: '按题目选择', sortOrder: 10, maxDurationMs: 60 * 60_000, config: { sizePresets: ['8x8x3'] } },
    ],
    contentPolicy: { contentMode: 'CURATED' },
  },
];

function defaultChallengePolicy(mode: 'RANKED' | 'PRACTICE') {
  if (mode === 'RANKED') {
    return {
      allowResume: false,
      allowMultipleActive: false,
      requiresHeartbeat: true,
      heartbeatIntervalSec: 5,
      heartbeatTimeoutSec: 15,
      operationLogMode: 'BATCHED' as const,
      operationBatchSize: 20,
      snapshotEveryNEvents: null as number | null,
      saveInitialSnapshot: true,
      saveFinalSnapshot: true,
      eligibleForLeaderboard: true,
      maxSubmitRetry: 1,
    };
  }
  return {
    allowResume: true,
    allowMultipleActive: true,
    requiresHeartbeat: false,
    heartbeatIntervalSec: 30,
    heartbeatTimeoutSec: 90,
    operationLogMode: 'NONE' as const,
    operationBatchSize: 20,
    snapshotEveryNEvents: null as number | null,
    saveInitialSnapshot: true,
    saveFinalSnapshot: false,
    eligibleForLeaderboard: false,
    maxSubmitRetry: 5,
  };
}

export async function seedGames(prisma: PrismaClient): Promise<void> {
  for (const g of GAMES) {
    const game = await prisma.game.upsert({
      where: { slug: g.slug },
      update: {
        title: g.title, subtitle: g.subtitle, description: g.description, source: g.source,
        status: 'PUBLISHED', sortOrder: g.sortOrder, metadata: g.metadata, publishedAt: new Date(),
      },
      create: {
        slug: g.slug, title: g.title, subtitle: g.subtitle, description: g.description, source: g.source,
        status: 'PUBLISHED', sortOrder: g.sortOrder, metadata: g.metadata, publishedAt: new Date(),
      },
    });

    // Rule-set version v1 ACTIVE
    const ruleSetHash = stableHash(g.ruleSet.config);
    await prisma.gameRuleSetVersion.upsert({
      where: { gameId_version: { gameId: game.id, version: 1 } },
      update: {
        name: g.ruleSet.name, engineKey: g.ruleSet.engineKey, engineVersion: g.ruleSet.engineVersion,
        config: g.ruleSet.config, configHash: ruleSetHash,
        validationStatus: 'VALID', status: 'ACTIVE', activatedAt: new Date(),
      },
      create: {
        gameId: game.id, version: 1, name: g.ruleSet.name,
        engineKey: g.ruleSet.engineKey, engineVersion: g.ruleSet.engineVersion,
        config: g.ruleSet.config, configHash: ruleSetHash,
        validationStatus: 'VALID', status: 'ACTIVE', activatedAt: new Date(),
      },
    });

    // Difficulties v1 ACTIVE
    for (const d of g.difficulties) {
      const diffHash = stableHash(d.config);
      await prisma.gameDifficulty.upsert({
        where: { gameId_key_version: { gameId: game.id, key: d.key, version: 1 } },
        update: {
          label: d.label, sortOrder: d.sortOrder, maxDurationMs: d.maxDurationMs ?? null,
          config: d.config, configHash: diffHash, status: 'ACTIVE', activatedAt: new Date(),
        },
        create: {
          gameId: game.id, key: d.key, label: d.label, version: 1, sortOrder: d.sortOrder,
          maxDurationMs: d.maxDurationMs ?? null, config: d.config, configHash: diffHash,
          status: 'ACTIVE', activatedAt: new Date(),
        },
      });
    }

    // Content policy (one per game, mode-agnostic) — manual find/create to mimic upsert.
    const existingCP = await prisma.gameContentPolicy.findFirst({
      where: { gameId: game.id, difficultyId: null, mode: null, status: 'ACTIVE' },
    });
    const cpData = {
      gameId: game.id, difficultyId: null, mode: null,
      contentMode: g.contentPolicy.contentMode,
      selectionStrategy: g.contentPolicy.contentMode === 'GENERATED' ? 'RANDOM' as const : 'MANUAL' as const,
      generatorKey: g.contentPolicy.generatorKey ?? null,
      generatorConfig: g.contentPolicy.generatorConfig ?? {},
      puzzlePoolFilter: {}, scheduleGranularity: null,
      allowRepeatedPuzzle: true, repeatCooldownHours: null, weightConfig: {},
      status: 'ACTIVE' as const, activatedAt: new Date(),
    };
    if (existingCP) {
      await prisma.gameContentPolicy.update({ where: { id: existingCP.id }, data: cpData });
    } else {
      await prisma.gameContentPolicy.create({ data: cpData });
    }

    // Challenge policies (RANKED + PRACTICE)
    for (const mode of ['RANKED', 'PRACTICE'] as const) {
      const policy = defaultChallengePolicy(mode);
      const existing = await prisma.gameChallengePolicy.findFirst({
        where: { gameId: game.id, mode, difficultyId: null, status: 'ACTIVE' },
      });
      const data = { gameId: game.id, mode, difficultyId: null, ...policy, status: 'ACTIVE' as const };
      if (existing) {
        await prisma.gameChallengePolicy.update({ where: { id: existing.id }, data });
      } else {
        await prisma.gameChallengePolicy.create({ data });
      }
    }

    console.log(`   game ${g.slug}: ruleSet v1, ${g.difficulties.length} difficulties, RANKED+PRACTICE policies`);
  }
}
