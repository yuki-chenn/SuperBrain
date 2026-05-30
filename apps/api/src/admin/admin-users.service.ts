import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from './audit.service';

@Injectable()
export class AdminUsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async list(query: { keyword?: string; status?: string; role?: string; page?: number; pageSize?: number }) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.role) where.role = query.role;
    if (query.keyword) {
      where.OR = [
        { username: { contains: query.keyword, mode: 'insensitive' } },
        { email: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, email: true, username: true, role: true, status: true,
          lastLoginAt: true, createdAt: true,
          _count: { select: { attempts: true, entries: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: await Promise.all(users.map(async (u) => {
        const completedCount = await this.prisma.gameAttempt.count({
          where: { userId: u.id, status: 'COMPLETED' },
        });
        return {
          id: u.id, email: u.email, username: u.username, role: u.role, status: u.status,
          lastLoginAt: u.lastLoginAt?.toISOString(),
          createdAt: u.createdAt.toISOString(),
          attemptCount: u._count.attempts,
          completedCount,
        };
      })),
      total,
    };
  }

  async getDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sessions: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { attempts: true, entries: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const completedCount = await this.prisma.gameAttempt.count({
      where: { userId, status: 'COMPLETED' },
    });

    return {
      id: user.id, email: user.email, username: user.username,
      role: user.role, status: user.status,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      attemptCount: user._count.attempts,
      completedCount,
      sessions: user.sessions.map((s) => ({
        id: s.id, userAgent: s.userAgent, ipAddress: s.ipAddress,
        lastUsedAt: s.lastUsedAt?.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        revokedAt: s.revokedAt?.toISOString(),
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  async update(userId: string, input: { role?: string }, admin: { id: string; username: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const before = { role: user.role };
    await this.prisma.user.update({ where: { id: userId }, data: { role: input.role as any } });

    await this.audit.log({
      actorUserId: admin.id, actorUsername: admin.username,
      action: 'users:update', resourceType: 'user', resourceId: userId,
      before, after: { role: input.role },
    });

    return { success: true };
  }

  async ban(userId: string, admin: { id: string; username: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN') throw new ForbiddenException('Cannot ban admin users');

    await this.prisma.user.update({ where: { id: userId }, data: { status: 'BANNED' } });
    await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'BANNED' } });

    await this.audit.log({
      actorUserId: admin.id, actorUsername: admin.username,
      action: 'users:ban', resourceType: 'user', resourceId: userId,
      before: { status: user.status }, after: { status: 'BANNED' },
    });

    return { success: true };
  }

  async unban(userId: string, admin: { id: string; username: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });

    await this.audit.log({
      actorUserId: admin.id, actorUsername: admin.username,
      action: 'users:unban', resourceType: 'user', resourceId: userId,
      before: { status: user.status }, after: { status: 'ACTIVE' },
    });

    return { success: true };
  }

  async getSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return sessions.map((s) => ({
      id: s.id, userAgent: s.userAgent, ipAddress: s.ipAddress,
      lastUsedAt: s.lastUsedAt?.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      revokedAt: s.revokedAt?.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async revokeSession(userId: string, sessionId: string, admin: { id: string; username: string }) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), revokedReason: 'ADMIN_REVOKE' },
    });
    await this.audit.log({
      actorUserId: admin.id, actorUsername: admin.username,
      action: 'users:revoke_sessions', resourceType: 'session', resourceId: sessionId,
    });
    return { success: true };
  }

  async revokeAllSessions(userId: string, admin: { id: string; username: string }) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'ADMIN_REVOKE_ALL' },
    });
    await this.audit.log({
      actorUserId: admin.id, actorUsername: admin.username,
      action: 'users:revoke_sessions', resourceType: 'user', resourceId: userId,
      metadata: { all: true },
    });
    return { success: true };
  }
}
