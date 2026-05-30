import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LeaderboardsService } from '../../leaderboards/leaderboards.service';
import {
  validateLocalCells,
  isSameLocalCellSet,
  getRegionById,
  LIFE_MAX_ERROR_COUNT,
} from '@brain-games/game-engine';
import type { LocalCellCoord } from '@brain-games/game-engine';
import { getLifeGameMaxDurationMs } from '@brain-games/shared';
import { isAttemptTimedOut } from '../attempt-timeout';

interface LifePuzzleData {
  targetRegionIds: number[];
  targetAnswers: Array<{
    regionId: number;
    aliveCells: LocalCellCoord[];
  }>;
  boundary: { wrapX: boolean; wrapY: boolean };
  width: number;
  height: number;
}

interface AttemptMetadata {
  targetRegionIds: number[];
  correctRegionIds: number[];
  errorCount: number;
  boundary: { wrapX: boolean; wrapY: boolean };
  width: number;
  height: number;
  puzzleId: string;
}

@Injectable()
export class LifeGameService {
  constructor(
    private prisma: PrismaService,
    private leaderboards: LeaderboardsService,
  ) {}

  async submitRegion(
    userId: string,
    attemptId: string,
    regionId: number,
    aliveCells: LocalCellCoord[],
  ) {
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
      include: { lifePuzzle: true },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'STARTED') {
      throw new ConflictException('Attempt already finished');
    }
    const maxDurationMs = getLifeGameMaxDurationMs(attempt.difficultyKey);
    if (isAttemptTimedOut(attempt.startedAt, maxDurationMs)) {
      await this.prisma.gameAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'FAILED',
          invalidReason: 'TIMEOUT',
          completedAt: new Date(),
        },
      });
      throw new ConflictException('Attempt timed out');
    }

    const metadata = attempt.metadata as unknown as AttemptMetadata;
    const targetRegionIds = metadata.targetRegionIds;
    const correctRegionIds = metadata.correctRegionIds || [];
    const errorCount = metadata.errorCount || 0;

    // Validate regionId
    if (!targetRegionIds.includes(regionId)) {
      throw new BadRequestException('Region is not a target region');
    }
    if (correctRegionIds.includes(regionId)) {
      throw new ConflictException('Region already completed');
    }

    // Validate cells
    const region = getRegionById(regionId);
    const validation = validateLocalCells({
      cells: aliveCells,
      regionWidth: region.width,
      regionHeight: region.height,
    });
    if (!validation.valid) {
      throw new BadRequestException(`Invalid cells: ${validation.reason}`);
    }

    // Load puzzle answer
    const puzzle = attempt.lifePuzzle;
    if (!puzzle) throw new NotFoundException('Puzzle not found');

    const puzzleData = puzzle as unknown as LifePuzzleData;
    const targetAnswer = puzzleData.targetAnswers.find(
      (a) => a.regionId === regionId,
    );
    if (!targetAnswer) throw new NotFoundException('Answer not found for region');

    // Compare
    const correct = isSameLocalCellSet(aliveCells, targetAnswer.aliveCells);

    // Record submission
    await this.prisma.lifeRegionSubmission.create({
      data: {
        attemptId,
        userId,
        regionId,
        aliveCells: aliveCells as any,
        correct,
      },
    });

    let newCorrectRegionIds = [...correctRegionIds];
    let newErrorCount = errorCount;
    let attemptCompleted = false;
    let result: any = undefined;

    if (correct) {
      newCorrectRegionIds.push(regionId);

      // Check if all regions are correct
      if (newCorrectRegionIds.length === targetRegionIds.length) {
        attemptCompleted = true;
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - attempt.startedAt.getTime();

        // Update attempt as completed
        await this.prisma.gameAttempt.update({
          where: { id: attemptId },
          data: {
            status: 'COMPLETED',
            completedAt,
            metrics: {
              durationMs,
              errorCount: newErrorCount,
              targetRegionCount: targetRegionIds.length,
            },
            rankValue: durationMs,
          },
        });

        // Update leaderboard
        const lbResult = await this.leaderboards.recordAttemptResult(
          await this.prisma.gameAttempt.findUniqueOrThrow({ where: { id: attemptId } }),
        );

        result = {
          durationMs,
          errorCount: newErrorCount,
          targetRegionCount: targetRegionIds.length,
          personalBest: lbResult.updated,
        };
      }

      // Update metadata
      await this.prisma.gameAttempt.update({
        where: { id: attemptId },
        data: {
          metadata: {
            ...metadata,
            correctRegionIds: newCorrectRegionIds,
          } as any,
        },
      });
    } else {
      newErrorCount++;

      // Check error limit
      if (newErrorCount > LIFE_MAX_ERROR_COUNT) {
        await this.prisma.gameAttempt.update({
          where: { id: attemptId },
          data: {
            status: 'FAILED',
            invalidReason: 'TOO_MANY_ERRORS',
            completedAt: new Date(),
          },
        });
        throw new BadRequestException('Too many errors');
      }

      // Update metadata
      await this.prisma.gameAttempt.update({
        where: { id: attemptId },
        data: {
          metadata: {
            ...metadata,
            errorCount: newErrorCount,
          } as any,
        },
      });
    }

    return {
      regionId,
      correct,
      errorCount: newErrorCount,
      correctRegionIds: newCorrectRegionIds,
      attemptCompleted,
      result,
    };
  }

  async getAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
      include: {
        lifePuzzle: true,
        lifeSubmissions: {
          select: {
            regionId: true,
            submittedAt: true,
            correct: true,
          },
          orderBy: { submittedAt: 'asc' },
        },
      },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');

    const maxDurationMs = getLifeGameMaxDurationMs(attempt.difficultyKey);
    if (attempt.status === 'STARTED' && isAttemptTimedOut(attempt.startedAt, maxDurationMs)) {
      const timedOut = await this.prisma.gameAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'FAILED',
          invalidReason: 'TIMEOUT',
          completedAt: new Date(),
        },
        include: {
          lifePuzzle: true,
          lifeSubmissions: {
            select: {
              regionId: true,
              submittedAt: true,
              correct: true,
            },
            orderBy: { submittedAt: 'asc' },
          },
        },
      });
      return {
        attemptId: timedOut.id,
        status: timedOut.status,
        difficultyKey: timedOut.difficultyKey,
        maxDurationMs,
        width: timedOut.lifePuzzle?.width || 120,
        height: timedOut.lifePuzzle?.height || 15,
        boundary: (timedOut.metadata as unknown as AttemptMetadata).boundary,
        initialState: timedOut.initialState,
        targetRegionIds: (timedOut.metadata as unknown as AttemptMetadata).targetRegionIds,
        correctRegionIds: (timedOut.metadata as unknown as AttemptMetadata).correctRegionIds || [],
        errorCount: (timedOut.metadata as unknown as AttemptMetadata).errorCount || 0,
        startedAt: timedOut.startedAt.toISOString(),
        completedAt: timedOut.completedAt?.toISOString(),
        submissions: timedOut.lifeSubmissions.map((s) => ({
          regionId: s.regionId,
          submittedAt: s.submittedAt.toISOString(),
          correct: s.correct,
        })),
        metrics: undefined,
      };
    }

    const metadata = attempt.metadata as unknown as AttemptMetadata;
    const puzzle = attempt.lifePuzzle;

    return {
      attemptId: attempt.id,
      status: attempt.status,
      difficultyKey: attempt.difficultyKey,
      maxDurationMs,
      width: puzzle?.width || 120,
      height: puzzle?.height || 15,
      boundary: metadata.boundary,
      initialState: attempt.initialState,
      targetRegionIds: metadata.targetRegionIds,
      correctRegionIds: metadata.correctRegionIds || [],
      errorCount: metadata.errorCount || 0,
      startedAt: attempt.startedAt.toISOString(),
      completedAt: attempt.completedAt?.toISOString(),
      submissions: attempt.lifeSubmissions.map((s) => ({
        regionId: s.regionId,
        submittedAt: s.submittedAt.toISOString(),
        correct: s.correct,
      })),
      metrics: attempt.status === 'COMPLETED' ? attempt.metrics : undefined,
    };
  }

  async getAnswers(userId: string, role: string, attemptId: string) {
    const isDev = process.env.NODE_ENV !== 'production';
    if (!(isDev && role === 'ADMIN')) {
      throw new ForbiddenException('Answers are only available for admins in development');
    }

    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
      include: { lifePuzzle: true },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');

    const puzzle = attempt.lifePuzzle;
    if (!puzzle) throw new NotFoundException('Puzzle not found');

    const puzzleData = puzzle as unknown as LifePuzzleData;
    return {
      answers: puzzleData.targetAnswers.map((a) => ({
        regionId: a.regionId,
        aliveCells: a.aliveCells,
      })),
    };
  }

  async abandonAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');
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

  async timeoutAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');
    if (attempt.status === 'FAILED' && attempt.invalidReason === 'TIMEOUT') {
      return { success: true, status: 'FAILED', reason: 'TIMEOUT' as const };
    }
    if (attempt.status !== 'STARTED') {
      throw new ConflictException('Attempt already finished');
    }

    const maxDurationMs = getLifeGameMaxDurationMs(attempt.difficultyKey);
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
