import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { RankCacheService } from './rank-cache.service';

@Injectable()
export class LeaderboardRefreshWorker {
  private readonly logger = new Logger(LeaderboardRefreshWorker.name);

  constructor(private prisma: PrismaService, private cache: RankCacheService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run() {
    // Drain on-write hints first
    for (const hint of this.cache.takeHints()) {
      try { await this.cache.refreshCache(hint.leaderboardId, hint.periodId); }
      catch (err) { this.logger.warn(`refresh hint failed: ${(err as Error).message}`); }
    }

    // Periodic sweep: refresh boards whose newest score arrived after last cache.
    // Simple version: find every (leaderboardId, periodId) in LeaderboardBest and refresh if stale.
    const stale = await this.prisma.$queryRaw<Array<{ leaderboardId: string; periodId: string | null }>>`
      SELECT DISTINCT lb."leaderboardId", lb."periodId"
      FROM "LeaderboardBest" lb
      LEFT JOIN (
        SELECT "leaderboardId", "periodId", MAX("generatedAt") AS gen
        FROM "LeaderboardRankCache" GROUP BY "leaderboardId", "periodId"
      ) rc ON rc."leaderboardId" = lb."leaderboardId"
        AND (rc."periodId" IS NOT DISTINCT FROM lb."periodId")
      WHERE rc.gen IS NULL OR lb."updatedAt" > rc.gen
      LIMIT 50
    `;
    for (const row of stale) {
      try { await this.cache.refreshCache(row.leaderboardId, row.periodId); }
      catch (err) { this.logger.warn(`stale refresh failed: ${(err as Error).message}`); }
    }
  }
}
