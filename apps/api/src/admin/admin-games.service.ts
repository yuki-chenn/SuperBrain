import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from './audit.service';

@Injectable()
export class AdminGamesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async list(query: { status?: string; page?: number; pageSize?: number }) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);

    const where: any = {};
    if (query.status) where.status = query.status;

    const [games, total] = await Promise.all([
      this.prisma.game.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { attempts: true, absoluteCommandPuzzles: true, lifePuzzles: true, pcbPuzzles: true } },
        },
      }),
      this.prisma.game.count({ where }),
    ]);

    return {
      items: games.map((g) => ({
        id: g.id, slug: g.slug, title: g.title, subtitle: g.subtitle,
        description: g.description, source: g.source, coverUrl: g.coverUrl,
        status: g.status, difficultyLevels: g.difficultyLevels, metadata: g.metadata,
        puzzleCount: g._count.absoluteCommandPuzzles + g._count.lifePuzzles + g._count.pcbPuzzles,
        attemptCount: g._count.attempts,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
      })),
      total,
    };
  }

  async getDetail(gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        _count: { select: { attempts: true, absoluteCommandPuzzles: true, lifePuzzles: true, pcbPuzzles: true } },
      },
    });
    if (!game) throw new NotFoundException('Game not found');

    return {
      id: game.id, slug: game.slug, title: game.title, subtitle: game.subtitle,
      description: game.description, source: game.source, coverUrl: game.coverUrl,
      status: game.status, difficultyLevels: game.difficultyLevels, metadata: game.metadata,
      puzzleCount: game._count.absoluteCommandPuzzles + game._count.lifePuzzles + game._count.pcbPuzzles,
      attemptCount: game._count.attempts,
      createdAt: game.createdAt.toISOString(),
      updatedAt: game.updatedAt.toISOString(),
    };
  }

  async update(gameId: string, input: any, admin: { id: string; username: string }) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');

    const updated = await this.prisma.game.update({
      where: { id: gameId },
      data: input,
    });

    await this.audit.log({
      actorUserId: admin.id, actorUsername: admin.username,
      action: 'games:update', resourceType: 'game', resourceId: gameId,
      before: { title: game.title }, after: { title: updated.title },
    });

    return { success: true };
  }

  async publish(gameId: string, admin: { id: string; username: string }) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');

    await this.prisma.game.update({ where: { id: gameId }, data: { status: 'PUBLISHED' } });
    await this.audit.log({
      actorUserId: admin.id, actorUsername: admin.username,
      action: 'games:publish', resourceType: 'game', resourceId: gameId,
      before: { status: game.status }, after: { status: 'PUBLISHED' },
    });

    return { success: true };
  }

  async archive(gameId: string, admin: { id: string; username: string }) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');

    await this.prisma.game.update({ where: { id: gameId }, data: { status: 'ARCHIVED' } });
    await this.audit.log({
      actorUserId: admin.id, actorUsername: admin.username,
      action: 'games:archive', resourceType: 'game', resourceId: gameId,
      before: { status: game.status }, after: { status: 'ARCHIVED' },
    });

    return { success: true };
  }

  async updateDimensions(
    gameId: string,
    dimensions: Array<{ key: string; label: string; value: number }>,
    admin: { id: string; username: string },
  ) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');

    const metadata = (game.metadata as any) || {};
    const beforeDimensions = metadata.dimensions || [];

    metadata.dimensions = dimensions.map((d) => ({
      key: d.key,
      label: d.label,
      value: Math.max(1, Math.min(5, d.value)),
    }));

    await this.prisma.game.update({
      where: { id: gameId },
      data: { metadata },
    });

    await this.audit.log({
      actorUserId: admin.id, actorUsername: admin.username,
      action: 'games:update', resourceType: 'game', resourceId: gameId,
      before: { dimensions: beforeDimensions },
      after: { dimensions: metadata.dimensions },
    });

    return { success: true, dimensions: metadata.dimensions };
  }
}
