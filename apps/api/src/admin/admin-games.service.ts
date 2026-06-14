import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';

const stableHash = (v: unknown) => createHash('sha256').update(JSON.stringify(v ?? {})).digest('hex');

@Injectable()
export class AdminGamesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const items = await this.prisma.game.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { difficulties: true, puzzles: true, leaderboards: true } },
      },
    });
    return {
      items: items.map((g: any) => ({
        ...g,
        difficultyLevels: [], // legacy field kept for SPA compat (Change 4 SPA work pending)
        puzzleCount: g._count?.puzzles ?? 0,
        attemptCount: 0,
      })),
      total: items.length,
    };
  }

  async detail(id: string) {
    const g = await this.prisma.game.findUnique({
      where: { id },
      include: {
        ruleSetVersions: { orderBy: { version: 'desc' } },
        difficulties: { orderBy: [{ key: 'asc' }, { version: 'desc' }] },
        contentPolicies: true,
        challengePolicies: true,
      },
    });
    if (!g) throw new NotFoundException();
    return g;
  }

  async update(id: string, body: any) {
    return this.prisma.game.update({
      where: { id },
      data: {
        title: body.title, subtitle: body.subtitle, description: body.description,
        source: body.source, coverUrl: body.coverUrl, sortOrder: body.sortOrder,
        metadata: body.metadata,
      },
    });
  }

  async publish(id: string) {
    return this.prisma.game.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
  }
  async archive(id: string) {
    return this.prisma.game.update({ where: { id }, data: { status: 'ARCHIVED', archivedAt: new Date() } });
  }

  // ─ Rule set versions ─
  async createRuleSet(gameId: string, body: any) {
    const max = await this.prisma.gameRuleSetVersion.aggregate({
      where: { gameId }, _max: { version: true },
    });
    return this.prisma.gameRuleSetVersion.create({
      data: {
        gameId, name: body.name, engineKey: body.engineKey,
        engineVersion: body.engineVersion ?? null,
        version: (max._max.version ?? 0) + 1,
        config: body.config ?? {},
        configHash: stableHash(body.config),
      },
    });
  }
  async activateRuleSet(rsvId: string) {
    return this.prisma.$transaction(async (tx) => {
      const rsv = await tx.gameRuleSetVersion.findUniqueOrThrow({ where: { id: rsvId } });
      await tx.gameRuleSetVersion.updateMany({
        where: { gameId: rsv.gameId, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      });
      return tx.gameRuleSetVersion.update({
        where: { id: rsvId },
        data: { status: 'ACTIVE', activatedAt: new Date() },
      });
    });
  }

  // ─ Difficulty versions ─
  async createDifficulty(gameId: string, body: any) {
    const max = await this.prisma.gameDifficulty.aggregate({
      where: { gameId, key: body.key }, _max: { version: true },
    });
    return this.prisma.gameDifficulty.create({
      data: {
        gameId, key: body.key, label: body.label,
        version: (max._max.version ?? 0) + 1,
        sortOrder: body.sortOrder ?? 0,
        maxDurationMs: body.maxDurationMs ?? null,
        config: body.config ?? {},
        configHash: stableHash(body.config),
      },
    });
  }
  async activateDifficulty(diffId: string) {
    return this.prisma.$transaction(async (tx) => {
      const d = await tx.gameDifficulty.findUniqueOrThrow({ where: { id: diffId } });
      await tx.gameDifficulty.updateMany({
        where: { gameId: d.gameId, key: d.key, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      });
      return tx.gameDifficulty.update({
        where: { id: diffId }, data: { status: 'ACTIVE', activatedAt: new Date() },
      });
    });
  }

  // ─ Content policies ─
  async createContentPolicy(gameId: string, body: any) {
    return this.prisma.gameContentPolicy.create({
      data: {
        gameId, difficultyId: body.difficultyId ?? null, mode: body.mode ?? null,
        contentMode: body.contentMode, selectionStrategy: body.selectionStrategy ?? 'RANDOM',
        generatorKey: body.generatorKey, generatorConfig: body.generatorConfig ?? {},
        puzzlePoolFilter: body.puzzlePoolFilter ?? {},
        scheduleGranularity: body.scheduleGranularity ?? null,
      },
    });
  }
  async activateContentPolicy(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const p = await tx.gameContentPolicy.findUniqueOrThrow({ where: { id } });
      await tx.gameContentPolicy.updateMany({
        where: { gameId: p.gameId, difficultyId: p.difficultyId, mode: p.mode, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      });
      return tx.gameContentPolicy.update({ where: { id }, data: { status: 'ACTIVE', activatedAt: new Date() } });
    });
  }

  // ─ Challenge policies ─
  async createChallengePolicy(gameId: string, body: any) {
    return this.prisma.gameChallengePolicy.create({
      data: {
        gameId, mode: body.mode ?? 'RANKED', difficultyId: body.difficultyId ?? null,
        allowResume: body.allowResume ?? false,
        allowMultipleActive: body.allowMultipleActive ?? false,
        requiresHeartbeat: body.requiresHeartbeat ?? true,
        heartbeatIntervalSec: body.heartbeatIntervalSec ?? 5,
        heartbeatTimeoutSec: body.heartbeatTimeoutSec ?? 15,
        operationLogMode: body.operationLogMode ?? 'BATCHED',
        operationBatchSize: body.operationBatchSize ?? 20,
        snapshotEveryNEvents: body.snapshotEveryNEvents ?? null,
        saveInitialSnapshot: body.saveInitialSnapshot ?? true,
        saveFinalSnapshot: body.saveFinalSnapshot ?? true,
        eligibleForLeaderboard: body.eligibleForLeaderboard ?? true,
        maxSubmitRetry: body.maxSubmitRetry ?? 1,
      },
    });
  }
  async activateChallengePolicy(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const p = await tx.gameChallengePolicy.findUniqueOrThrow({ where: { id } });
      await tx.gameChallengePolicy.updateMany({
        where: { gameId: p.gameId, mode: p.mode, difficultyId: p.difficultyId, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      });
      return tx.gameChallengePolicy.update({ where: { id }, data: { status: 'ACTIVE' } });
    });
  }

  // ─ List / Detail / Update for sub-entities ─

  async listDifficulties(filters: { gameId?: string; status?: string; key?: string }) {
    const where: any = {};
    if (filters.gameId) where.gameId = filters.gameId;
    if (filters.status) where.status = filters.status;
    if (filters.key) where.key = filters.key;
    const items = await this.prisma.gameDifficulty.findMany({
      where,
      include: { game: { select: { id: true, title: true, slug: true } } },
      orderBy: [{ gameId: 'asc' }, { key: 'asc' }, { version: 'desc' }],
    });
    return { items, total: items.length };
  }

  async getDifficulty(id: string) {
    const item = await this.prisma.gameDifficulty.findUnique({
      where: { id },
      include: { game: { select: { id: true, title: true, slug: true } } },
    });
    if (!item) throw new NotFoundException();
    const contentPolicies = await this.prisma.gameContentPolicy.findMany({ where: { difficultyId: id } });
    const challengePolicies = await this.prisma.gameChallengePolicy.findMany({ where: { difficultyId: id } });
    return { ...item, contentPolicies, challengePolicies };
  }

  async updateDifficulty(id: string, body: any) {
    const data: any = {};
    if (body.label !== undefined) data.label = body.label;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.maxDurationMs !== undefined) data.maxDurationMs = body.maxDurationMs;
    if (body.config !== undefined) { data.config = body.config; data.configHash = stableHash(body.config); }
    return this.prisma.gameDifficulty.update({ where: { id }, data });
  }

  async listContentPolicies(filters: { gameId?: string; difficultyId?: string; status?: string }) {
    const where: any = {};
    if (filters.gameId) where.gameId = filters.gameId;
    if (filters.difficultyId) where.difficultyId = filters.difficultyId;
    if (filters.status) where.status = filters.status;
    const items = await this.prisma.gameContentPolicy.findMany({
      where,
      include: {
        game: { select: { id: true, title: true, slug: true } },
      },
      orderBy: [{ gameId: 'asc' }, { createdAt: 'desc' }],
    });
    return { items, total: items.length };
  }

  async getContentPolicy(id: string) {
    const item = await this.prisma.gameContentPolicy.findUnique({
      where: { id },
      include: { game: { select: { id: true, title: true, slug: true } } },
    });
    if (!item) throw new NotFoundException();
    return item;
  }

  async updateContentPolicy(id: string, body: any) {
    const data: any = {};
    if (body.difficultyId !== undefined) data.difficultyId = body.difficultyId;
    if (body.contentMode !== undefined) data.contentMode = body.contentMode;
    if (body.selectionStrategy !== undefined) data.selectionStrategy = body.selectionStrategy;
    if (body.generatorKey !== undefined) data.generatorKey = body.generatorKey;
    if (body.generatorConfig !== undefined) data.generatorConfig = body.generatorConfig;
    if (body.puzzlePoolFilter !== undefined) data.puzzlePoolFilter = body.puzzlePoolFilter;
    if (body.scheduleGranularity !== undefined) data.scheduleGranularity = body.scheduleGranularity;
    if (body.allowRepeatedPuzzle !== undefined) data.allowRepeatedPuzzle = body.allowRepeatedPuzzle;
    if (body.repeatCooldownHours !== undefined) data.repeatCooldownHours = body.repeatCooldownHours;
    if (body.weightConfig !== undefined) data.weightConfig = body.weightConfig;
    return this.prisma.gameContentPolicy.update({ where: { id }, data });
  }

  async listRuleVersions(filters: { gameId?: string; status?: string }) {
    const where: any = {};
    if (filters.gameId) where.gameId = filters.gameId;
    if (filters.status) where.status = filters.status;
    const items = await this.prisma.gameRuleSetVersion.findMany({
      where,
      include: { game: { select: { id: true, title: true, slug: true } } },
      orderBy: [{ gameId: 'asc' }, { version: 'desc' }],
    });
    return { items, total: items.length };
  }

  async getRuleVersion(id: string) {
    const item = await this.prisma.gameRuleSetVersion.findUnique({
      where: { id },
      include: { game: { select: { id: true, title: true, slug: true } } },
    });
    if (!item) throw new NotFoundException();
    return item;
  }

  async updateRuleVersion(id: string, body: any) {
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.engineKey !== undefined) data.engineKey = body.engineKey;
    if (body.engineVersion !== undefined) data.engineVersion = body.engineVersion;
    if (body.config !== undefined) { data.config = body.config; data.configHash = stableHash(body.config); }
    return this.prisma.gameRuleSetVersion.update({ where: { id }, data });
  }

  async listChallengePolicies(filters: { gameId?: string; difficultyId?: string; status?: string }) {
    const where: any = {};
    if (filters.gameId) where.gameId = filters.gameId;
    if (filters.difficultyId) where.difficultyId = filters.difficultyId;
    if (filters.status) where.status = filters.status;
    const items = await this.prisma.gameChallengePolicy.findMany({
      where,
      include: { game: { select: { id: true, title: true, slug: true } } },
      orderBy: [{ gameId: 'asc' }, { createdAt: 'desc' }],
    });
    return { items, total: items.length };
  }

  async getChallengePolicy(id: string) {
    const item = await this.prisma.gameChallengePolicy.findUnique({
      where: { id },
      include: { game: { select: { id: true, title: true, slug: true } } },
    });
    if (!item) throw new NotFoundException();
    return item;
  }

  async updateChallengePolicy(id: string, body: any) {
    const fields = [
      'difficultyId', 'mode', 'allowResume', 'allowMultipleActive', 'requiresHeartbeat',
      'heartbeatIntervalSec', 'heartbeatTimeoutSec', 'operationLogMode',
      'operationBatchSize', 'snapshotEveryNEvents', 'saveInitialSnapshot',
      'saveFinalSnapshot', 'eligibleForLeaderboard', 'maxSubmitRetry',
    ];
    const data: any = {};
    for (const f of fields) if (body[f] !== undefined) data[f] = body[f];
    return this.prisma.gameChallengePolicy.update({ where: { id }, data });
  }
}
