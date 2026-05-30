import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LeaderboardsService } from '../../leaderboards/leaderboards.service';
import {
  executeDirection,
  undoCommand,
  createInitialState,
  coordKey,
} from '@brain-games/game-engine';
import type {
  AbsoluteCommandDirection,
  AbsoluteCommandPuzzleSnapshot,
  AbsoluteCommandRuntimeState,
  AbsoluteCommandCell,
  MazeCoord,
} from '@brain-games/game-engine';
import { getAbsoluteCommandMaxDurationMs } from '@brain-games/shared';
import { isAttemptTimedOut } from '../attempt-timeout';

interface AttemptMetadata {
  puzzleSnapshot: AbsoluteCommandPuzzleSnapshot;
  runtimeState: AbsoluteCommandRuntimeState;
  resetCount: number;
  undoCount: number;
  invalidCommandCount: number;
}

@Injectable()
export class AbsoluteCommandService {
  constructor(
    private prisma: PrismaService,
    private leaderboards: LeaderboardsService,
  ) {}

  // ─── Start attempt ──────────────────────────────────────────────────

  async startAttempt(userId: string, puzzleId: string) {
    const puzzle = await this.prisma.absoluteCommandPuzzle.findUnique({
      where: { id: puzzleId, status: 'PUBLISHED' },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!puzzle) throw new NotFoundException('Puzzle not found or not published');
    const version = puzzle.versions[0];
    if (!version) throw new NotFoundException('Puzzle has no versions');

    const size = version.size as unknown as { width: number; height: number; depth: number };
    const startCoord = version.startCoord as unknown as MazeCoord;
    const cells = version.cells as unknown as AbsoluteCommandCell[];

    const snapshot: AbsoluteCommandPuzzleSnapshot = {
      puzzleId: puzzle.id,
      puzzleVersion: version.version,
      size,
      startCoord,
      cells,
    };

    const runtimeState = createInitialState(snapshot);

    // Find the game
    const game = await this.prisma.game.findUnique({
      where: { slug: 'absolute-command' },
    });
    if (!game) throw new NotFoundException('Game not registered');

    // Create attempt
    const attempt = await this.prisma.gameAttempt.create({
      data: {
        userId,
        gameId: game.id,
        difficultyKey: puzzle.difficultyLabel || 'standard',
        seed: puzzle.id,
        initialState: {
          puzzleSnapshot: snapshot,
          runtimeState,
        } as any,
        metadata: {
          puzzleSnapshot: snapshot,
          runtimeState,
          resetCount: 0,
          undoCount: 0,
          invalidCommandCount: 0,
        } as any,
        absoluteCommandPuzzleId: puzzle.id,
      },
    });

    return {
      attemptId: attempt.id,
      puzzle: {
        id: puzzle.id,
        slug: puzzle.slug,
        title: puzzle.title,
        version: version.version,
        size,
        startCoord,
        cells,
      },
      state: this.toStateView(runtimeState),
      startedAt: attempt.startedAt.toISOString(),
    };
  }

  // ─── Execute command ────────────────────────────────────────────────

  async executeCommand(
    userId: string,
    attemptId: string,
    direction: AbsoluteCommandDirection,
  ) {
    const attempt = await this.loadAttempt(userId, attemptId);
    this.checkActive(attempt);

    const maxDurationMs = await this.getPuzzleMaxDurationMs(attempt.absoluteCommandPuzzleId);
    if (isAttemptTimedOut(attempt.startedAt, maxDurationMs)) {
      await this.markTimedOut(attemptId);
      throw new ConflictException('Attempt timed out');
    }

    const metadata = attempt.metadata as unknown as AttemptMetadata;
    const { puzzleSnapshot, runtimeState } = metadata;

    const result = executeDirection({
      puzzle: puzzleSnapshot,
      state: runtimeState,
      direction,
    });

    if (!result.moved) {
      // Update invalid command count
      await this.prisma.gameAttempt.update({
        where: { id: attemptId },
        data: {
          metadata: {
            ...metadata,
            invalidCommandCount: (metadata.invalidCommandCount || 0) + 1,
          } as any,
        },
      });

      return {
        moved: false,
        invalidReason: 'NO_MOVEMENT' as const,
        state: this.toStateView(runtimeState),
        completed: false,
      };
    }

    const nextState = result.nextState;
    const historyItem = result.historyItem!;

    // Save command log
    await this.prisma.absoluteCommandLog.create({
      data: {
        attemptId,
        userId,
        index: historyItem.index,
        direction: historyItem.direction,
        fromCoord: historyItem.from as any,
        toCoord: historyItem.to as any,
        path: historyItem.path as any,
        stopReason: historyItem.stopReason,
        changedCells: historyItem.changedNumberCells as any,
        snapshotBefore: historyItem.snapshotBefore as any,
        snapshotAfter: historyItem.snapshotAfter as any,
      },
    });

    if (result.completed) {
      // Complete the attempt
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - attempt.startedAt.getTime();

      await this.prisma.gameAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'COMPLETED',
          completedAt,
          metadata: {
            ...metadata,
            runtimeState: nextState,
          } as any,
          metrics: {
            commandCount: nextState.commandCount,
            durationMs,
            travelDistance: nextState.travelDistance,
            totalVisitedCells: nextState.visitedCells.length,
            requiredVisitCells: this.computeRequiredVisitCells(puzzleSnapshot),
            resetCount: metadata.resetCount || 0,
            undoCount: metadata.undoCount || 0,
          } as any,
          rankValue: nextState.commandCount,
        },
      });

