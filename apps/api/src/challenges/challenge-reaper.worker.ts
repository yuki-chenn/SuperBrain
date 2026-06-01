import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { ChallengeAuditService } from './challenge-audit.service';

@Injectable()
export class ChallengeReaperWorker {
  private readonly logger = new Logger(ChallengeReaperWorker.name);

  constructor(
    private prisma: PrismaService,
    private audit: ChallengeAuditService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async run() {
    const now = new Date();

    // 1) Past expiresAt → TIMEOUT
    const expired = await this.prisma.gameAttempt.findMany({
      where: {
        status: { in: ['CREATED', 'CLAIMED', 'PLAYING', 'SUBMITTING'] },
        expiresAt: { lt: now },
      },
      take: 50,
      select: { id: true, userId: true, gameId: true, status: true, expiresAt: true },
    });
    for (const a of expired) {
      const r = await this.prisma.gameAttempt.updateMany({
        where: { id: a.id, status: a.status },
        data: { status: 'TIMEOUT', timeoutAt: a.expiresAt ?? now, statusVersion: { increment: 1 } },
      });
      if (r.count === 1) {
        await this.audit.record({
          attemptId: a.id, userId: a.userId, gameId: a.gameId,
          action: 'TIMEOUT', fromStatus: a.status, toStatus: 'TIMEOUT',
          reason: 'reaper-expired',
        });
      }
    }
    if (expired.length > 0) this.logger.log(`reaped ${expired.length} expired attempts`);

    // 2) Heartbeat-stale → INTERRUPTED (uses default 15s timeout for now)
    const heartbeatThreshold = new Date(now.getTime() - 15_000);
    const stale = await this.prisma.gameAttempt.findMany({
      where: {
        status: { in: ['PLAYING', 'SUBMITTING'] },
        OR: [
          { lastHeartbeatAt: { lt: heartbeatThreshold } },
          { lastHeartbeatAt: null, claimedAt: { lt: heartbeatThreshold } },
        ],
      },
      take: 50,
      select: { id: true, userId: true, gameId: true, status: true },
    });
    for (const a of stale) {
      const r = await this.prisma.gameAttempt.updateMany({
        where: { id: a.id, status: a.status },
        data: { status: 'INTERRUPTED', interruptedAt: now, interruptReason: 'reaper-heartbeat-stale', statusVersion: { increment: 1 } },
      });
      if (r.count === 1) {
        await this.audit.record({
          attemptId: a.id, userId: a.userId, gameId: a.gameId,
          action: 'INTERRUPT', fromStatus: a.status, toStatus: 'INTERRUPTED',
          reason: 'reaper-heartbeat-stale',
        });
      }
    }
    if (stale.length > 0) this.logger.log(`reaped ${stale.length} stale-heartbeat attempts`);
  }
}
