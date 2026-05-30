import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { PrismaService } from '../database/prisma.service';

@Controller('admin/leaderboards')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminLeaderboardsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async listLeaderboards(
    @Query('gameId') gameId?: string,
    @Query('gameSlug') gameSlug?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const ps = Math.min(pageSize ? parseInt(pageSize, 10) : 20, 100);

    const where: any = {};
    if (gameId) where.gameId = gameId;
    if (gameSlug) {
      const game = await this.prisma.game.findUnique({ where: { slug: gameSlug }, select: { id: true } });
      if (game) where.gameId = game.id;
    }

    const [defs, total] = await Promise.all([
      this.prisma.leaderboardDefinition.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps,
        include: {
          game: { select: { slug: true } },
          _count: { select: { entries: true } },
        },
      }),
      this.prisma.leaderboardDefinition.count({ where }),
    ]);

    return {
      items: defs.map((d) => ({
        id: d.id, slug: d.slug, name: d.name, scope: d.scope,
        difficultyKey: d.difficultyKey, puzzleId: d.puzzleId,
        rankMetric: d.rankMetric, rankDirection: d.rankDirection,
        tieBreakers: d.tieBreakers, entryPolicy: d.entryPolicy,
        gameSlug: d.game.slug,
        entryCount: d._count.entries,
        createdAt: d.createdAt.toISOString(),
      })),
      total,
    };
  }

  @Get(':id')
  async getLeaderboard(@Param('id') id: string) {
    const def = await this.prisma.leaderboardDefinition.findUnique({
      where: { id },
      include: { game: { select: { slug: true, title: true } } },
    });
    if (!def) return null;

    return {
      id: def.id, slug: def.slug, name: def.name, scope: def.scope,
      rankMetric: def.rankMetric, rankDirection: def.rankDirection,
      tieBreakers: def.tieBreakers, entryPolicy: def.entryPolicy,
      gameSlug: def.game.slug, gameTitle: def.game.title,
      createdAt: def.createdAt.toISOString(),
    };
  }

  @Get(':id/entries')
  async getEntries(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const l = Math.min(limit ? parseInt(limit, 10) : 20, 100);
    const o = offset ? parseInt(offset, 10) : 0;

    const [entries, total] = await Promise.all([
      this.prisma.leaderboardEntry.findMany({
        where: { leaderboardDefinitionId: id },
        orderBy: { rankValue: 'asc' },
        take: l, skip: o,
        include: {
          user: { select: { id: true, username: true } },
          bestAttempt: { select: { id: true, completedAt: true } },
        },
      }),
      this.prisma.leaderboardEntry.count({ where: { leaderboardDefinitionId: id } }),
    ]);

    return {
      items: entries.map((e, i) => ({
        rank: o + i + 1,
        user: { id: e.user.id, username: e.user.username },
        rankValue: e.rankValue,
        metrics: e.metrics,
        bestAttemptId: e.bestAttempt.id,
        completedAt: e.bestAttempt.completedAt?.toISOString(),
      })),
      total,
    };
  }
}
