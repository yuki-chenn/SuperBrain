import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GamesService } from '../games/games.service';
import { LeaderboardsService } from '../leaderboards/leaderboards.service';
import { getGameMaxDurationMs, isAttemptTimedOut } from '../games/attempt-timeout';

@Injectable()
export class AttemptsService {
  constructor(
    private prisma: PrismaService,
    private games: GamesService,
    private leaderboards: LeaderboardsService,
  ) {}

  async startAttempt(userId: string, gameSlug: string, difficultyKey: string) {
    const game = await this.games.findBySlug(gameSlug);

    // Validate difficulty exists
    const levels = game.difficultyLevels as Array<{ key: string; label: string; size: number }>;
    if (!levels.find((l) => l.key === difficultyKey)) {
      throw new NotFoundException(`Difficulty '${difficultyKey}' not found for game '${gameSlug}'`);
    }

    const adapter = this.games.getAdapter(gameSlug);
    const result = await adapter.startAttempt({
      userId,
      gameId: game.id,
      difficultyKey,
    });
    const maxDurationMs = getGameMaxDurationMs(gameSlug, difficultyKey);

    const isLifeGame = gameSlug === 'life-game';
    const isPCB = gameSlug === 'precise-character-building';

    const createData: any = {
      userId,
      gameId: game.id,
      difficultyKey,
      seed: result.seed,
      initialState: result.initialState as any,
      status: 'STARTED',
    };

    if (isLifeGame) {
      const puzzle = await this.prisma.lifePuzzle.findUnique({
        where: { id: result.seed },
      });
      if (puzzle) {
        createData.lifePuzzleId = puzzle.id;
        createData.metadata = {
          targetRegionIds: puzzle.targetRegionIds,
          correctRegionIds: [],
          errorCount: 0,
          boundary: puzzle.boundary,
          width: puzzle.width,
          height: puzzle.height,
          puzzleId: puzzle.id,
        };
      }
    }

    if (isPCB) {
      const pcbState = {
        currentRoundIndex: 0,
        currentPosition: null,
        litCellIndices: [],
        disabledRadicalKeys: [],
        errorCount: 0,
      };
      createData.pcbPuzzleId = result.seed;
      createData.metadata = {
        ...pcbState,
        litResults: [],
        puzzleId: result.seed,
      };
    }

    const attempt = await this.prisma.gameAttempt.create({
      data: createData,
    });

    const initialState = result.initialState as any;
    const response: any = {
      attemptId: attempt.id,
      gameSlug,
      difficultyKey,
      seed: result.seed,
      initialState: result.initialState,
      maxDurationMs,
      startedAt: attempt.startedAt.toISOString(),
    };

    if (isLifeGame && createData.metadata) {
      response.targetRegionIds = createData.metadata.targetRegionIds;
      response.boundary = createData.metadata.boundary;
      response.width = createData.metadata.width;
      response.height = createData.metadata.height;
    }

    if (isPCB) {
      const config = {
        ...(initialState.config || {}),
        adjacencyMode: 'ORTHOGONAL_4',
      };
      response.state = {
        currentRoundIndex: 0,
        currentPosition: null,
        litCellIndices: [],
        disabledRadicalKeys: [],
        errorCount: 0,
      };
      response.boardSize = 6;
      response.cells = initialState.cells;
      response.radicalPool = initialState.radicalPool;
      response.config = config;
    }

    return response;
  }

  async startPlaying(userId: string, gameSlug: string, attemptId: string) {
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'STARTED') {
      throw new ConflictException('Attempt already finished');
    }
    const maxDurationMs = getGameMaxDurationMs(gameSlug, attempt.difficultyKey);
    if (isAttemptTimedOut(attempt.startedAt, maxDurationMs)) {
      await this.prisma.gameAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'FAILED',
          invalidReason: 'TIMEOUT',
          completedAt: new Date(),
        },
      });
      return {
        attemptId,
        status: 'FAILED',
        reason: 'TIMEOUT',
      };
    }

    const now = new Date();
    await this.prisma.gameAttempt.update({
      where: { id: attemptId },
      data: { startedAt: now },
    });

    return { startedAt: now.toISOString() };
  }

  async finishAttempt(
    userId: string,
    gameSlug: string,
    attemptId: string,
    payload: unknown,
  ) {
    if (gameSlug === 'life-game') {
      throw new BadRequestException('Life game uses region submission. Use /regions/:regionId/submit instead.');
    }
    if (gameSlug === 'precise-character-building') {
      throw new BadRequestException('PCB game uses round submission. Use /rounds/submit instead.');
    }

    const game = await this.games.findBySlug(gameSlug);

    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'STARTED') {
      throw new ConflictException('Attempt already finished');
    }

    const adapter = this.games.getAdapter(gameSlug);
    const result = await adapter.finishAttempt({
      attempt: {
        id: attempt.id,
        seed: attempt.seed,
        initialState: attempt.initialState,
        difficultyKey: attempt.difficultyKey,
        startedAt: attempt.startedAt,
      },
      payload,
      completedAt: new Date(),
    });

    if (!result.valid) {
      await this.prisma.gameAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'FAILED',
          invalidReason: result.invalidReason,
          completedAt: new Date(),
        },
      });
      return {
        attemptId,
        status: 'FAILED',
        reason: result.invalidReason,
      };
    }

    // Update attempt as completed
    const updated = await this.prisma.gameAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        finalState: result.finalState as any,
        moveTrace: result.moveTrace as any,
        metrics: result.metrics as any,
        rankValue: result.rankValue,
      },
    });

    // Update leaderboards
    const lbResult = await this.leaderboards.recordAttemptResult(updated);

    return {
      attemptId,
      status: 'COMPLETED',
      metrics: result.metrics,
      leaderboardUpdated: lbResult.updated,
      personalBest: lbResult.updated,
    };
  }

  async abandonAttempt(userId: string, gameSlug: string, attemptId: string) {
    if (gameSlug === 'life-game') {
      throw new BadRequestException('Life game uses /games/life-game/attempts/:attemptId/abandon');
    }
    if (gameSlug === 'precise-character-building') {
      throw new BadRequestException(
        'PCB game uses /games/precise-character-building/attempts/:attemptId/abandon',
      );
    }

    const game = await this.games.findBySlug(gameSlug);
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');
    if (attempt.gameId !== game.id) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'STARTED') {
      throw new ConflictException('Attempt already finished');
    }

    await this.prisma.gameAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
      },
    });

    return { success: true };
  }

  async timeoutAttempt(userId: string, gameSlug: string, attemptId: string) {
    const game = await this.games.findBySlug(gameSlug);
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');
    if (attempt.gameId !== game.id) throw new NotFoundException('Attempt not found');

    if (attempt.status === 'FAILED' && attempt.invalidReason === 'TIMEOUT') {
      return { success: true, status: 'FAILED', reason: 'TIMEOUT' as const };
    }
    if (attempt.status !== 'STARTED') {
      throw new ConflictException('Attempt already finished');
    }

    const maxDurationMs = getGameMaxDurationMs(gameSlug, attempt.difficultyKey);
    if (!isAttemptTimedOut(attempt.startedAt, maxDurationMs)) {
      throw new BadRequestException('Attempt has not reached timeout yet');
    }

    await this.prisma.gameAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'FAILED',
        invalidReason: 'TIMEOUT',
        completedAt: new Date(),
      },
    });

    return { success: true, status: 'FAILED', reason: 'TIMEOUT' as const };
  }
}
