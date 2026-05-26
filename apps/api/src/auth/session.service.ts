import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { TokenService } from './token.service';

const REUSE_GRACE_PERIOD_MS = 10_000;

interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class SessionService {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
  ) {}

  async createSession(userId: string, context?: SessionContext) {
    const rawRefreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);
    const ttlDays = parseInt(process.env.JWT_REFRESH_TTL_DAYS || '30', 10);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        refreshTokenFamilyId: randomUUID(),
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
        expiresAt,
      },
    });

    return { session, rawRefreshToken };
  }

  async rotateSession(previousSessionId: string, userId: string, context?: SessionContext) {
    const rawRefreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);
    const ttlDays = parseInt(process.env.JWT_REFRESH_TTL_DAYS || '30', 10);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const previousSession = await this.prisma.session.findUniqueOrThrow({
      where: { id: previousSessionId },
    });

    const newSession = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        refreshTokenFamilyId: previousSession.refreshTokenFamilyId,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
        expiresAt,
      },
    });

    await this.prisma.session.update({
      where: { id: previousSessionId },
      data: {
        revokedAt: new Date(),
        revokedReason: 'ROTATED',
        replacedBySessionId: newSession.id,
      },
    });

    return { session: newSession, rawRefreshToken };
  }

  async findValidSessionByRefreshToken(rawToken: string) {
    const tokenHash = this.tokenService.hashRefreshToken(rawToken);

    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session) {
      return { session: null, shouldRevokeFamily: false };
    }

    if (session.revokedAt) {
      const isRecentRotation =
        session.revokedReason === 'ROTATED' &&
        Date.now() - session.revokedAt.getTime() < REUSE_GRACE_PERIOD_MS;

      return {
        session: null,
        shouldRevokeFamily: !isRecentRotation,
        familyId: session.refreshTokenFamilyId,
      };
    }

    if (session.expiresAt <= new Date()) {
      await this.revokeSession(session.id, 'EXPIRED');
      return { session: null, shouldRevokeFamily: false };
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    return { session, shouldRevokeFamily: false };
  }

  async revokeSession(sessionId: string, reason: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  async revokeAllUserSessions(userId: string, reason: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  async revokeFamily(familyId: string, reason: string) {
    await this.prisma.session.updateMany({
      where: { refreshTokenFamilyId: familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }
}
