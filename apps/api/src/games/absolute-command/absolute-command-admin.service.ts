import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../admin/audit.service';
import {
  validateAbsoluteCommandPuzzle,
  coordKey,
} from '@brain-games/game-engine';
import type {
  AbsoluteCommandCell,
  AbsoluteCommandDirection,
  AbsoluteCommandPuzzleSnapshot,
  MazeCoord,
} from '@brain-games/game-engine';

@Injectable()
export class AbsoluteCommandAdminService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ─── List puzzles (all statuses) ───────────────────────────────────

  async listPuzzles(query: {
    status?: string;
    difficultyLabel?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.difficultyLabel) where.difficultyLabel = query.difficultyLabel;

    const [puzzles, total] = await Promise.all([
      this.prisma.absoluteCommandPuzzle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              versions: true,
              attempts: true,
            },
          },
        },
      }),
      this.prisma.absoluteCommandPuzzle.count({ where }),
    ]);

    // Get latest version sizes for all puzzles in batch
    const puzzleIds = puzzles.map((p) => p.id);
    const latestVersions = await this.prisma.absoluteCommandPuzzleVersion.findMany({
      where: { puzzleId: { in: puzzleIds } },
      orderBy: { version: 'desc' },
      distinct: ['puzzleId'],
      select: { puzzleId: true, size: true },
    });
    const sizeMap = new Map(latestVersions.map((v) => [v.puzzleId, v.size]));

    const items = puzzles.map((puzzle) => {
      const mazeSize = sizeMap.get(puzzle.id) as { width: number; height: number; depth: number } | undefined;

      return {
        id: puzzle.id,
        slug: puzzle.slug,
        title: puzzle.title,
        description: puzzle.description || undefined,
        difficultyLabel: puzzle.difficultyLabel || undefined,
        status: puzzle.status,
        mazeSize: mazeSize || { width: 8, height: 8, depth: 3 },
        publishedAt: puzzle.publishedAt?.toISOString() || undefined,
        createdAt: puzzle.createdAt.toISOString(),
        updatedAt: puzzle.updatedAt.toISOString(),
        versionCount: puzzle._count.versions,
        attemptCount: puzzle._count.attempts,
      };
    });

    return { items, total };
  }

  // ─── Get puzzle detail (admin view) ────────────────────────────────

  async getPuzzleDetail(puzzleId: string) {
    const puzzle = await this.prisma.absoluteCommandPuzzle.findUnique({
      where: { id: puzzleId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
        _count: {
          select: { attempts: true },
        },
      },
    });

    if (!puzzle) throw new NotFoundException('Puzzle not found');

    const completedCount = await this.prisma.gameAttempt.count({
      where: {
        absoluteCommandPuzzleId: puzzle.id,
        status: 'COMPLETED',
      },
    });

    return {
      id: puzzle.id,
      slug: puzzle.slug,
      title: puzzle.title,
      description: puzzle.description || undefined,
      difficultyLabel: puzzle.difficultyLabel || undefined,
      season: puzzle.season,
      episode: puzzle.episode,
      source: puzzle.source || undefined,
      status: puzzle.status,
      maxDurationMs: puzzle.maxDurationMs,
      currentVersionId: puzzle.currentVersionId || undefined,
      publishedAt: puzzle.publishedAt?.toISOString() || undefined,
      createdByUserId: puzzle.createdByUserId || undefined,
      createdAt: puzzle.createdAt.toISOString(),
      updatedAt: puzzle.updatedAt.toISOString(),
      versions: puzzle.versions.map((v) => ({
        id: v.id,
        version: v.version,
        size: v.size as unknown as { width: number; height: number; depth: number },
        startCoord: v.startCoord as unknown as MazeCoord,
        cells: v.cells as unknown as AbsoluteCommandCell[],
        referenceSolution: (v.referenceSolution as unknown as AbsoluteCommandDirection[]) || undefined,
        validationStatus: v.validationStatus as 'UNVALIDATED' | 'VALID' | 'INVALID',
        validationReport: v.validationReport,
        createdByUserId: v.createdByUserId || undefined,
        createdAt: v.createdAt.toISOString(),
      })),
      attemptCount: puzzle._count.attempts,
      completedCount,
    };
  }

  // ─── Create puzzle ─────────────────────────────────────────────────

  async createPuzzle(
    input: {
      title: string;
      slug: string;
      description?: string;
      difficultyLabel?: string;
      season?: number;
      episode?: number;
      source?: string;
      estimatedDuration?: string;
      optimalCommandCount?: number;
      maxDurationMs?: number;
    },
    userId: string,
  ) {
    // Check slug uniqueness
    const existing = await this.prisma.absoluteCommandPuzzle.findUnique({
      where: { slug: input.slug },
    });
    if (existing) throw new ConflictException('Slug already exists');

    // Get the game
    const game = await this.prisma.game.findUnique({
      where: { slug: 'absolute-command' },
    });
    if (!game) throw new NotFoundException('Game not registered');

    const puzzle = await this.prisma.absoluteCommandPuzzle.create({
      data: {
        gameId: game.id,
        title: input.title,
        slug: input.slug,
        description: input.description,
        difficultyLabel: input.difficultyLabel,
        season: input.season ?? 13,
        episode: input.episode ?? 2,
        source: input.source,
        estimatedDuration: input.estimatedDuration,
        optimalCommandCount: input.optimalCommandCount,
        maxDurationMs: input.maxDurationMs ?? 3600000,
        status: 'DRAFT',
        createdByUserId: userId,
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'puzzles:create',
      resourceType: 'absolute-command-puzzle',
      resourceId: puzzle.id,
      after: { title: puzzle.title, slug: puzzle.slug },
    });

    return {
      id: puzzle.id,
      slug: puzzle.slug,
      title: puzzle.title,
      status: puzzle.status,
    };
  }

  // ─── Update puzzle metadata ────────────────────────────────────────

  async updatePuzzle(
    puzzleId: string,
    input: {
      title?: string;
      slug?: string;
      description?: string;
      difficultyLabel?: string;
      season?: number;
      episode?: number;
      source?: string;
      estimatedDuration?: string;
      optimalCommandCount?: number;
      maxDurationMs?: number;
    },
  ) {
    const puzzle = await this.prisma.absoluteCommandPuzzle.findUnique({
      where: { id: puzzleId },
    });
    if (!puzzle) throw new NotFoundException('Puzzle not found');

    // Check slug uniqueness if changing
    if (input.slug && input.slug !== puzzle.slug) {
      const existing = await this.prisma.absoluteCommandPuzzle.findUnique({
        where: { slug: input.slug },
      });
      if (existing) throw new ConflictException('Slug already exists');
    }

    const updated = await this.prisma.absoluteCommandPuzzle.update({
      where: { id: puzzleId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.difficultyLabel !== undefined && { difficultyLabel: input.difficultyLabel }),
        ...(input.season !== undefined && { season: input.season }),
        ...(input.episode !== undefined && { episode: input.episode }),
        ...(input.source !== undefined && { source: input.source }),
        ...(input.estimatedDuration !== undefined && { estimatedDuration: input.estimatedDuration }),
        ...(input.optimalCommandCount !== undefined && { optimalCommandCount: input.optimalCommandCount }),
        ...(input.maxDurationMs !== undefined && { maxDurationMs: input.maxDurationMs }),
      },
    });

    return {
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      status: updated.status,
    };
  }

  // ─── Save maze version ─────────────────────────────────────────────

  async saveMazeVersion(
    puzzleId: string,
    input: {
      size?: { width: number; height: number; depth: number };
      cells: AbsoluteCommandCell[];
      startCoord: MazeCoord;
      referenceSolution?: AbsoluteCommandDirection[];
    },
    userId: string,
  ) {
    const puzzle = await this.prisma.absoluteCommandPuzzle.findUnique({
      where: { id: puzzleId },
    });
    if (!puzzle) throw new NotFoundException('Puzzle not found');

    // Get next version number
    const latestVersion = await this.prisma.absoluteCommandPuzzleVersion.findFirst({
      where: { puzzleId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (latestVersion?.version ?? 0) + 1;

    const version = await this.prisma.absoluteCommandPuzzleVersion.create({
      data: {
        puzzleId,
        version: nextVersion,
        size: (input.size || { width: 8, height: 8, depth: 3 }) as any,
        startCoord: input.startCoord as any,
        cells: input.cells as any,
        referenceSolution: input.referenceSolution ? (input.referenceSolution as any) : null,
        validationStatus: 'UNVALIDATED',
        validationReport: {},
        createdByUserId: userId,
      },
    });

    return {
      id: version.id,
      version: version.version,
      validationStatus: version.validationStatus,
    };
  }

  // ─── Validate puzzle ───────────────────────────────────────────────

  async validatePuzzle(puzzleId: string) {
    const puzzle = await this.prisma.absoluteCommandPuzzle.findUnique({
      where: { id: puzzleId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!puzzle) throw new NotFoundException('Puzzle not found');
    const version = puzzle.versions[0];
    if (!version) throw new BadRequestException('Puzzle has no versions');

    const snapshot: AbsoluteCommandPuzzleSnapshot = {
      puzzleId: puzzle.id,
      puzzleVersion: version.version,
      size: version.size as unknown as { width: number; height: number; depth: number },
      startCoord: version.startCoord as unknown as MazeCoord,
      cells: version.cells as unknown as AbsoluteCommandCell[],
    };

    const referenceSolution = version.referenceSolution as unknown as AbsoluteCommandDirection[] | null;

    const report = validateAbsoluteCommandPuzzle(
      snapshot,
      referenceSolution && referenceSolution.length > 0 ? referenceSolution : undefined,
    );

    // Update version validation status
    await this.prisma.absoluteCommandPuzzleVersion.update({
      where: { id: version.id },
      data: {
        validationStatus: report.valid ? 'VALID' : 'INVALID',
        validationReport: report as any,
      },
    });

    return report;
  }

  // ─── Publish puzzle ────────────────────────────────────────────────

  async publishPuzzle(puzzleId: string) {
    const puzzle = await this.prisma.absoluteCommandPuzzle.findUnique({
      where: { id: puzzleId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!puzzle) throw new NotFoundException('Puzzle not found');
    const version = puzzle.versions[0];
    if (!version) throw new BadRequestException('Puzzle has no versions');

    // Update currentVersionId, status, and publishedAt
    await this.prisma.absoluteCommandPuzzle.update({
      where: { id: puzzleId },
      data: {
        status: 'PUBLISHED',
        currentVersionId: version.id,
        publishedAt: new Date(),
      },
    });

    // Ensure leaderboard definition exists
    const game = await this.prisma.game.findUnique({
      where: { slug: 'absolute-command' },
    });
    if (game) {
      const existingLb = await this.prisma.leaderboardDefinition.findFirst({
        where: {
          gameId: game.id,
          puzzleId,
        },
      });

      if (!existingLb) {
        await this.prisma.leaderboardDefinition.create({
          data: {
            gameId: game.id,
            slug: `absolute-command-puzzle-${puzzle.slug}`,
            name: `绝对指令 · ${puzzle.title}`,
            scope: 'GLOBAL',
            puzzleId,
            rankMetric: 'commandCount',
            rankDirection: 'ASC',
            tieBreakers: [
              { metric: 'durationMs', direction: 'ASC' },
              { metric: 'completedAt', direction: 'ASC' },
            ],
            entryPolicy: 'BEST_PER_USER',
          },
        });
      }
    }

    await this.audit.log({
      action: 'puzzles:publish',
      resourceType: 'absolute-command-puzzle',
      resourceId: puzzleId,
      before: { status: 'DRAFT' },
      after: { status: 'PUBLISHED', currentVersionId: version.id },
    });

    return { success: true, status: 'PUBLISHED' };
  }

  // ─── Unpublish puzzle ──────────────────────────────────────────────

  async unpublishPuzzle(puzzleId: string) {
    const puzzle = await this.prisma.absoluteCommandPuzzle.findUnique({
      where: { id: puzzleId },
    });
    if (!puzzle) throw new NotFoundException('Puzzle not found');

    await this.prisma.absoluteCommandPuzzle.update({
      where: { id: puzzleId },
      data: { status: 'DRAFT', publishedAt: null },
    });

    await this.audit.log({
      action: 'puzzles:archive',
      resourceType: 'absolute-command-puzzle',
      resourceId: puzzleId,
      before: { status: puzzle.status },
      after: { status: 'DRAFT' },
    });

    return { success: true, status: 'DRAFT' };
  }

  // ─── Get puzzle attempts ───────────────────────────────────────────

  async getPuzzleAttempts(
    puzzleId: string,
    query: { page?: number; pageSize?: number },
  ) {
    const puzzle = await this.prisma.absoluteCommandPuzzle.findUnique({
      where: { id: puzzleId },
    });
    if (!puzzle) throw new NotFoundException('Puzzle not found');

    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);

    const [attempts, total] = await Promise.all([
      this.prisma.gameAttempt.findMany({
        where: { absoluteCommandPuzzleId: puzzleId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, username: true } },
        },
      }),
      this.prisma.gameAttempt.count({
        where: { absoluteCommandPuzzleId: puzzleId },
      }),
    ]);

    return {
      items: attempts.map((a) => ({
        id: a.id,
        userId: a.userId,
        username: a.user.username,
        status: a.status,
        startedAt: a.startedAt.toISOString(),
        completedAt: a.completedAt?.toISOString(),
        metrics: a.metrics,
        rankValue: a.rankValue,
      })),
      total,
    };
  }

  // ─── Get attempt replay ────────────────────────────────────────────

  async getAttemptReplay(attemptId: string) {
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id: attemptId },
      include: {
        user: { select: { id: true, username: true } },
        absoluteCommandLogs: {
          orderBy: { index: 'asc' },
        },
      },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');

    const metadata = attempt.metadata as any;

    return {
      id: attempt.id,
      userId: attempt.userId,
      username: attempt.user.username,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      completedAt: attempt.completedAt?.toISOString(),
      metrics: attempt.metrics,
      puzzleSnapshot: metadata?.puzzleSnapshot,
      runtimeState: metadata?.runtimeState,
      commandLogs: attempt.absoluteCommandLogs.map((log) => ({
        id: log.id,
        index: log.index,
        direction: log.direction,
        fromCoord: log.fromCoord,
        toCoord: log.toCoord,
        path: log.path,
        stopReason: log.stopReason,
        changedCells: log.changedCells,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }

  // ─── Get puzzle leaderboard ────────────────────────────────────────

  async getPuzzleLeaderboard(
    puzzleId: string,
    query: { limit?: number; offset?: number },
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
        total: 0,
      };
    }

    const limit = Math.min(query.limit || 20, 100);
    const offset = query.offset || 0;

    const [entries, total] = await Promise.all([
      this.prisma.leaderboardEntry.findMany({
        where: { leaderboardDefinitionId: lbDef.id },
        orderBy: { rankValue: 'asc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          bestAttempt: { select: { completedAt: true } },
        },
      }),
      this.prisma.leaderboardEntry.count({
        where: { leaderboardDefinitionId: lbDef.id },
      }),
    ]);

    return {
      puzzle: { id: puzzle.id, title: puzzle.title, slug: puzzle.slug },
      items: entries.map((entry, index) => {
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
      }),
      total,
    };
  }
}