      // Update leaderboard
      const updatedAttempt = await this.prisma.gameAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      });
      const lbResult = await this.leaderboards.recordAttemptResult(updatedAttempt);

      return {
        moved: true,
        state: this.toStateView(nextState),
        commandResult: {
          direction: historyItem.direction,
          from: historyItem.from,
          to: historyItem.to,
          path: historyItem.path,
          stopReason: historyItem.stopReason,
          commandCount: nextState.commandCount,
          travelDistanceDelta: historyItem.path.length,
        },
        completed: true,
        result: {
          commandCount: nextState.commandCount,
          durationMs,
          travelDistance: nextState.travelDistance,
          personalBest: lbResult.updated,
        },
      };
    }

    // Not completed - just update state
    await this.prisma.gameAttempt.update({
      where: { id: attemptId },
      data: {
        metadata: {
          ...metadata,
          runtimeState: nextState,
        } as any,
      },
    });

    return {
      moved: true,
      state: this.toStateView(nextState),
      commandResult: {
        direction: historyItem.direction,
        from: historyItem.from,
        to: historyItem.to,
        path: historyItem.path,
        stopReason: historyItem.stopReason,
        commandCount: nextState.commandCount,
        travelDistanceDelta: historyItem.path.length,
      },
      completed: false,
    };
  }

  // ─── Undo ───────────────────────────────────────────────────────────

  async undo(userId: string, attemptId: string) {
    const attempt = await this.loadAttempt(userId, attemptId);
    this.checkActive(attempt);

    const metadata = attempt.metadata as unknown as AttemptMetadata;
    const { runtimeState } = metadata;

    if (runtimeState.commandHistory.length === 0) {
      throw new BadRequestException('No commands to undo');
    }

    const result = undoCommand(runtimeState);
    if (!result.success) {
      throw new BadRequestException('Cannot undo');
    }

    // Delete the last command log
    await this.prisma.absoluteCommandLog.deleteMany({
      where: {
        attemptId,
        index: runtimeState.commandHistory.length - 1,
      },
    });

    await this.prisma.gameAttempt.update({
      where: { id: attemptId },
      data: {
        metadata: {
          ...metadata,
          runtimeState: result.nextState,
          undoCount: (metadata.undoCount || 0) + 1,
        } as any,
      },
    });

    return {
      success: true,
      state: this.toStateView(result.nextState),
    };
  }

  // ─── Reset ──────────────────────────────────────────────────────────

  async reset(userId: string, attemptId: string) {
    const attempt = await this.loadAttempt(userId, attemptId);
    this.checkActive(attempt);

    const metadata = attempt.metadata as unknown as AttemptMetadata;
    const { puzzleSnapshot } = metadata;
    const freshState = createInitialState(puzzleSnapshot);

    // Delete all command logs
    await this.prisma.absoluteCommandLog.deleteMany({
      where: { attemptId },
    });

    await this.prisma.gameAttempt.update({
      where: { id: attemptId },
      data: {
        metadata: {
          puzzleSnapshot,
          runtimeState: freshState,
          resetCount: (metadata.resetCount || 0) + 1,
          undoCount: 0,
          invalidCommandCount: 0,
        } as any,
      },
    });

    return {
      success: true,
      state: this.toStateView(freshState),
    };
  }

  // ─── Get attempt ────────────────────────────────────────────────────

  async getAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
      include: {
        absoluteCommandPuzzle: true,
      },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');

    const maxDurationMs = await this.getPuzzleMaxDurationMs(attempt.absoluteCommandPuzzleId);

    // Check timeout for active attempts
    if (attempt.status === 'STARTED' && isAttemptTimedOut(attempt.startedAt, maxDurationMs)) {
      await this.markTimedOut(attemptId);
      attempt.status = 'FAILED';
      attempt.invalidReason = 'TIMEOUT';
      attempt.completedAt = new Date();
    }

    const metadata = attempt.metadata as unknown as AttemptMetadata;
    const puzzle = attempt.absoluteCommandPuzzle;

    return {
      attemptId: attempt.id,
      status: attempt.status,
      puzzle: puzzle ? {
        id: puzzle.id,
        slug: puzzle.slug,
        title: puzzle.title,
        version: metadata.puzzleSnapshot.puzzleVersion,
        size: metadata.puzzleSnapshot.size,
        startCoord: metadata.puzzleSnapshot.startCoord,
        cells: metadata.puzzleSnapshot.cells,
      } : undefined,
      state: this.toStateView(metadata.runtimeState),
      startedAt: attempt.startedAt.toISOString(),
      completedAt: attempt.completedAt?.toISOString(),
      metrics: attempt.status === 'COMPLETED' ? attempt.metrics : undefined,
    };
  }

  // ─── Abandon ────────────────────────────────────────────────────────

  async abandonAttempt(userId: string, attemptId: string) {
    const attempt = await this.loadAttempt(userId, attemptId);
    this.checkActive(attempt);

    await this.prisma.gameAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
      },
    });

    return { success: true };
  }

  // ─── Puzzle list ────────────────────────────────────────────────────

  async listPuzzles(query: { difficultyLabel?: string; page?: number; pageSize?: number }) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);

    const where: any = { status: 'PUBLISHED' };
    if (query.difficultyLabel) {
      where.difficultyLabel = query.difficultyLabel;
    }

    const [puzzles, total] = await Promise.all([
      this.prisma.absoluteCommandPuzzle.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.absoluteCommandPuzzle.count({ where }),
    ]);

    // Get completion stats and best records for each puzzle
    const items = await Promise.all(
      puzzles.map(async (puzzle) => {
        const completedAttempts = await this.prisma.gameAttempt.findMany({
          where: {
            absoluteCommandPuzzleId: puzzle.id,
            status: 'COMPLETED',
          },
          select: {
            userId: true,
            metrics: true,
            rankValue: true,
            user: { select: { username: true } },
          },
          orderBy: { rankValue: 'asc' },
          take: 1,
        });

        const completedCount = await this.prisma.gameAttempt.count({
          where: {
            absoluteCommandPuzzleId: puzzle.id,
            status: 'COMPLETED',
          },
        });

        const best = completedAttempts[0];
        const bestMetrics = best?.metrics as any;

        return {
          id: puzzle.id,
          slug: puzzle.slug,
          title: puzzle.title,
          difficultyLabel: puzzle.difficultyLabel || undefined,
          estimatedDuration: puzzle.estimatedDuration || undefined,
          optimalCommandCount: puzzle.optimalCommandCount || undefined,
          completedCount,
          bestRecord: best
            ? {
                username: best.user.username,
                commandCount: bestMetrics?.commandCount || 0,
                durationMs: bestMetrics?.durationMs || 0,
              }
            : undefined,
        };
      }),
    );

    return { items, total };
  }

  // ─── Puzzle detail ──────────────────────────────────────────────────

  async getPuzzleDetail(puzzleSlug: string) {
    const puzzle = await this.prisma.absoluteCommandPuzzle.findUnique({
      where: { slug: puzzleSlug, status: 'PUBLISHED' },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!puzzle) throw new NotFoundException('Puzzle not found');

    const version = puzzle.versions[0];
    if (!version) throw new NotFoundException('Puzzle has no versions');

    // Get leaderboard preview (top 5)
    const game = await this.prisma.game.findUnique({
      where: { slug: 'absolute-command' },
    });

    let leaderboardItems: any[] = [];
    if (game) {
      const lbDef = await this.prisma.leaderboardDefinition.findFirst({
        where: {
          gameId: game.id,
          puzzleId: puzzle.id,
        },
      });

      if (lbDef) {
        const entries = await this.prisma.leaderboardEntry.findMany({
          where: { leaderboardDefinitionId: lbDef.id },
          orderBy: { rankValue: 'asc' },
          take: 5,
          include: {
            user: { select: { id: true, username: true } },
            bestAttempt: { select: { completedAt: true } },
          },
        });

        leaderboardItems = entries.map((entry, index) => {
          const metrics = entry.metrics as any;
          return {
            rank: index + 1,
            user: { id: entry.user.id, username: entry.user.username },
            commandCount: metrics?.commandCount || 0,
            durationMs: metrics?.durationMs || 0,
            completedAt: entry.bestAttempt.completedAt?.toISOString() || entry.updatedAt.toISOString(),
          };
        });
      }
    }

    return {
      puzzle: {
        id: puzzle.id,
        slug: puzzle.slug,
        title: puzzle.title,
        description: puzzle.description || undefined,
        difficultyLabel: puzzle.difficultyLabel || undefined,
        estimatedDuration: puzzle.estimatedDuration || undefined,
        optimalCommandCount: puzzle.optimalCommandCount || undefined,
        source: puzzle.source || undefined,
        size: version.size as unknown as { width: number; height: number; depth: number },
        cells: version.cells as unknown as AbsoluteCommandCell[],
      },
      leaderboardPreview: {
        items: leaderboardItems,
      },
    };
  }

  // ─── Puzzle leaderboard ─────────────────────────────────────────────

  async getPuzzleLeaderboard(
    puzzleId: string,
    query: { limit?: number; offset?: number },
    userId?: string,
  ) {
    const puzzle = await this.prisma.absoluteCommandPuzzle.findUnique({
      where: { id: puzzleId },
    });
    if (!puzzle) throw new NotFoundException('Puzzle not found');

    const game = await this.prisma.game.findUnique({
      where: { slug: 'absolute-command' },
    });
    if (!game) throw new NotFoundException('Game not found');

    const lbDef = await this.prisma.leaderboardDefinition.findFirst({
      where: {
        gameId: game.id,
        puzzleId,
      },
    });

    if (!lbDef) {
      return {
        puzzle: { id: puzzle.id, title: puzzle.title, slug: puzzle.slug },
        items: [],
        myBest: undefined,
      };
    }

    const limit = Math.min(query.limit || 20, 100);
    const offset = query.offset || 0;

    const entries = await this.prisma.leaderboardEntry.findMany({
      where: { leaderboardDefinitionId: lbDef.id },
      orderBy: { rankValue: 'asc' },
      take: limit,
      skip: offset,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        bestAttempt: { select: { completedAt: true } },
      },
    });

    const items = entries.map((entry, index) => {
      const metrics = entry.metrics as any;
      return {
        rank: offset + index + 1,
        user: {
          id: entry.user.id,
          username: entry.user.username,
          avatarUrl: entry.user.avatarUrl || undefined,
        },
        commandCount: metrics?.commandCount || 0,
        durationMs: metrics?.durationMs || 0,
        travelDistance: metrics?.travelDistance || 0,
        completedAt: entry.bestAttempt.completedAt?.toISOString() || entry.updatedAt.toISOString(),
      };
    });

    let myBest: any = undefined;
    if (userId) {
      const myEntry = await this.prisma.leaderboardEntry.findUnique({
        where: {
          leaderboardDefinitionId_userId: {
            leaderboardDefinitionId: lbDef.id,
            userId,
          },
        },
        include: {
          bestAttempt: { select: { completedAt: true } },
        },
      });

      if (myEntry) {
        const metrics = myEntry.metrics as any;
        // Find rank
        const rankCount = await this.prisma.leaderboardEntry.count({
          where: {
            leaderboardDefinitionId: lbDef.id,
            rankValue: { lt: myEntry.rankValue },
          },
        });

        myBest = {
          rank: rankCount + 1,
          commandCount: metrics?.commandCount || 0,
          durationMs: metrics?.durationMs || 0,
          travelDistance: metrics?.travelDistance || 0,
          completedAt: myEntry.bestAttempt.completedAt?.toISOString() || myEntry.updatedAt.toISOString(),
        };
      }
    }

    return {
      puzzle: { id: puzzle.id, title: puzzle.title, slug: puzzle.slug },
      items,
      myBest,
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────

  private async loadAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new NotFoundException('Attempt not found');
    return attempt;
  }

  private checkActive(attempt: { status: string }) {
    if (attempt.status !== 'STARTED') {
      throw new ConflictException('Attempt is not active');
    }
  }

  private async markTimedOut(attemptId: string) {
    await this.prisma.gameAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'FAILED',
        invalidReason: 'TIMEOUT',
        completedAt: new Date(),
      },
    });
  }

  private async getPuzzleMaxDurationMs(puzzleId: string | null | undefined): Promise<number> {
    if (!puzzleId) return getAbsoluteCommandMaxDurationMs();
    const puzzle = await this.prisma.absoluteCommandPuzzle.findUnique({
      where: { id: puzzleId },
      select: { maxDurationMs: true },
    });
    return puzzle?.maxDurationMs ?? getAbsoluteCommandMaxDurationMs();
  }

  private toStateView(state: AbsoluteCommandRuntimeState) {
    return {
      position: state.position,
      visitedCells: state.visitedCells,
      redCells: state.redCells,
      numberStates: state.numberStates,
      commandCount: state.commandCount,
      travelDistance: state.travelDistance,
      commandHistory: state.commandHistory.map((h) => ({
        index: h.index,
        direction: h.direction,
        from: h.from,
        to: h.to,
        path: h.path,
        stopReason: h.stopReason,
        changedNumberCells: h.changedNumberCells,
        createdAt: h.createdAt,
      })),
      completed: state.completed,
    };
  }

  private computeRequiredVisitCells(puzzle: AbsoluteCommandPuzzleSnapshot): number {
    const configuredKeys = new Set(puzzle.cells.map((c) => coordKey(c.coord)));
    let count = 0;
    for (const cell of puzzle.cells) {
      if (cell.type === 'DISABLED' || cell.type === 'INITIAL_RED') continue;
      count++;
    }
    const { width, height, depth } = puzzle.size;
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!configuredKeys.has(coordKey({ x, y, z }))) {
            count++;
          }
        }
      }
    }
    return count;
  }
}
