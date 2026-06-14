import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthSessionStatus } from '@prisma/client';

@Injectable()
export class AdminSessionsService {
  constructor(private prisma: PrismaService) {}

  async stats() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [active, expired, revoked, expiringSoon] = await Promise.all([
      this.prisma.authSession.count({ where: { status: 'ACTIVE' } }),
      this.prisma.authSession.count({ where: { status: 'EXPIRED' } }),
      this.prisma.authSession.count({ where: { status: { in: ['REVOKED', 'COMPROMISED'] } } }),
      this.prisma.authSession.count({
        where: {
          status: 'ACTIVE',
          expiresAt: { gte: now, lte: in24h },
        },
      }),
    ]);

    return { active, expired, revoked, expiringSoon };
  }

  async list(params: {
    status?: string;
    client?: string;
    userId?: string;
    sessionId?: string;
    familyId?: string;
    ipAddress?: string;
    createdFrom?: string;
    createdTo?: string;
    expiresFrom?: string;
    expiresTo?: string;
    special?: string;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortDir?: 'asc' | 'desc';
  }) {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (params.status) {
      where.status = params.status as AuthSessionStatus;
    }
    if (params.client) {
      where.client = params.client;
    }
    if (params.userId) {
      where.userId = params.userId;
    }
    if (params.sessionId) {
      where.id = params.sessionId;
    }
    if (params.familyId) {
      where.refreshTokenFamilyId = params.familyId;
    }
    if (params.ipAddress) {
      where.ipAddress = { contains: params.ipAddress };
    }
    if (params.createdFrom || params.createdTo) {
      where.createdAt = {};
      if (params.createdFrom) where.createdAt.gte = new Date(params.createdFrom);
      if (params.createdTo) where.createdAt.lte = new Date(params.createdTo);
    }
    if (params.expiresFrom || params.expiresTo) {
      where.expiresAt = {};
      if (params.expiresFrom) where.expiresAt.gte = new Date(params.expiresFrom);
      if (params.expiresTo) where.expiresAt.lte = new Date(params.expiresTo);
    }

    // Special filters
    const now = new Date();
    if (params.special === 'expiring-soon') {
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      where.status = 'ACTIVE';
      where.expiresAt = { gte: now, lte: in24h };
    } else if (params.special === 'unused') {
      where.status = 'ACTIVE';
      where.lastUsedAt = null;
    } else if (params.special === 'replaced') {
      where.status = 'ROTATED';
      where.replacedBySessionId = { not: null };
    }

    // Sort
    const sortField = params.sortField || 'createdAt';
    const sortDir = params.sortDir || 'desc';
    const orderBy: any = {};
    if (['createdAt', 'expiresAt', 'lastUsedAt'].includes(sortField)) {
      orderBy[sortField] = sortDir;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.authSession.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, email: true, displayName: true } },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prisma.authSession.count({ where }),
    ]);

    return {
      items: items.map((s) => this.formatListItem(s)),
      total,
      page,
      pageSize,
    };
  }

  async getDetail(id: string) {
    const session = await this.prisma.authSession.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, email: true, displayName: true, avatarUrl: true } },
      },
    });
    if (!session) return null;

    return {
      id: session.id,
      userId: session.userId,
      user: session.user,
      client: session.client || null,
      status: session.status,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      refreshTokenFamilyId: session.refreshTokenFamilyId,
      refreshTokenHashMasked: this.maskHash(session.refreshTokenHash),
      replacedBySessionId: session.replacedBySessionId,
      expiresAt: session.expiresAt.toISOString(),
      lastUsedAt: session.lastUsedAt?.toISOString() || null,
      revokedAt: session.revokedAt?.toISOString() || null,
      revokedReason: session.revokedReason,
      createdAt: session.createdAt.toISOString(),
    };
  }

  async revokeSession(id: string, reason: string) {
    const session = await this.prisma.authSession.findUnique({ where: { id } });
    if (!session) return null;
    if (session.status !== 'ACTIVE') {
      return { error: 'not-active', message: '该会话不是有效状态' };
    }

    return this.prisma.authSession.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  async revokeFamily(familyId: string, reason: string) {
    const result = await this.prisma.authSession.updateMany({
      where: {
        refreshTokenFamilyId: familyId,
        status: 'ACTIVE',
      },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
    return { revokedCount: result.count };
  }

  private formatListItem(session: any) {
    return {
      id: session.id,
      userId: session.userId,
      user: session.user,
      client: session.client || null,
      status: session.status,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      refreshTokenFamilyId: session.refreshTokenFamilyId,
      replacedBySessionId: session.replacedBySessionId,
      expiresAt: session.expiresAt.toISOString(),
      lastUsedAt: session.lastUsedAt?.toISOString() || null,
      revokedAt: session.revokedAt?.toISOString() || null,
      revokedReason: session.revokedReason,
      createdAt: session.createdAt.toISOString(),
    };
  }

  private maskHash(hash: string): string {
    if (!hash || hash.length < 16) return '****';
    return `${hash.slice(0, 6)}****${hash.slice(-6)}`;
  }
}
