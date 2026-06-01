import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async paginate(query: { search?: string; status?: string; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, username: true, displayName: true,
          status: true, lastLoginAt: true, createdAt: true,
          userRoles: { include: { role: { select: { key: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        status: u.status,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        roles: u.userRoles.map((r) => r.role.key),
      })),
      total, page, pageSize,
    };
  }

  async getDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, username: true, displayName: true, avatarUrl: true,
        status: true, lastLoginAt: true, createdAt: true, updatedAt: true,
        userRoles: { include: { role: { select: { key: true, name: true, isSystem: true } } } },
        authSessions: {
          where: { status: 'ACTIVE' },
          select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!user) throw new NotFoundException();
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.userRoles.map((r) => r.role),
      activeSessions: user.authSessions,
    };
  }

  async ban(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { status: 'BANNED' } });
  }

  async unban(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
  }
}
