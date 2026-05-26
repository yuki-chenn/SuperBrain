import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  GameAdapter,
  StartAttemptInput,
  StartAttemptResult,
  FinishAttemptInput,
  FinishAttemptResult,
} from '../game-adapter.interface';

@Injectable()
export class PreciseCharacterBuildingAdapter implements GameAdapter {
  slug = 'precise-character-building';

  constructor(private prisma: PrismaService) {}

  async startAttempt(input: StartAttemptInput): Promise<StartAttemptResult> {
    const puzzles = await this.prisma.preciseCharacterPuzzle.findMany({
      where: {
        gameId: input.gameId,
        difficultyKey: input.difficultyKey,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'asc' },
    });

    if (puzzles.length === 0) {
      throw new Error(`No PCB puzzles available for difficulty: ${input.difficultyKey}`);
    }

    // Prefer unplayed puzzles
    const userAttempts = await this.prisma.gameAttempt.findMany({
      where: {
        userId: input.userId,
        gameId: input.gameId,
        difficultyKey: input.difficultyKey,
        pcbPuzzleId: { not: null },
      },
      select: { pcbPuzzleId: true },
    });

    const playedIds = new Set(
      userAttempts.map((a) => a.pcbPuzzleId).filter(Boolean),
    );

    const unplayed = puzzles.filter((p) => !playedIds.has(p.id));
    const candidates = unplayed.length > 0 ? unplayed : puzzles;
    const puzzle = candidates[Math.floor(Math.random() * candidates.length)];

    const puzzleData = puzzle as unknown as {
      radicalPool: unknown;
      cells: unknown;
      config: unknown;
    };

    return {
      seed: puzzle.id,
      initialState: {
        radicalPool: puzzleData.radicalPool,
        cells: puzzleData.cells,
        config: puzzleData.config,
      },
    };
  }

  async finishAttempt(_input: FinishAttemptInput): Promise<FinishAttemptResult> {
    return {
      valid: false,
      invalidReason: 'USE_ROUND_SUBMISSION',
    };
  }
}
