import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { EntryTokenService } from './entry-token.service';

@Injectable()
export class RuntimeSessionService {
  constructor(
    private prisma: PrismaService,
    private tokens: EntryTokenService,
  ) {}

  async create(args: { attemptId: string; userId: string; expiresAt: Date; userAgent?: string; ipAddress?: string }) {
    const { rawToken, hash } = this.tokens.generate();
    const playSessionId = randomUUID();
    const session = await this.prisma.attemptRuntimeSession.create({
      data: {
        attemptId: args.attemptId,
        userId: args.userId,
        entryTokenHash: hash,
        playSessionId,
        status: 'CREATED',
        expiresAt: args.expiresAt,
        userAgent: args.userAgent,
        ipAddress: args.ipAddress,
      },
    });
    return { session, rawToken };
  }

  async findByToken(attemptId: string, rawToken: string) {
    const hash = this.tokens.hash(rawToken);
    return this.prisma.attemptRuntimeSession.findUnique({ where: { entryTokenHash: hash } })
      .then((row) => (row && row.attemptId === attemptId ? row : null));
  }

  async findActiveByAttempt(attemptId: string) {
    return this.prisma.attemptRuntimeSession.findFirst({
      where: { attemptId, status: { in: ['CREATED', 'CLAIMED', 'PLAYING'] } },
    });
  }

  async markClaimed(sessionId: string) {
    return this.prisma.attemptRuntimeSession.update({
      where: { id: sessionId },
      data: { status: 'CLAIMED', claimedAt: new Date() },
    });
  }

  async markPlaying(sessionId: string) {
    return this.prisma.attemptRuntimeSession.update({
      where: { id: sessionId },
      data: { status: 'PLAYING' },
    });
  }

  async heartbeat(sessionId: string) {
    return this.prisma.attemptRuntimeSession.update({
      where: { id: sessionId },
      data: { lastHeartbeatAt: new Date() },
    });
  }

  async revoke(sessionId: string, reason: string) {
    return this.prisma.attemptRuntimeSession.updateMany({
      where: { id: sessionId, status: { in: ['CREATED', 'CLAIMED', 'PLAYING'] } },
      data: { status: 'INVALIDATED', revokedAt: new Date(), revokedReason: reason },
    });
  }
}
