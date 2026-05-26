import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LeaderboardsService } from '../../leaderboards/leaderboards.service';
import {
  validateRoundPath,
  isRadicalAvailable,
  indexToCoord,
  PCB_MAX_ERROR_COUNT,
} from '@brain-games/game-engine';
import { getPCBMaxDurationMs } from '@brain-games/shared';
import type { Radical } from '@brain-games/game-engine';
import { isAttemptTimedOut } from '../attempt-timeout';

interface PuzzleData {
  radicalPool: Radical[];
  cells: Array<{
    index: number;
    row: number;
    col: number;
    rootKey: string;
    rootGlyph: string;
  }>;
  config: {
    picksPerRound: number;
    adjacencyMode: 'KING_8' | 'ORTHOGONAL_4';
    cooldownRounds: number;
    allowRadicalRepeatInRound: boolean;
  };
}

interface AttemptMetadata {
  currentRoundIndex: number;
  currentPosition: { row: number; col: number } | null;
  litCellIndices: number[];
  disabledRadicalKeys: string[];
  errorCount: number;
  litResults: Array<{ cellIndex: number; radicalKey: string; resultChar: string }>;
  puzzleId: string;
}

type RoundErrorReason =
  | 'INVALID_PATH'
  | 'RADICAL_DISABLED'
  | 'INVALID_COMBINATION'
  | 'CELL_ALREADY_LIT'
  | 'ATTEMPT_NOT_STARTED';

@Injectable()
export class PreciseCharacterGameService {
  constructor(
    private prisma: PrismaService,
    private leaderboards: LeaderboardsService,
  ) {}

  private getAllowedCombinationDifficulties(difficultyKey: string): string[] {
    if (difficultyKey === 'normal') {
      return ['easy', 'normal'];
    }
    if (difficultyKey === 'hard') {
      return ['easy', 'normal', 'hard'];
    }
    return [difficultyKey];
  }

