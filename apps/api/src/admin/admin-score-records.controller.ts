import { Body, Controller, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../database/prisma.service';
import { RankCacheService } from '../leaderboards/rank-cache.service';

@Controller('admin/score-records')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminScoreRecordsController {
  constructor(private prisma: PrismaService, private cache: RankCacheService) {}

  @Post(':id/revoke')
  @RequirePermission('score-record:revoke')
  async revoke(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: { id: string },
  ) {
    const record = await this.prisma.scoreRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException();

    await this.prisma.$transaction(async (tx) => {
      await tx.scoreRecord.update({
        where: { id },
        data: { status: 'REVOKED', revokedAt: new Date(), revokedByUserId: user.id, revokedReason: body.reason },
      });
      // If this is the current best, point at next-best ScoreRecord (or delete the LeaderboardBest row)
      const best = await tx.leaderboardBest.findFirst({
        where: { leaderboardId: record.leaderboardId, periodId: record.periodId, userId: record.userId, scoreRecordId: id },
      });
      if (best) {
        const board = await tx.leaderboardDefinition.findUniqueOrThrow({ where: { id: record.leaderboardId } });
        const dir = board.rankDirection === 'ASC' ? 'asc' : 'desc';
        const next = await tx.scoreRecord.findFirst({
          where: {
            leaderboardId: record.leaderboardId, periodId: record.periodId,
            userId: record.userId, status: 'ACTIVE',
          },
          orderBy: [{ rankValue: dir }, { tieValue1: dir }, { tieValue2: dir }, { tieValue3: dir }, { recordedAt: 'asc' }],
        });
        if (next) {
          await tx.leaderboardBest.update({
            where: { id: best.id },
            data: {
              scoreRecordId: next.id, attemptId: next.attemptId,
              rankValue: next.rankValue, tieValue1: next.tieValue1, tieValue2: next.tieValue2, tieValue3: next.tieValue3,
              metrics: next.metrics as any,
            },
          });
        } else {
          await tx.leaderboardBest.delete({ where: { id: best.id } });
        }
      }
    });

    this.cache.scheduleRefresh(record.leaderboardId, record.periodId);
    return { ok: true };
  }
}
