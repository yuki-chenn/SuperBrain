import { Injectable } from '@nestjs/common';
import type { AttemptStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

interface AuditEntry {
  attemptId: string;
  userId?: string | null;
  gameId?: string | null;
  action: string;
  fromStatus?: AttemptStatus | null;
  toStatus?: AttemptStatus | null;
  reason?: string | null;
  requestId?: string | null;
  playSessionId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

@Injectable()
export class ChallengeAuditService {
  constructor(private prisma: PrismaService) {}

  async record(entry: AuditEntry, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.challengeAuditLog.create({
      data: {
        attemptId: entry.attemptId,
        userId: entry.userId ?? undefined,
        gameId: entry.gameId ?? undefined,
        action: entry.action,
        fromStatus: entry.fromStatus ?? undefined,
        toStatus: entry.toStatus ?? undefined,
        reason: entry.reason ?? undefined,
        requestId: entry.requestId ?? undefined,
        playSessionId: entry.playSessionId ?? undefined,
        metadata: (entry.metadata ?? {}) as any,
        ipAddress: entry.ipAddress ?? undefined,
      },
    });
  }
}