  private async handleRoundFailure(input: {
    attemptId: string;
    userId: string;
    currentRoundIndex: number;
    selectedRadicalKeys: string[];
    selectedCellIndices: number[];
    metadata: AttemptMetadata;
    litCellIndices: Set<number>;
    disabledRadicalKeys: string[];
    errorReason: RoundErrorReason;
  }) {
    const {
      attemptId,
      userId,
      currentRoundIndex,
      selectedRadicalKeys,
      selectedCellIndices,
      metadata,
      litCellIndices,
      disabledRadicalKeys,
      errorReason,
    } = input;

    const newErrorCount = (metadata.errorCount || 0) + 1;

    await this.prisma.preciseCharacterRoundSubmission.create({
      data: {
        attemptId,
        userId,
        roundIndex: currentRoundIndex,
        selectedRadicalKeys: selectedRadicalKeys as any,
        selectedCellIndices: selectedCellIndices as any,
        correct: false,
        errorReason,
      },
    });

    if (newErrorCount > PCB_MAX_ERROR_COUNT) {
      await this.prisma.gameAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'INVALID',
          invalidReason: 'TOO_MANY_ERRORS',
          completedAt: new Date(),
        },
      });
      throw new BadRequestException('Too many errors');
    }

    await this.prisma.gameAttempt.update({
      where: { id: attemptId },
      data: {
        metadata: {
          ...metadata,
          errorCount: newErrorCount,
        } as any,
      },
    });

    return {
      correct: false,
      errorCount: newErrorCount,
      state: {
        currentRoundIndex,
        currentPosition: metadata.currentPosition,
        litCellIndices: [...litCellIndices],
        disabledRadicalKeys,
      },
      attemptCompleted: false,
      errorReason,
    };
  }

  async submitRound(
    userId: string,
    attemptId: string,
    selectedRadicalKeys: string[],
    selectedCellIndices: number[],
  ) {
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
      include: { pcbPuzzle: true },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'STARTED') {
      throw new ConflictException('Attempt already finished');
    }
    const maxDurationMs = getPCBMaxDurationMs(attempt.difficultyKey);
    if (isAttemptTimedOut(attempt.startedAt, maxDurationMs)) {
      await this.prisma.gameAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'INVALID',
          invalidReason: 'TIMEOUT',
          completedAt: new Date(),
        },
      });
      throw new ConflictException('Attempt timed out');
    }

    const metadata = attempt.metadata as unknown as AttemptMetadata;
    const puzzleData = attempt.pcbPuzzle as unknown as PuzzleData;

    if (!puzzleData) throw new NotFoundException('Puzzle not found');

    const { radicalPool, cells, config } = puzzleData;
    const currentRoundIndex = metadata.currentRoundIndex || 0;
    const litCellIndices = new Set(metadata.litCellIndices || []);
    const disabledRadicalKeys = metadata.disabledRadicalKeys || [];
    const errorCount = metadata.errorCount || 0;
    const picksPerRound = config.picksPerRound;
    const adjacencyMode = 'ORTHOGONAL_4' as const;

    if (selectedRadicalKeys.length !== picksPerRound) {
      throw new BadRequestException(`Must select exactly ${picksPerRound} radicals`);
    }
    if (selectedCellIndices.length !== picksPerRound) {
      throw new BadRequestException(`Must select exactly ${picksPerRound} cells`);
    }

    // Validate radicals
    const radicalPoolKeys = new Set(radicalPool.map((r: Radical) => r.key));
    for (const key of selectedRadicalKeys) {
      if (!radicalPoolKeys.has(key)) {
        return this.handleRoundFailure({
          attemptId,
          userId,
          currentRoundIndex,
          selectedRadicalKeys,
          selectedCellIndices,
          metadata,
          litCellIndices,
          disabledRadicalKeys,
          errorReason: 'RADICAL_DISABLED',
        });
      }
      if (!isRadicalAvailable(key, disabledRadicalKeys)) {
        return this.handleRoundFailure({
          attemptId,
          userId,
          currentRoundIndex,
          selectedRadicalKeys,
          selectedCellIndices,
          metadata,
          litCellIndices,
          disabledRadicalKeys,
          errorReason: 'RADICAL_DISABLED',
        });
      }
    }

    // Validate cells
    for (const index of selectedCellIndices) {
      if (index < 0 || index >= 36) {
        return this.handleRoundFailure({
          attemptId,
          userId,
          currentRoundIndex,
          selectedRadicalKeys,
          selectedCellIndices,
          metadata,
          litCellIndices,
          disabledRadicalKeys,
          errorReason: 'INVALID_PATH',
        });
      }
      if (litCellIndices.has(index)) {
        return this.handleRoundFailure({
          attemptId,
          userId,
          currentRoundIndex,
          selectedRadicalKeys,
          selectedCellIndices,
          metadata,
          litCellIndices,
          disabledRadicalKeys,
          errorReason: 'CELL_ALREADY_LIT',
        });
      }
    }

    // Check no duplicate cells in round
    const cellSet = new Set(selectedCellIndices);
    if (cellSet.size !== picksPerRound) {
      return this.handleRoundFailure({
        attemptId,
        userId,
        currentRoundIndex,
        selectedRadicalKeys,
        selectedCellIndices,
        metadata,
        litCellIndices,
        disabledRadicalKeys,
        errorReason: 'INVALID_PATH',
      });
    }

    // Validate path
    const pathResult = validateRoundPath({
      currentPosition: metadata.currentPosition,
      selectedCellIndices,
      litCellIndices,
      adjacencyMode,
    });

    if (!pathResult.valid) {
      return this.handleRoundFailure({
        attemptId,
        userId,
        currentRoundIndex,
        selectedRadicalKeys,
        selectedCellIndices,
        metadata,
        litCellIndices,
        disabledRadicalKeys,
        errorReason:
          pathResult.reason === 'CELL_ALREADY_LIT'
            ? 'CELL_ALREADY_LIT'
            : 'INVALID_PATH',
      });
    }

    const selectedCells = selectedCellIndices.map((cellIndex) =>
      cells.find((c: { index: number }) => c.index === cellIndex),
    );
    if (selectedCells.some((cell) => !cell)) {
      return this.handleRoundFailure({
        attemptId,
        userId,
        currentRoundIndex,
        selectedRadicalKeys,
        selectedCellIndices,
        metadata,
        litCellIndices,
        disabledRadicalKeys,
        errorReason: 'INVALID_PATH',
      });
    }

    const selectedRootKeys = selectedCells.map((cell) => cell!.rootKey);
    const allowedDifficulties = this.getAllowedCombinationDifficulties(
      attempt.difficultyKey,
    );

    const combos = await this.prisma.characterCombination.findMany({
      where: {
        enabled: true,
        difficulty: { in: allowedDifficulties },
        radical: { key: { in: [...new Set(selectedRadicalKeys)] } },
        root: { key: { in: [...new Set(selectedRootKeys)] } },
      },
      include: {
        radical: { select: { key: true } },
        root: { select: { key: true } },
      },
    });

    const resultChars: string[] = [];
    const combinationIds: string[] = [];

    for (let i = 0; i < picksPerRound; i++) {
      const combo = combos.find(
        (item) =>
          item.radical.key === selectedRadicalKeys[i] &&
          item.root.key === selectedCells[i]!.rootKey,
      );

      if (!combo) {
        return this.handleRoundFailure({
          attemptId,
          userId,
          currentRoundIndex,
          selectedRadicalKeys,
          selectedCellIndices,
          metadata,
          litCellIndices,
          disabledRadicalKeys,
          errorReason: 'INVALID_COMBINATION',
        });
      }

      resultChars.push(combo.resultChar);
      combinationIds.push(combo.id);
    }

    // All combos valid - success!
    const newLitCellIndices = [...litCellIndices, ...selectedCellIndices];
    const lastCellCoord = indexToCoord(selectedCellIndices[picksPerRound - 1]);
    const usedRadicalKeys = [...new Set(selectedRadicalKeys)];
    const newRoundIndex = currentRoundIndex + 1;

    const newLitResults = [
      ...(metadata.litResults || []),
      ...selectedCellIndices.map((ci, i) => ({
        cellIndex: ci,
        radicalKey: selectedRadicalKeys[i],
        resultChar: resultChars[i],
      })),
    ];

    // Record round submission
    await this.prisma.preciseCharacterRoundSubmission.create({
      data: {
        attemptId,
        userId,
        roundIndex: currentRoundIndex,
        selectedRadicalKeys: selectedRadicalKeys as any,
        selectedCellIndices: selectedCellIndices as any,
        resultChars: resultChars as any,
        combinationIds: combinationIds as any,
        correct: true,
      },
    });

    // Check if all cells lit
    const attemptCompleted = newLitCellIndices.length >= 36;

    if (attemptCompleted) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - attempt.startedAt.getTime();

      await this.prisma.gameAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'COMPLETED',
          completedAt,
          metrics: {
            durationMs,
            errorCount,
            rounds: newRoundIndex,
            litCells: newLitCellIndices.length,
          },
          rankValue: durationMs,
          metadata: {
            ...metadata,
            currentRoundIndex: newRoundIndex,
            currentPosition: lastCellCoord,
            litCellIndices: newLitCellIndices,
            disabledRadicalKeys: usedRadicalKeys,
            litResults: newLitResults,
          } as any,
        },
      });

      const lbResult = await this.leaderboards.recordAttemptResult(
        await this.prisma.gameAttempt.findUniqueOrThrow({ where: { id: attemptId } }),
      );

      return {
        correct: true,
        errorCount,
        state: {
          currentRoundIndex: newRoundIndex,
          currentPosition: lastCellCoord,
          litCellIndices: newLitCellIndices,
          disabledRadicalKeys: usedRadicalKeys,
        },
        roundResult: {
          selectedCellIndices,
          selectedRadicalKeys,
          resultChars,
        },
        attemptCompleted: true,
        result: {
          durationMs,
          errorCount,
          rounds: newRoundIndex,
          litCells: newLitCellIndices.length,
          personalBest: lbResult.updated,
        },
      };
    }

    // Not completed yet - update state
    await this.prisma.gameAttempt.update({
      where: { id: attemptId },
      data: {
        metadata: {
          ...metadata,
          currentRoundIndex: newRoundIndex,
          currentPosition: lastCellCoord,
          litCellIndices: newLitCellIndices,
          disabledRadicalKeys: usedRadicalKeys,
          litResults: newLitResults,
        } as any,
      },
    });

    return {
      correct: true,
      errorCount,
      state: {
        currentRoundIndex: newRoundIndex,
        currentPosition: lastCellCoord,
        litCellIndices: newLitCellIndices,
        disabledRadicalKeys: usedRadicalKeys,
      },
      roundResult: {
        selectedCellIndices,
        selectedRadicalKeys,
        resultChars,
      },
      attemptCompleted: false,
    };
  }

  async getAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
      include: {
        pcbPuzzle: true,
        pcbSubmissions: {
          select: {
            roundIndex: true,
            correct: true,
            resultChars: true,
            selectedRadicalKeys: true,
            selectedCellIndices: true,
            submittedAt: true,
          },
          orderBy: { roundIndex: 'asc' },
        },
      },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');

    const maxDurationMs = getPCBMaxDurationMs(attempt.difficultyKey);
    if (attempt.status === 'STARTED' && isAttemptTimedOut(attempt.startedAt, maxDurationMs)) {
      await this.prisma.gameAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'INVALID',
          invalidReason: 'TIMEOUT',
          completedAt: new Date(),
        },
      });
      const refreshed = await this.prisma.gameAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        include: {
          pcbPuzzle: true,
          pcbSubmissions: {
            select: {
              roundIndex: true,
              correct: true,
              resultChars: true,
              selectedRadicalKeys: true,
              selectedCellIndices: true,
              submittedAt: true,
            },
            orderBy: { roundIndex: 'asc' },
          },
        },
      });
      const refreshedMetadata = refreshed.metadata as unknown as AttemptMetadata;
      const refreshedPuzzleData = refreshed.pcbPuzzle as unknown as PuzzleData;
      return {
        attemptId: refreshed.id,
        status: refreshed.status,
        difficultyKey: refreshed.difficultyKey,
        maxDurationMs,
        boardSize: 6,
        cells: refreshedPuzzleData?.cells || [],
        radicalPool: refreshedPuzzleData?.radicalPool || [],
        config: {
          ...(refreshedPuzzleData?.config || {}),
          adjacencyMode: 'ORTHOGONAL_4',
        },
        state: {
          currentRoundIndex: refreshedMetadata.currentRoundIndex || 0,
          currentPosition: refreshedMetadata.currentPosition || null,
          litCellIndices: refreshedMetadata.litCellIndices || [],
          disabledRadicalKeys: refreshedMetadata.disabledRadicalKeys || [],
          errorCount: refreshedMetadata.errorCount || 0,
        },
        litResults: refreshedMetadata.litResults || [],
        startedAt: refreshed.startedAt.toISOString(),
        completedAt: refreshed.completedAt?.toISOString(),
        metrics: undefined,
      };
    }

    const metadata = attempt.metadata as unknown as AttemptMetadata;
    const puzzleData = attempt.pcbPuzzle as unknown as PuzzleData;

    return {
      attemptId: attempt.id,
      status: attempt.status,
      difficultyKey: attempt.difficultyKey,
      maxDurationMs,
      boardSize: 6,
      cells: puzzleData?.cells || [],
      radicalPool: puzzleData?.radicalPool || [],
      config: {
        ...(puzzleData?.config || {}),
        adjacencyMode: 'ORTHOGONAL_4',
      },
      state: {
        currentRoundIndex: metadata.currentRoundIndex || 0,
        currentPosition: metadata.currentPosition || null,
        litCellIndices: metadata.litCellIndices || [],
        disabledRadicalKeys: metadata.disabledRadicalKeys || [],
        errorCount: metadata.errorCount || 0,
      },
      litResults: metadata.litResults || [],
      startedAt: attempt.startedAt.toISOString(),
      completedAt: attempt.completedAt?.toISOString(),
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
      include: { pcbPuzzle: true },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');

    const puzzle = attempt.pcbPuzzle as unknown as { solutionRounds: unknown[] };
    if (!puzzle) throw new NotFoundException('Puzzle not found');

    return { solutionRounds: puzzle.solutionRounds };
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
        status: 'ABANDONED',
        completedAt: new Date(),
      },
    });

    return { success: true };
  }

  async resetAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'STARTED') {
      throw new ConflictException('Attempt already finished');
    }

    const metadata = attempt.metadata as unknown as AttemptMetadata;

    await this.prisma.$transaction([
      this.prisma.preciseCharacterRoundSubmission.deleteMany({
        where: { attemptId },
      }),
      this.prisma.gameAttempt.update({
        where: { id: attemptId },
        data: {
          completedAt: null,
          invalidReason: null,
          finalState: Prisma.JsonNull,
          moveTrace: Prisma.JsonNull,
          metrics: {} as any,
          rankValue: null,
          metadata: {
            ...metadata,
            currentRoundIndex: 0,
            currentPosition: null,
            litCellIndices: [],
            disabledRadicalKeys: [],
            errorCount: 0,
            litResults: [],
          } as any,
        },
      }),
    ]);

    return {
      success: true,
      startedAt: attempt.startedAt.toISOString(),
      state: {
        currentRoundIndex: 0,
        currentPosition: null,
        litCellIndices: [],
        disabledRadicalKeys: [],
        errorCount: 0,
      },
    };
  }

  async timeoutAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');
    if (attempt.status === 'INVALID' && attempt.invalidReason === 'TIMEOUT') {
      return { success: true, status: 'INVALID', reason: 'TIMEOUT' as const };
    }
    if (attempt.status !== 'STARTED') {
      throw new ConflictException('Attempt already finished');
    }

    const maxDurationMs = getPCBMaxDurationMs(attempt.difficultyKey);
    if (!isAttemptTimedOut(attempt.startedAt, maxDurationMs)) {
      throw new BadRequestException('Attempt has not reached timeout yet');
    }

    await this.prisma.gameAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'INVALID',
        invalidReason: 'TIMEOUT',
        completedAt: new Date(),
      },
    });

    return { success: true, status: 'INVALID', reason: 'TIMEOUT' as const };
  }
}
