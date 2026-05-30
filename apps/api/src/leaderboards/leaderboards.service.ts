import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { GameAttempt } from '@prisma/client';

interface TieBreaker {
  metric: string;
  direction: 'ASC' | 'DESC';
}

@Injectable()
export class LeaderboardsService {
  constructor(private prisma: PrismaService) {}

  async recordAttemptResult(attempt: GameAttempt): Promise<{ updated: boolean }> {
    // For puzzle-specific leaderboards (e.g., absolute-command), also match by puzzleId
    const puzzleId = (attempt as any).absoluteCommandPuzzleId || null;

    const definitions = await this.prisma.leaderboardDefinition.findMany({
      where: {
        gameId: attempt.gameId,
        OR: [
          { difficultyKey: attempt.difficultyKey },
          ...(puzzleId ? [{ puzzleId }] : []),
        ],
      },
    });

    let anyUpdated = false;

    for (const def of definitions) {
      const metadata = def.metadata as Record<string, unknown> | undefined;
      const isStats = metadata?.type === 'stats';

      if (isStats) {
        const updated = await this.recordStatsEntry(attempt, def);
        if (updated) anyUpdated = true;
      } else {
        const updated = await this.recordBestEntry(attempt, def);
        if (updated) anyUpdated = true;
      }
    }

    return { updated: anyUpdated };
  }

  private async recordBestEntry(attempt: GameAttempt, def: { id: string; rankMetric: string; rankDirection: string; tieBreakers: unknown }): Promise<boolean> {
    const metrics = attempt.metrics as Record<string, unknown>;
    const rankValue = metrics[def.rankMetric] as number;
    if (rankValue === undefined) return false;

    const existing = await this.prisma.leaderboardEntry.findUnique({
      where: {
        leaderboardDefinitionId_userId: {
          leaderboardDefinitionId: def.id,
          userId: attempt.userId,
        },
      },
    });

    if (!existing) {
      await this.prisma.leaderboardEntry.create({
        data: {
          leaderboardDefinitionId: def.id,
          userId: attempt.userId,
          bestAttemptId: attempt.id,
          rankValue,
          metrics: metrics as any,
        },
      });
      return true;
    }

    const tieBreakers = (def.tieBreakers as unknown as TieBreaker[]) || [];
    const isBetter = this.isBetterAttempt({
      candidate: {
        rankValue,
        metrics,
        completedAt: attempt.completedAt || new Date(),
      },
      current: {
        rankValue: Number(existing.rankValue),
        metrics: existing.metrics as Record<string, unknown>,
        completedAt: existing.updatedAt,
      },
      direction: def.rankDirection as 'ASC' | 'DESC',
      tieBreakers,
    });

    if (isBetter) {
      await this.prisma.leaderboardEntry.update({
        where: { id: existing.id },
        data: {
          bestAttemptId: attempt.id,
          rankValue,
          metrics: metrics as any,
        },
      });
      return true;
    }

    return false;
  }

  private async recordStatsEntry(attempt: GameAttempt, def: { id: string; difficultyKey: string | null }): Promise<boolean> {
    const ROLLING_WINDOW = 10;

    // Count completions
    const existing = await this.prisma.leaderboardEntry.findUnique({
      where: {
        leaderboardDefinitionId_userId: {
          leaderboardDefinitionId: def.id,
          userId: attempt.userId,
        },
      },
    });

    const prevMetrics = (existing?.metrics as Record<string, unknown>) || {};
    const completionCount = (Number(prevMetrics.completionCount) || 0) + 1;

    // Fetch last N completions for this specific difficulty
    const recentAttempts = await this.prisma.gameAttempt.findMany({
      where: {
        userId: attempt.userId,
        gameId: attempt.gameId,
        difficultyKey: attempt.difficultyKey,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
      take: ROLLING_WINDOW,
      select: { metrics: true },
    });

    const durations = recentAttempts
      .map((a) => (a.metrics as Record<string, unknown>)?.durationMs as number)
      .filter((d) => typeof d === 'number');

    const avgTimeLast10 = durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : 0;

    const rankValue = avgTimeLast10;
    const entryMetrics = { avgTimeLast10, completionCount };

    if (existing) {
      await this.prisma.leaderboardEntry.update({
        where: { id: existing.id },
        data: {
          bestAttemptId: attempt.id,
          rankValue,
          metrics: entryMetrics as any,
        },
      });
    } else {
      await this.prisma.leaderboardEntry.create({
        data: {
          leaderboardDefinitionId: def.id,
          userId: attempt.userId,
          bestAttemptId: attempt.id,
          rankValue,
          metrics: entryMetrics as any,
        },
      });
    }

    return true;
  }

  isBetterAttempt(params: {
    candidate: { rankValue: number; metrics: Record<string, unknown>; completedAt: Date };
    current: { rankValue: number; metrics: Record<string, unknown>; completedAt: Date };
    direction: 'ASC' | 'DESC';
    tieBreakers: TieBreaker[];
  }): boolean {
    const { candidate, current, direction, tieBreakers } = params;

    // Compare primary metric
    if (candidate.rankValue !== current.rankValue) {
      return direction === 'ASC'
        ? candidate.rankValue < current.rankValue
        : candidate.rankValue > current.rankValue;
    }

    // Tie-breakers
    for (const tb of tieBreakers) {
      const cVal = candidate.metrics[tb.metric];
      const curVal = current.metrics[tb.metric];
      if (cVal !== curVal && cVal !== undefined && curVal !== undefined) {
        return tb.direction === 'ASC'
          ? (cVal as number) < (curVal as number)
          : (cVal as number) > (curVal as number);
      }
    }

    return false; // Exact tie
  }

  async getLeaderboardsByGame(gameSlug: string) {
    const game = await this.prisma.game.findUnique({ where: { slug: gameSlug } });
    if (!game) throw new NotFoundException(`Game '${gameSlug}' not found`);

    const definitions = await this.prisma.leaderboardDefinition.findMany({
      where: { gameId: game.id },
      orderBy: { createdAt: 'asc' },
    });

    return definitions;
  }

  async getEntries(leaderboardSlug: string, limit = 50, offset = 0) {
    const definition = await this.prisma.leaderboardDefinition.findUnique({
      where: { slug: leaderboardSlug },
    });
    if (!definition) throw new NotFoundException(`Leaderboard '${leaderboardSlug}' not found`);

    const orderBy =
      definition.rankDirection === 'ASC' ? { rankValue: 'asc' as const } : { rankValue: 'desc' as const };

    const entries = await this.prisma.leaderboardEntry.findMany({
      where: { leaderboardDefinitionId: definition.id },
      orderBy,
      take: limit,
      skip: offset,
      include: {
        user: { select: { id: true, username: true } },
        bestAttempt: { select: { completedAt: true } },
      },
    });

    return {
      leaderboard: {
        id: definition.id,
        slug: definition.slug,
        name: definition.name,
        scope: definition.scope,
        difficultyKey: definition.difficultyKey,
        rankMetric: definition.rankMetric,
        rankDirection: definition.rankDirection,
        tieBreakers: definition.tieBreakers,
        entryPolicy: definition.entryPolicy,
        metadata: definition.metadata,
      },
      items: entries.map((entry, index) => ({
        rank: offset + index + 1,
        user: { id: entry.user.id, username: entry.user.username },
        metrics: entry.metrics,
        completedAt: entry.bestAttempt.completedAt?.toISOString() || entry.updatedAt.toISOString(),
      })),
    };
  }
}
