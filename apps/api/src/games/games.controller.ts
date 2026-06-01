import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';

@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const games = await this.prisma.game.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { sortOrder: 'asc' },
      include: {
        difficulties: { where: { status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' } },
        challengePolicies: { where: { status: 'ACTIVE' } },
        contentPolicies: { where: { status: 'ACTIVE' } },
      },
    });
    return {
      items: games.map((g) => this.shape(g)),
    };
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    const game = await this.prisma.game.findUnique({
      where: { slug },
      include: {
        difficulties: { where: { status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' } },
        challengePolicies: { where: { status: 'ACTIVE' } },
        contentPolicies: { where: { status: 'ACTIVE' } },
      },
    });
    if (!game) throw new NotFoundException();
    return this.shape(game);
  }

  private shape(g: any) {
    return {
      id: g.id, slug: g.slug, title: g.title, subtitle: g.subtitle,
      description: g.description, source: g.source, coverUrl: g.coverUrl,
      status: g.status, sortOrder: g.sortOrder, metadata: g.metadata,
      difficulties: g.difficulties.map((d: any) => ({
        key: d.key, label: d.label, sortOrder: d.sortOrder, maxDurationMs: d.maxDurationMs,
        config: d.config,
      })),
      supportedModes: Array.from(new Set(g.challengePolicies.map((p: any) => p.mode))),
      contentMode: g.contentPolicies[0]?.contentMode ?? null,
    };
  }
}
