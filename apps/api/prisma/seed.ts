import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { DEFAULT_LIFE_BOUNDARY_RULE, LIFE_BOARD_HEIGHT, LIFE_BOARD_WIDTH, validateAbsoluteCommandPuzzle } from '@brain-games/game-engine';
import { generateValidLifePuzzle } from './seed/life-puzzle-generator';
import { GAME_LEADERBOARD_CONFIGS, PCB_LEADERBOARD_CONFIGS, seedLeaderboards } from './seed/leaderboards';
import { COMBO_DATA, RADICAL_DATA, ROOT_DATA } from './seed/pcb-data';
import { generatePCBPuzzle } from './seed/pcb-puzzle-generator';
import { ABSOLUTE_COMMAND_PUZZLES } from './seed/absolute-command-data';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const slidingPuzzle = await prisma.game.upsert({
    where: { slug: 'sliding-puzzle' },
    update: {
      title: '数字华容道',
      subtitle: '滑动数字方块，复原顺序',
      description: '在 N x N 棋盘中移动数字方块，使其按从小到大排列，空格位于右下角。',
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
        dimensions: [
          { key: 'observe', label: '观察', value: 2 },
          { key: 'memory', label: '记忆', value: 2 },
          { key: 'spatial', label: '空间', value: 1 },
          { key: 'creative', label: '创造', value: 3 },
          { key: 'reasoning', label: '推理', value: 3 },
          { key: 'calculation', label: '计算', value: 3 },
        ],
      },
    },
    create: {
      slug: 'sliding-puzzle',
      title: '数字华容道',
      subtitle: '滑动数字方块，复原顺序',
      description: '在 N x N 棋盘中移动数字方块，使其按从小到大排列，空格位于右下角。',
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
        dimensions: [
          { key: 'observe', label: '观察', value: 2 },
          { key: 'memory', label: '记忆', value: 2 },
          { key: 'spatial', label: '空间', value: 1 },
          { key: 'creative', label: '创造', value: 3 },
          { key: 'reasoning', label: '推理', value: 3 },
          { key: 'calculation', label: '计算', value: 3 },
        ],
      },
    },
  });
  console.log(`Created game: ${slidingPuzzle.title} (${slidingPuzzle.slug})`);
  await seedLeaderboards(prisma, slidingPuzzle.id, GAME_LEADERBOARD_CONFIGS['sliding-puzzle']);

  const lifeGame = await prisma.game.upsert({
    where: { slug: 'life-game' },
    update: {
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
        dimensions: [
          { key: 'observe', label: '观察', value: 3 },
          { key: 'memory', label: '记忆', value: 3 },
          { key: 'spatial', label: '空间', value: 1 },
          { key: 'creative', label: '创造', value: 2 },
          { key: 'reasoning', label: '推理', value: 5 },
          { key: 'calculation', label: '计算', value: 3 },
        ],
      },
    },
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
        dimensions: [
          { key: 'observe', label: '观察', value: 3 },
          { key: 'memory', label: '记忆', value: 3 },
          { key: 'spatial', label: '空间', value: 1 },
          { key: 'creative', label: '创造', value: 2 },
          { key: 'reasoning', label: '推理', value: 5 },
          { key: 'calculation', label: '计算', value: 3 },
        ],
      },
    },
  });
  console.log(`Created game: ${lifeGame.title} (${lifeGame.slug})`);
  await seedLeaderboards(prisma, lifeGame.id, GAME_LEADERBOARD_CONFIGS['life-game']);

  const deletedLifePuzzles = await prisma.lifePuzzle.deleteMany({
    where: { gameId: lifeGame.id },
  });
  console.log(`Cleared ${deletedLifePuzzles.count} stale life puzzles`);

  const lifePuzzleConfigs = [
    { difficultyKey: 'easy', targetRegionCount: 1, count: 3 },
    { difficultyKey: 'normal', targetRegionCount: 2, count: 3 },
    { difficultyKey: 'hard', targetRegionCount: 3, count: 3 },
  ];
  let lifePuzzleIndex = 0;
  for (const config of lifePuzzleConfigs) {
    for (let i = 0; i < config.count; i++) {
      const seed = `life-puzzle-${config.difficultyKey}-${i}`;
      const puzzle = generateValidLifePuzzle(seed, config.difficultyKey, config.targetRegionCount);
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

      lifePuzzleIndex++;
      console.log(
        `Created life puzzle #${lifePuzzleIndex}: ${config.difficultyKey} (gen=${puzzle.stableGeneration}, regions=${puzzle.targetRegionIds.join(',')})`,
      );
    }
  }

  console.log('\n--- Seeding Precise Character Building ---');

  const radicalRecords: Record<string, { id: string }> = {};
  for (const r of RADICAL_DATA) {
    const record = await prisma.characterRadical.upsert({
      where: { key: r.key },
      update: {},
      create: r,
    });
    radicalRecords[r.key] = record;
  }
  console.log(`Seeded ${RADICAL_DATA.length} radicals`);

  const rootRecords: Record<string, { id: string }> = {};
  for (const r of ROOT_DATA) {
    const record = await prisma.characterRoot.upsert({
      where: { key: r.key },
      update: {},
      create: r,
    });
    rootRecords[r.key] = record;
  }
  console.log(`Seeded ${ROOT_DATA.length} roots`);

  // Wipe the combination dictionary before re-inserting so removed/buggy
  // entries from previous seeds don't linger as enabled rows. The dictionary
  // is purely seed-driven (no user-editable rows), so this is safe.
  const deletedCombos = await prisma.characterCombination.deleteMany({});
  console.log(`Cleared ${deletedCombos.count} stale combinations`);

  for (const c of COMBO_DATA) {
    const radical = radicalRecords[c.radicalKey];
    const root = rootRecords[c.rootKey];
    if (!radical || !root) continue;

    await prisma.characterCombination.upsert({
      where: {
        radicalId_rootId_resultChar: {
          radicalId: radical.id,
          rootId: root.id,
          resultChar: c.resultChar,
        },
      },
      update: {},
      create: {
        radicalId: radical.id,
        rootId: root.id,
        resultChar: c.resultChar,
        pinyin: c.pinyin,
        structure: c.structure,
        difficulty: c.difficulty,
        frequencyLevel: c.frequencyLevel,
      },
    });
  }
  console.log(`Seeded ${COMBO_DATA.length} combinations`);

  const pcbGame = await prisma.game.upsert({
    where: { slug: 'precise-character-building' },
    update: {
      title: '精准造字',
      subtitle: '选择部首，重组汉字，点亮文字池',
      description:
        '在 6×6 文字池中，每回合选择 4 个部首与 4 个连续格子中的字根组合成有效汉字。成功则点亮格子，部首进入冷却。点亮全部 36 格即挑战成功。',
      source: '最强大脑第十三季第二期',
      status: 'PUBLISHED',
      difficultyLevels: [
        { key: 'easy', label: '入门', boardSize: 6, picksPerRound: 4, radicalPoolSize: 6, adjacencyMode: 'ORTHOGONAL_4', allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM'], rootComplexity: 'LOW' },
        { key: 'normal', label: '标准', boardSize: 6, picksPerRound: 4, radicalPoolSize: 6, adjacencyMode: 'ORTHOGONAL_4', allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM', 'SEMI_SURROUND'], rootComplexity: 'MEDIUM', recommended: true },
        { key: 'hard', label: '挑战', boardSize: 6, picksPerRound: 4, radicalPoolSize: 6, adjacencyMode: 'ORTHOGONAL_4', allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM', 'SEMI_SURROUND', 'SURROUND'], rootComplexity: 'HIGH' },
      ],
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
    },
    create: {
      slug: 'precise-character-building',
      title: '精准造字',
      subtitle: '选择部首，重组汉字，点亮文字池',
      description:
        '在 6×6 文字池中，每回合选择 4 个部首与 4 个连续格子中的字根组合成有效汉字。成功则点亮格子，部首进入冷却。点亮全部 36 格即挑战成功。',
      source: '最强大脑第十三季第二期',
      status: 'PUBLISHED',
      difficultyLevels: [
        { key: 'easy', label: '入门', boardSize: 6, picksPerRound: 4, radicalPoolSize: 6, adjacencyMode: 'ORTHOGONAL_4', allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM'], rootComplexity: 'LOW' },
        { key: 'normal', label: '标准', boardSize: 6, picksPerRound: 4, radicalPoolSize: 6, adjacencyMode: 'ORTHOGONAL_4', allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM', 'SEMI_SURROUND'], rootComplexity: 'MEDIUM', recommended: true },
        { key: 'hard', label: '挑战', boardSize: 6, picksPerRound: 4, radicalPoolSize: 6, adjacencyMode: 'ORTHOGONAL_4', allowedStructures: ['LEFT_RIGHT', 'TOP_BOTTOM', 'SEMI_SURROUND', 'SURROUND'], rootComplexity: 'HIGH' },
      ],
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
    },
  });
  console.log(`Created game: ${pcbGame.title} (${pcbGame.slug})`);
  await seedLeaderboards(prisma, pcbGame.id, PCB_LEADERBOARD_CONFIGS);

  const pcbPuzzleConfigs = [
    { difficultyKey: 'easy', count: 3 },
    { difficultyKey: 'normal', count: 3 },
    { difficultyKey: 'hard', count: 3 },
  ];
  let pcbPuzzleIndex = 0;
  for (const config of pcbPuzzleConfigs) {
    for (let i = 0; i < config.count; i++) {
      let puzzle: ReturnType<typeof generatePCBPuzzle> = null;
      let chosenSeed = '';
      for (let attempt = 0; attempt < 120; attempt++) {
        const seed = `pcb-puzzle-${config.difficultyKey}-${i}-${attempt}`;
        puzzle = generatePCBPuzzle(seed, config.difficultyKey, 6);
        if (puzzle) {
          chosenSeed = seed;
          break;
        }
      }

      if (!puzzle) {
        console.log(`Could not generate PCB puzzle for ${config.difficultyKey} #${i}, skipping`);
        continue;
      }

      await prisma.preciseCharacterPuzzle.create({
        data: {
          gameId: pcbGame.id,
          difficultyKey: config.difficultyKey,
          boardSize: 6,
          radicalPool: puzzle.radicalPool as any,
          cells: puzzle.cells as any,
          solutionRounds: puzzle.solutionRounds as any,
          config: {
            picksPerRound: 4,
            adjacencyMode: 'ORTHOGONAL_4',
            cooldownRounds: 1,
            allowRadicalRepeatInRound: true,
          } as any,
          status: 'ACTIVE',
        },
      });

      pcbPuzzleIndex++;
      console.log(
        `Created PCB puzzle #${pcbPuzzleIndex}: ${config.difficultyKey} (seed=${chosenSeed}, radicals=${puzzle.radicalPool.map((r) => r.glyph).join('')})`,
      );
    }
  }

  // ─── Absolute Command ───────────────────────────────────────────────

  console.log('\n--- Seeding Absolute Command ---');

  const acGame = await prisma.game.upsert({
    where: { slug: 'absolute-command' },
    update: {
      title: '绝对指令',
      subtitle: '三维路径规划与绝对方向指令挑战',
      description:
        '在 8×8×3 的三维迷宫中，输入绝对方向指令控制角色移动。经过所有可访问方格即为完成，步数越少排名越高。',
      source: '最强大脑第十三季第二期',
      status: 'PUBLISHED',
      difficultyLevels: [
        { key: 'standard', label: '按题目选择' },
      ],
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
    },
    create: {
      slug: 'absolute-command',
      title: '绝对指令',
      subtitle: '三维路径规划与绝对方向指令挑战',
      description:
        '在 8×8×3 的三维迷宫中，输入绝对方向指令控制角色移动。经过所有可访问方格即为完成，步数越少排名越高。',
      source: '最强大脑第十三季第二期',
      status: 'PUBLISHED',
      difficultyLevels: [
        { key: 'standard', label: '按题目选择' },
      ],
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
    },
  });
  console.log(`Created game: ${acGame.title} (${acGame.slug})`);

  // Seed puzzles
  for (const puzzleData of ABSOLUTE_COMMAND_PUZZLES) {
    // Validate the puzzle
    const snapshot = {
      puzzleId: 'temp',
      puzzleVersion: 1,
      size: puzzleData.size,
      startCoord: puzzleData.startCoord,
      cells: puzzleData.cells,
    };
    const solution = puzzleData.referenceSolution.length > 0 ? puzzleData.referenceSolution : undefined;
    const validation = validateAbsoluteCommandPuzzle(snapshot, solution);
    if (!validation.valid) {
      console.log(`Skipping puzzle ${puzzleData.slug}: validation failed`, validation.errors);
      continue;
    }

    const puzzle = await prisma.absoluteCommandPuzzle.upsert({
      where: { slug: puzzleData.slug },
      update: {
        title: puzzleData.title,
        description: puzzleData.description,
        difficultyLabel: puzzleData.difficultyLabel,
        estimatedDuration: puzzleData.estimatedDuration,
        optimalCommandCount: puzzleData.optimalCommandCount,
        season: puzzleData.season,
        episode: puzzleData.episode,
        source: puzzleData.source,
        status: 'PUBLISHED',
      },
      create: {
        gameId: acGame.id,
        slug: puzzleData.slug,
        title: puzzleData.title,
        description: puzzleData.description,
        difficultyLabel: puzzleData.difficultyLabel,
        estimatedDuration: puzzleData.estimatedDuration,
        optimalCommandCount: puzzleData.optimalCommandCount,
        season: puzzleData.season,
        episode: puzzleData.episode,
        source: puzzleData.source,
        status: 'PUBLISHED',
      },
    });

    // Create or update puzzle version
    const existingVersion = await prisma.absoluteCommandPuzzleVersion.findFirst({
      where: { puzzleId: puzzle.id },
      orderBy: { version: 'desc' },
    });

    const versionNumber = existingVersion ? existingVersion.version + 1 : 1;
    await prisma.absoluteCommandPuzzleVersion.create({
      data: {
        puzzleId: puzzle.id,
        version: versionNumber,
        size: puzzleData.size as any,
        startCoord: puzzleData.startCoord as any,
        cells: puzzleData.cells as any,
        referenceSolution: solution as any,
        validationStatus: validation.valid ? 'VALID' : 'INVALID',
        validationReport: validation as any,
      },
    });

    // Update currentVersionId
    await prisma.absoluteCommandPuzzle.update({
      where: { id: puzzle.id },
      data: { currentVersionId: puzzle.id },
    });

    // Create per-puzzle leaderboard
    const lbSlug = `ac-${puzzleData.slug}-fastest`;
    const lbName = `绝对指令 · ${puzzleData.title.replace('绝对指令 · ', '')} 最快通关榜`;
    await prisma.leaderboardDefinition.upsert({
      where: { slug: lbSlug },
      update: {
        name: lbName,
        puzzleId: puzzle.id,
        rankMetric: 'commandCount',
        rankDirection: 'ASC',
        tieBreakers: [
          { metric: 'durationMs', direction: 'ASC' },
          { metric: 'completedAt', direction: 'ASC' },
        ] as any,
        metadata: {
          displayColumns: [
            { metric: 'commandCount', label: '步数' },
            { metric: 'durationMs', label: '用时', format: 'duration' },
            { metric: 'travelDistance', label: '距离' },
          ],
        } as any,
      },
      create: {
        gameId: acGame.id,
        slug: lbSlug,
        name: lbName,
        scope: 'GLOBAL',
        puzzleId: puzzle.id,
        rankMetric: 'commandCount',
        rankDirection: 'ASC',
        tieBreakers: [
          { metric: 'durationMs', direction: 'ASC' },
          { metric: 'completedAt', direction: 'ASC' },
        ],
        entryPolicy: 'BEST_PER_USER',
        metadata: {
          displayColumns: [
            { metric: 'commandCount', label: '步数' },
            { metric: 'durationMs', label: '用时', format: 'duration' },
            { metric: 'travelDistance', label: '距离' },
          ],
        } as any,
      },
    });

    console.log(`Created absolute-command puzzle: ${puzzleData.title} (${puzzleData.slug})`);
  }

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
