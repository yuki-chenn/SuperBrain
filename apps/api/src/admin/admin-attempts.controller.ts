import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from './audit.service';

@Controller('admin/attempts')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAttemptsController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  @Get()
  async listAttempts(
    @Query('status') status?: string,
    @Query('gameSlug') gameSlug?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const ps = Math.min(pageSize ? parseInt(pageSize, 10) : 20, 100);

    const where: any = {};
    if (status) where.status = status;
    if (gameSlug) {
      const game = await this.prisma.game.findUnique({ where: { slug: gameSlug } });
      if (game) where.gameId = game.id;
    }

    const [attempts, total] = await Promise.all([
      this.prisma.gameAttempt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps,
        include: {
          user: { select: { username: true } },
          game: { select: { slug: true } },
          lifePuzzle: { select: { id: true, difficultyKey: true } },
          pcbPuzzle: { select: { id: true, difficultyKey: true } },
          absoluteCommandPuzzle: { select: { id: true, title: true, slug: true } },
        },
      }),
      this.prisma.gameAttempt.count({ where }),
    ]);

    return {
      items: attempts.map((a) => ({
        id: a.id, username: a.user.username, gameSlug: a.game.slug,
        difficultyKey: a.difficultyKey, status: a.status,
        puzzleTitle: a.absoluteCommandPuzzle?.title || a.lifePuzzle?.difficultyKey || a.pcbPuzzle?.difficultyKey || null,
        startedAt: a.startedAt.toISOString(),
        completedAt: a.completedAt?.toISOString(),
        metrics: a.metrics,
      })),
      total,
    };
  }

  @Get(':id')
  async getAttempt(@Param('id') id: string) {
    const attempt = await this.prisma.gameAttempt.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true } },
        game: { select: { slug: true, title: true } },
      },
    });
    if (!attempt) return null;

    return {
      id: attempt.id,
      user: { id: attempt.user.id, username: attempt.user.username },
      game: { slug: attempt.game.slug, title: attempt.game.title },
      difficultyKey: attempt.difficultyKey,
      status: attempt.status,
      seed: attempt.seed,
      initialState: attempt.initialState,
      finalState: attempt.finalState,
      moveTrace: attempt.moveTrace,
      metrics: attempt.metrics,
      metadata: attempt.metadata,
      rankValue: attempt.rankValue,
      startedAt: attempt.startedAt.toISOString(),
      completedAt: attempt.completedAt?.toISOString(),
      invalidReason: attempt.invalidReason,
    };
  }

  @Post(':id/invalidate')
  async invalidateAttempt(
    @CurrentUser() admin: { id: string; username: string },
    @Param('id') id: string,
  ) {
    const attempt = await this.prisma.gameAttempt.findUnique({ where: { id } });
    if (!attempt) return { success: false };

    await this.prisma.gameAttempt.update({
      where: { id },
      data: { status: 'FAILED', invalidReason: 'ADMIN_INVALIDATED', completedAt: new Date() },
    });

    await this.audit.log({
      actorUserId: admin.id, actorUsername: admin.username,
      action: 'attempts:invalidate', resourceType: 'attempt', resourceId: id,
      before: { status: attempt.status }, after: { status: 'FAILED' },
    });

    return { success: true };
  }
}
