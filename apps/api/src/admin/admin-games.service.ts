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
}
