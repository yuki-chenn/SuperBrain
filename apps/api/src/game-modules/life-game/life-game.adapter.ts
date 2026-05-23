import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LIFE_GAME_DIFFICULTIES } from '@brain-games/shared';
import type {
  GameAdapter,
  StartAttemptInput,
  StartAttemptResult,
  FinishAttemptInput,
  FinishAttemptResult,
} from '../../games/game-adapter.interface';

@Injectable()
export class LifeGameAdapter implements GameAdapter {
  slug = 'life-game';

  constructor(private prisma: PrismaService) {}

  async startAttempt(input: StartAttemptInput): Promise<StartAttemptResult> {
    const difficulty = LIFE_GAME_DIFFICULTIES.find((d) => d.key === input.difficultyKey);
    if (!difficulty) throw new Error(`Invalid difficulty: ${input.difficultyKey}`);

    // Find puzzles matching difficulty, prefer ones user hasn't played
    const puzzles = await this.prisma.lifePuzzle.findMany({
      where: {
        gameId: input.gameId,
        difficultyKey: input.difficultyKey,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'asc' },
    });

    if (puzzles.length === 0) {
      throw new Error(`No puzzles available for difficulty: ${input.difficultyKey}`);
    }

    // Check which puzzles the user has already attempted
    const userAttempts = await this.prisma.gameAttempt.findMany({
      where: {
        userId: input.userId,
        gameId: input.gameId,
        difficultyKey: input.difficultyKey,
        lifePuzzleId: { not: null },
      },
      select: { lifePuzzleId: true },
    });

    const playedPuzzleIds = new Set(
      userAttempts.map((a) => a.lifePuzzleId).filter(Boolean),
    );

    // Prefer unplayed puzzles
    const unplayed = puzzles.filter((p) => !playedPuzzleIds.has(p.id));
    const candidates = unplayed.length > 0 ? unplayed : puzzles;

    // Pick a random one
    const puzzle = candidates[Math.floor(Math.random() * candidates.length)];

    const puzzleData = {
      width: puzzle.width,
      height: puzzle.height,
      boundary: puzzle.boundary as { wrapX: boolean; wrapY: boolean },
      aliveCells: (puzzle.initialState as { aliveCells: Array<{ x: number; y: number }> }).aliveCells,
    };

    return {
      seed: puzzle.id,
      initialState: {
        width: puzzleData.width,
        height: puzzleData.height,
        aliveCells: puzzleData.aliveCells,
      },
    };
  }

  async finishAttempt(_input: FinishAttemptInput): Promise<FinishAttemptResult> {
    return {
      valid: false,
      invalidReason: 'USE_REGION_SUBMISSION',
    };
  }
}
