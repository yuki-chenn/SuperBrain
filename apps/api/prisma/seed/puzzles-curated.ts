import type { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import {
  DEFAULT_LIFE_BOUNDARY_RULE,
  LIFE_BOARD_HEIGHT,
  LIFE_BOARD_WIDTH,
  validateAbsoluteCommandPuzzle,
} from '@brain-games/game-engine';
import { generateValidLifePuzzle } from './life-puzzle-generator';
import { generatePCBPuzzle } from './pcb-puzzle-generator';
import { ABSOLUTE_COMMAND_PUZZLES } from './absolute-command-data';

function stableContentHash(content: unknown): string {
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

type SeedPuzzleArgs = {
  prisma: PrismaClient;
  gameSlug: string;
  puzzleSlug: string;
  title: string;
  description?: string;
  difficultyKey?: string;
  engineKey: string;
  content: Record<string, unknown>;
  referenceSolution?: unknown;
  source?: string;
  sortOrder?: number;
};

async function upsertPuzzleWithVersion(args: SeedPuzzleArgs) {
  const game = await args.prisma.game.findUniqueOrThrow({ where: { slug: args.gameSlug } });
  const difficulty = args.difficultyKey
    ? await args.prisma.gameDifficulty.findFirst({
        where: { gameId: game.id, key: args.difficultyKey, status: 'ACTIVE' },
      })
    : null;

  const puzzle = await args.prisma.puzzle.upsert({
    where: { gameId_slug: { gameId: game.id, slug: args.puzzleSlug } },
    update: {
      title: args.title, description: args.description,
      difficultyId: difficulty?.id ?? null, source: args.source,
      sortOrder: args.sortOrder ?? 0, status: 'PUBLISHED', publishedAt: new Date(),
    },
    create: {
      gameId: game.id, slug: args.puzzleSlug, title: args.title, description: args.description,
      difficultyId: difficulty?.id ?? null, source: args.source,
      sortOrder: args.sortOrder ?? 0, status: 'PUBLISHED', publishedAt: new Date(),
    },
  });

  const contentHash = stableContentHash(args.content);
  const version = await args.prisma.puzzleVersion.upsert({
    where: { puzzleId_version: { puzzleId: puzzle.id, version: 1 } },
    update: {
      engineKey: args.engineKey, content: args.content as object, contentHash,
      referenceSolution: args.referenceSolution as object | null | undefined,
      validationStatus: 'VALID', status: 'PUBLISHED', publishedAt: new Date(),
    },
    create: {
      puzzleId: puzzle.id, version: 1, engineKey: args.engineKey,
      content: args.content as object, contentHash,
      referenceSolution: args.referenceSolution as object | null | undefined,
      validationStatus: 'VALID', status: 'PUBLISHED', publishedAt: new Date(),
    },
  });

  if (puzzle.currentVersionId !== version.id) {
    await args.prisma.puzzle.update({ where: { id: puzzle.id }, data: { currentVersionId: version.id } });
  }
}

async function seedLifeGamePuzzles(prisma: PrismaClient) {
  const configs = [
    { difficultyKey: 'easy', targetRegionCount: 1, count: 3 },
    { difficultyKey: 'normal', targetRegionCount: 2, count: 3 },
    { difficultyKey: 'hard', targetRegionCount: 3, count: 3 },
  ];
  let n = 0;
  for (const cfg of configs) {
    for (let i = 0; i < cfg.count; i++) {
      const seed = `life-puzzle-${cfg.difficultyKey}-${i}`;
      const puzzle = generateValidLifePuzzle(seed, cfg.difficultyKey, cfg.targetRegionCount);
      if (!puzzle) { console.log(`   life ${cfg.difficultyKey} #${i}: null, skip`); continue; }
      await upsertPuzzleWithVersion({
        prisma,
        gameSlug: 'life-game',
        puzzleSlug: `life-${cfg.difficultyKey}-${String(i + 1).padStart(2, '0')}`,
        title: `生命游戏 · ${cfg.difficultyKey} #${i + 1}`,
        difficultyKey: cfg.difficultyKey,
        engineKey: 'life-game',
        sortOrder: (i + 1) * 10,
        content: {
          engine: 'life-game', schemaVersion: 1,
          width: LIFE_BOARD_WIDTH, height: LIFE_BOARD_HEIGHT,
          boundary: DEFAULT_LIFE_BOUNDARY_RULE,
          initialState: puzzle.initialState, stableState: puzzle.stableState,
          targetRegionIds: puzzle.targetRegionIds, targetAnswers: puzzle.targetAnswers,
          stableGeneration: puzzle.stableGeneration, seedSource: seed,
        },
        referenceSolution: { targetAnswers: puzzle.targetAnswers },
      });
      n++;
    }
  }
  console.log(`   life-game: ${n} puzzles`);
}

async function seedPcbPuzzles(prisma: PrismaClient) {
  const configs = [
    { difficultyKey: 'easy', count: 3 },
    { difficultyKey: 'normal', count: 3 },
    { difficultyKey: 'hard', count: 3 },
  ];
  let n = 0;
  for (const cfg of configs) {
    for (let i = 0; i < cfg.count; i++) {
      let puzzle: ReturnType<typeof generatePCBPuzzle> = null;
      let chosenSeed = '';
      for (let a = 0; a < 120; a++) {
        const seed = `pcb-puzzle-${cfg.difficultyKey}-${i}-${a}`;
        puzzle = generatePCBPuzzle(seed, cfg.difficultyKey, 6);
        if (puzzle) { chosenSeed = seed; break; }
      }
      if (!puzzle) { console.log(`   pcb ${cfg.difficultyKey} #${i}: null, skip`); continue; }
      const solutionRounds = puzzle.solutionRounds.map((r) => ({
        roundIndex: r.roundIndex,
        path: r.path,
        radicalKeys: r.radicalKeys,
        resultChars: r.resultChars,
      }));
      await upsertPuzzleWithVersion({
        prisma,
        gameSlug: 'precise-character-building',
        puzzleSlug: `pcb-${cfg.difficultyKey}-${String(i + 1).padStart(2, '0')}`,
        title: `精准造字 · ${cfg.difficultyKey} #${i + 1}`,
        difficultyKey: cfg.difficultyKey,
        engineKey: 'precise-character-building',
        sortOrder: (i + 1) * 10,
        content: {
          engine: 'precise-character-building', schemaVersion: 1,
          boardSize: 6, radicalPool: puzzle.radicalPool,
          cells: puzzle.cells, solutionRounds,
          runtimeConfig: {
            picksPerRound: 4, adjacencyMode: 'ORTHOGONAL_4',
            cooldownRounds: 1, allowRadicalRepeatInRound: true,
          },
          seedSource: chosenSeed,
        },
        referenceSolution: { solutionRounds },
      });
      n++;
    }
  }
  console.log(`   precise-character-building: ${n} puzzles`);
}

async function seedAbsoluteCommandPuzzles(prisma: PrismaClient) {
  let n = 0;
  for (const data of ABSOLUTE_COMMAND_PUZZLES) {
    const solution = data.referenceSolution.length > 0 ? data.referenceSolution : undefined;
    const validation = validateAbsoluteCommandPuzzle(
      {
        puzzleId: 'seed', puzzleVersion: 1,
        size: data.size, startCoord: data.startCoord, cells: data.cells,
      },
      solution,
    );
    if (!validation.valid) {
      console.log(`   absolute-command ${data.slug}: invalid, skip`);
      continue;
    }
    await upsertPuzzleWithVersion({
      prisma,
      gameSlug: 'absolute-command',
      puzzleSlug: data.slug,
      title: data.title,
      description: data.description,
      difficultyKey: 'standard',
      engineKey: 'absolute-command',
      source: data.source,
      sortOrder: n * 10 + 10,
      content: {
        engine: 'absolute-command', schemaVersion: 1,
        size: data.size, startCoord: data.startCoord, cells: data.cells,
        optimalCommandCount: data.optimalCommandCount,
        difficultyLabel: data.difficultyLabel,
        season: data.season, episode: data.episode,
      },
      referenceSolution: solution ? { commands: solution } : undefined,
    });
    n++;
  }
  console.log(`   absolute-command: ${n} puzzles`);
}

export async function seedCuratedPuzzles(prisma: PrismaClient): Promise<void> {
  await seedLifeGamePuzzles(prisma);
  await seedPcbPuzzles(prisma);
  await seedAbsoluteCommandPuzzles(prisma);
}
