import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { TokenService } from './token.service';

const REUSE_GRACE_PERIOD_MS = 30_000;

interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthSessionService {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
  ) {}

  async createSession(userId: string, context?: SessionContext) {
    const rawRefreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);
    const ttlDays = parseInt(process.env.JWT_REFRESH_TTL_DAYS || '30', 10);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const session = await this.prisma.authSession.create({
      data: {
        userId,
        refreshTokenHash,
        refreshTokenFamilyId: randomUUID(),
        status: 'ACTIVE',
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

    const previousSession = await this.prisma.authSession.findUniqueOrThrow({
      where: { id: previousSessionId },
    });

    const newSession = await this.prisma.authSession.create({
      data: {
        userId,
        refreshTokenHash,
        refreshTokenFamilyId: previousSession.refreshTokenFamilyId,
        status: 'ACTIVE',
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
        expiresAt,
      },
    });

    await this.prisma.authSession.update({
      where: { id: previousSessionId },
      data: {
        status: 'ROTATED',
        revokedAt: new Date(),
        revokedReason: 'ROTATED',
        replacedBySessionId: newSession.id,
      },
    });

    return { session: newSession, rawRefreshToken };
  }

  async findValidSessionByRefreshToken(rawToken: string) {
    const tokenHash = this.tokenService.hashRefreshToken(rawToken);

    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session) {
      return { session: null, shouldRevokeFamily: false };
    }

    if (session.status === 'REVOKED' || session.status === 'COMPROMISED' || session.status === 'EXPIRED') {
      return { session: null, shouldRevokeFamily: true, familyId: session.refreshTokenFamilyId };
    }

    if (session.status === 'ROTATED') {
      const isRecentRotation =
        session.revokedAt &&
        Date.now() - session.revokedAt.getTime() < REUSE_GRACE_PERIOD_MS;
      return {
        session: null,
        shouldRevokeFamily: !isRecentRotation,
        familyId: session.refreshTokenFamilyId,
        recentRotation: isRecentRotation && session.replacedBySessionId
          ? await this.prisma.authSession.findUnique({
              where: { id: session.replacedBySessionId },
              include: { user: true },
            })
          : undefined,
      };
    }

    if (session.expiresAt <= new Date()) {
      await this.revokeSession(session.id, 'EXPIRED');
      return { session: null, shouldRevokeFamily: false };
    }

    // Bump lastUsedAt
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    return { session, shouldRevokeFamily: false };
  }

  async revokeSession(sessionId: string, reason: string) {
    return this.prisma.authSession.updateMany({
      where: { id: sessionId, status: { in: ['ACTIVE', 'ROTATED'] } },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: reason },
    });
  }

  async revokeFamily(familyId: string, reason: string) {
    return this.prisma.authSession.updateMany({
      where: { refreshTokenFamilyId: familyId, status: { not: 'REVOKED' } },
      data: { status: 'COMPROMISED', revokedAt: new Date(), revokedReason: reason },
    });
  }

  async revokeAllUserSessions(userId: string, reason: string) {
    return this.prisma.authSession.updateMany({
      where: { userId, status: { in: ['ACTIVE', 'ROTATED'] } },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: reason },
    });
  }
}
