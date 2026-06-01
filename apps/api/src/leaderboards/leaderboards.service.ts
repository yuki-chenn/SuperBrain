import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RankCacheService } from './rank-cache.service';

@Injectable()
export class LeaderboardsService {
  constructor(private prisma: PrismaService, private cache: RankCacheService) {}

  async list(query: { gameId?: string; difficultyId?: string; mode?: string; periodType?: string }) {
    const where: any = { status: 'ACTIVE', visible: true };
    if (query.gameId) where.gameId = query.gameId;
    if (query.difficultyId) where.difficultyId = query.difficultyId;
    if (query.mode) where.mode = query.mode;
    if (query.periodType) where.periodType = query.periodType;
    return this.prisma.leaderboardDefinition.findMany({ where, orderBy: { name: 'asc' } });
  }

  async detail(slug: string, opts: { periodKey?: string; offset?: number; limit?: number; userId?: string }) {
    const board = await this.prisma.leaderboardDefinition.findFirst({ where: { slug } });
    if (!board) throw new NotFoundException('leaderboard-not-found');
    let period = null as any;
    if (board.periodType === 'ALL_TIME') {
      period = await this.prisma.leaderboardPeriod.findFirst({
        where: { leaderboardId: board.id, periodKey: 'all-time' },
      });
    } else if (opts.periodKey) {
      period = await this.prisma.leaderboardPeriod.findUnique({
        where: { leaderboardId_periodKey: { leaderboardId: board.id, periodKey: opts.periodKey } },
      });
    } else {
      period = await this.prisma.leaderboardPeriod.findFirst({
        where: { leaderboardId: board.id }, orderBy: { createdAt: 'desc' },
      });
    }
    const periodId = period?.id ?? null;

    let cache = await this.prisma.leaderboardRankCache.findMany({
      where: { leaderboardId: board.id, periodId },
      orderBy: { rankPosition: 'asc' },
      skip: opts.offset ?? 0,
      take: Math.min(opts.limit ?? 50, board.displayLimit),
    });
    if (cache.length === 0) {
      // Inline refresh (best-effort)
      try { await this.cache.refreshCache(board.id, periodId); } catch {}
      cache = await this.prisma.leaderboardRankCache.findMany({
        where: { leaderboardId: board.id, periodId },
        orderBy: { rankPosition: 'asc' },
        skip: opts.offset ?? 0,
        take: Math.min(opts.limit ?? 50, board.displayLimit),
      });
    }
    const total = await this.prisma.leaderboardBest.count({ where: { leaderboardId: board.id, periodId } });
    let currentUserRank: number | undefined;
    if (opts.userId) {
      const myBest = await this.prisma.leaderboardBest.findUnique({
        where: { leaderboardId_periodId_userId: { leaderboardId: board.id, periodId, userId: opts.userId } },
      });
      if (myBest) {
        const isAsc = board.rankDirection === 'ASC';
        const better = await this.prisma.leaderboardBest.count({
          where: {
            leaderboardId: board.id, periodId,
            rankValue: isAsc ? { lt: myBest.rankValue } : { gt: myBest.rankValue },
          },
        });
        currentUserRank = better + 1;
      }
    }
    return { leaderboard: board, period, items: cache, currentUserRank, total };
  }

  async listPeriods(slug: string, limit = 30) {
    const board = await this.prisma.leaderboardDefinition.findFirst({ where: { slug } });
    if (!board) throw new NotFoundException('leaderboard-not-found');
    return this.prisma.leaderboardPeriod.findMany({
      where: { leaderboardId: board.id }, orderBy: { createdAt: 'desc' }, take: limit,
    });
  }
}
