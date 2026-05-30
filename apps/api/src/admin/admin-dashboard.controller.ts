import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from './audit.service';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDashboardController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  @Get('overview')
  async getOverview() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      activeUsers,
      totalAttempts,
      completedAttempts,
      totalGames,
      publishedPuzzles,
      totalPuzzles,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.gameAttempt.count(),
      this.prisma.gameAttempt.count({ where: { status: 'COMPLETED' } }),
      this.prisma.game.count(),
      this.prisma.absoluteCommandPuzzle.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.absoluteCommandPuzzle.count(),
      this.prisma.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalAttempts,
      completedAttempts,
      totalGames,
      publishedPuzzles,
      totalPuzzles,
      recentAuditLogs: recentAuditLogs.map((log) => ({
        id: log.id,
        actorUsername: log.actorUsername,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }
}
