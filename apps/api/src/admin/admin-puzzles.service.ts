import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  slidingpuzzleValidateContent,
  lifegameValidateContent,
  precisecharacterbuildingValidateContent,
  absolutecommandValidateContent,
} from '@brain-games/game-engine';
import { PrismaService } from '../database/prisma.service';

const stableHash = (v: unknown) => createHash('sha256').update(JSON.stringify(v ?? {})).digest('hex');

const VALIDATORS: Record<string, (c: unknown) => { valid: boolean; errors?: string[]; warnings?: string[] }> = {
  'sliding-puzzle': slidingpuzzleValidateContent,
  'life-game': lifegameValidateContent,
  'precise-character-building': precisecharacterbuildingValidateContent,
  'absolute-command': absolutecommandValidateContent,
};

@Injectable()
export class AdminPuzzlesService {
  constructor(private prisma: PrismaService) {}

  async list(query: { gameId?: string; status?: string; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const where: any = {};
    if (query.gameId) where.gameId = query.gameId;
    if (query.status) where.status = query.status;
    const [items, total] = await Promise.all([
      this.prisma.puzzle.findMany({ where, orderBy: [{ gameId: 'asc' }, { sortOrder: 'asc' }], skip: (page-1)*pageSize, take: pageSize }),
      this.prisma.puzzle.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async detail(id: string) {
    const p = await this.prisma.puzzle.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!p) throw new NotFoundException();
    return p;
  }

  create(body: any) {
    return this.prisma.puzzle.create({
      data: {
        gameId: body.gameId, slug: body.slug, title: body.title,
        description: body.description, difficultyId: body.difficultyId,
        sortOrder: body.sortOrder ?? 0, source: body.source,
      },
    });
  }

  update(id: string, body: any) {
    return this.prisma.puzzle.update({
      where: { id },
      data: {
        title: body.title, description: body.description,
        difficultyId: body.difficultyId, sortOrder: body.sortOrder, source: body.source,
      },
    });
  }

  async softDelete(id: string) {
    return this.prisma.puzzle.update({ where: { id }, data: { status: 'ARCHIVED', archivedAt: new Date() } });
  }

  // ─── Versions ───

  async listVersions(query: { gameId?: string; status?: string; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 200);
    const where: any = {};
    if (query.gameId) where.puzzle = { gameId: query.gameId };
    if (query.status) where.status = query.status;
    const [items, total] = await Promise.all([
      this.prisma.puzzleVersion.findMany({
        where,
        include: { puzzle: { select: { id: true, gameId: true, title: true, slug: true, currentVersionId: true } } },
        orderBy: [{ puzzle: { gameId: 'asc' } }, { puzzle: { title: 'asc' } }, { version: 'desc' }],
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      this.prisma.puzzleVersion.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async createVersion(puzzleId: string, body: { engineKey: string; content: unknown }) {
    const max = await this.prisma.puzzleVersion.aggregate({ where: { puzzleId }, _max: { version: true } });
    return this.prisma.puzzleVersion.create({
      data: {
        puzzleId, version: (max._max.version ?? 0) + 1,
        engineKey: body.engineKey,
        content: body.content as any,
        contentHash: stableHash(body.content),
      },
    });
  }

  async updateVersion(versionId: string, body: { content: unknown }) {
    const v = await this.prisma.puzzleVersion.findUniqueOrThrow({ where: { id: versionId } });
    if (v.status !== 'DRAFT' && v.status !== 'VALIDATING') {
      throw new ConflictException({ error: 'version-not-editable', status: v.status });
    }
    return this.prisma.puzzleVersion.update({
      where: { id: versionId },
      data: { content: body.content as any, contentHash: stableHash(body.content) },
    });
  }

  async validateVersion(versionId: string) {
    const v = await this.prisma.puzzleVersion.findUniqueOrThrow({ where: { id: versionId } });
    const validator = VALIDATORS[v.engineKey];
    if (!validator) throw new BadRequestException({ error: 'no-validator-for-engine', engineKey: v.engineKey });
    const result = validator(v.content);
    return this.prisma.puzzleVersion.update({
      where: { id: versionId },
      data: {
        validationStatus: result.valid ? 'VALID' : 'INVALID',
        validationReport: { errors: result.errors ?? [], warnings: result.warnings ?? [] } as any,
      },
    });
  }

  async publishVersion(versionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const v = await tx.puzzleVersion.findUniqueOrThrow({ where: { id: versionId } });
      if (v.validationStatus !== 'VALID') {
        throw new ConflictException({ error: 'must-validate-first', status: v.validationStatus });
      }
      await tx.puzzleVersion.updateMany({
        where: { puzzleId: v.puzzleId, status: 'PUBLISHED' },
        data: { status: 'ARCHIVED' },
      });
      const published = await tx.puzzleVersion.update({
        where: { id: versionId }, data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
      await tx.puzzle.update({ where: { id: v.puzzleId }, data: { currentVersionId: versionId } });
      return published;
    });
  }
}
