import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class RankCacheService {
  private readonly logger = new Logger(RankCacheService.name);
  private hints = new Map<string, number>(); // key=`${leaderboardId}:${periodId ?? 'null'}` → ts

  constructor(private prisma: PrismaService) {}

  scheduleRefresh(leaderboardId: string, periodId: string | null) {
    this.hints.set(`${leaderboardId}:${periodId ?? 'null'}`, Date.now());
  }

  takeHints(): Array<{ leaderboardId: string; periodId: string | null }> {
    const out: Array<{ leaderboardId: string; periodId: string | null }> = [];
    for (const k of this.hints.keys()) {
      const [lid, pid] = k.split(':');
      out.push({ leaderboardId: lid, periodId: pid === 'null' ? null : pid });
    }
    this.hints.clear();
    return out;
  }

  async refreshCache(leaderboardId: string, periodId: string | null) {
    const board = await this.prisma.leaderboardDefinition.findUnique({ where: { id: leaderboardId } });
    if (!board) return;
    const isAsc = board.rankDirection === 'ASC';
    const dir = isAsc ? 'asc' : 'desc';
    const top = await this.prisma.leaderboardBest.findMany({
      where: { leaderboardId, periodId },
      orderBy: [
        { rankValue: dir },
        { tieValue1: dir }, { tieValue2: dir }, { tieValue3: dir },
        { updatedAt: 'asc' },
      ],
      take: board.displayLimit,
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.leaderboardRankCache.deleteMany({ where: { leaderboardId, periodId } });
      for (let i = 0; i < top.length; i++) {
        const row = top[i];
        await tx.leaderboardRankCache.create({
          data: {
            leaderboardId, periodId,
            rankPosition: i + 1,
            userId: row.userId,
            scoreRecordId: row.scoreRecordId,
            attemptId: row.attemptId,
            displayNameSnapshot: row.user.displayName ?? row.user.username,
            avatarUrlSnapshot: row.user.avatarUrl ?? null,
            rankValue: row.rankValue,
            metrics: row.metrics as any,
          },
        });
      }
    });
    this.logger.log(`refreshed cache leaderboardId=${leaderboardId} periodId=${periodId} rows=${top.length}`);
  }
}
