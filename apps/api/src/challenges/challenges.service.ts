import {
  ConflictException, ForbiddenException, Injectable,
  NotFoundException, BadRequestException,
} from '@nestjs/common';
import type { ChallengeMode, GameAttempt, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { GameAdapterRegistry } from '../games/game-adapter-registry.service';
import { RuntimeSessionService } from './runtime-session.service';
import { ChallengeAuditService } from './challenge-audit.service';
import { isTerminal } from './challenge-state-machine';
import { ScoreRecordingService } from '../leaderboards/score-recording.service';
import { RedisLockService } from '../common/redis-lock.service';

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class ChallengesService {
  constructor(
    private prisma: PrismaService,
    private registry: GameAdapterRegistry,
    private sessions: RuntimeSessionService,
    private audit: ChallengeAuditService,
    private scoreRecording: ScoreRecordingService,
    private lock: RedisLockService,
  ) {}

  // ────────────────────────────────────────── start ──
  async start(args: {
    userId: string;
    gameSlug: string;
    mode: ChallengeMode;
    difficultyKey: string;
    puzzleSlug?: string;
    idempotencyKey?: string;
  }, ctx: RequestContext = {}) {
    const game = await this.prisma.game.findUnique({ where: { slug: args.gameSlug } });
    if (!game || game.status !== 'PUBLISHED') throw new NotFoundException('game-not-found');

    // Idempotency replay
    if (args.idempotencyKey) {
      const existing = await this.prisma.gameAttempt.findUnique({
        where: { userId_idempotencyKey: { userId: args.userId, idempotencyKey: args.idempotencyKey } },
      });
      if (existing) {
        const session = await this.sessions.findActiveByAttempt(existing.id);
        return this.composeStartResponse(existing, session?.playSessionId ?? '', undefined);
      }
    }

    // Active-attempt collision for RANKED/DAILY → return existing
    if (args.mode === 'RANKED' || args.mode === 'DAILY') {
      const active = await this.prisma.gameAttempt.findFirst({
        where: {
          userId: args.userId,
          mode: { in: ['RANKED', 'DAILY'] },
          status: { in: ['CREATED', 'CLAIMED', 'PLAYING', 'SUBMITTING'] },
        },
      });
      if (active) {
        const session = await this.sessions.findActiveByAttempt(active.id);
        return this.composeStartResponse(active, session?.playSessionId ?? '', undefined);
      }
    }

    const ruleSetVersion = await this.prisma.gameRuleSetVersion.findFirst({
      where: { gameId: game.id, status: 'ACTIVE' },
    });
    if (!ruleSetVersion) throw new ConflictException('no-active-rule-set');

    const difficulty = await this.prisma.gameDifficulty.findFirst({
      where: { gameId: game.id, key: args.difficultyKey, status: 'ACTIVE' },
    });
    if (!difficulty) throw new BadRequestException('invalid-difficulty');

    const challengePolicy = await this.prisma.gameChallengePolicy.findFirst({
      where: { gameId: game.id, mode: args.mode, status: 'ACTIVE' },
    });
    if (!challengePolicy) throw new ConflictException('no-active-challenge-policy');

    const contentPolicy = await this.prisma.gameContentPolicy.findFirst({
      where: { gameId: game.id, status: 'ACTIVE' },
    });

    const adapter = this.registry.get(ruleSetVersion.engineKey);
    const startResult = await adapter.startAttempt({
      game: { id: game.id, slug: game.slug },
      ruleSetVersion, difficulty, contentPolicy, challengePolicy,
      mode: args.mode, userId: args.userId,
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + startResult.maxDurationMs + 120_000); // +2min countdown grace

    const attempt = await this.prisma.gameAttempt.create({
      data: {
        userId: args.userId,
        gameId: game.id,
        mode: args.mode,
        status: 'CREATED',
        ruleSetVersionId: ruleSetVersion.id,
        difficultyId: difficulty.id,
        difficultyVersion: difficulty.version,
        contentPolicyId: contentPolicy?.id,
        challengePolicyId: challengePolicy.id,
        contentResolvedType: startResult.contentResolvedType,
        puzzleId: startResult.puzzleId,
        puzzleVersionId: startResult.puzzleVersionId,
        seed: startResult.seed,
        generatedContentHash: startResult.generatedContentHash,
        policySnapshot: {
          challengePolicy: { ...challengePolicy },
          difficulty: { id: difficulty.id, key: difficulty.key, version: difficulty.version, config: difficulty.config },
          ruleSetVersion: { id: ruleSetVersion.id, version: ruleSetVersion.version, engineKey: ruleSetVersion.engineKey },
          initialState: startResult.initialState,
        } as any,
        idempotencyKey: args.idempotencyKey,
        startedAt: now,
        expiresAt,
      },
    });

    const { session, rawToken } = await this.sessions.create({
      attemptId: attempt.id,
      userId: args.userId,
      expiresAt: new Date(now.getTime() + 2 * 60_000),
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    });

    await this.audit.record({
      attemptId: attempt.id, userId: args.userId, gameId: game.id,
      action: 'START', fromStatus: null, toStatus: 'CREATED',
      reason: null, requestId: ctx.requestId,
      playSessionId: session.playSessionId, metadata: { mode: args.mode, difficultyKey: args.difficultyKey },
      ipAddress: ctx.ipAddress,
    });

    return this.composeStartResponse(attempt, session.playSessionId, rawToken);
  }

  private composeStartResponse(attempt: GameAttempt, playSessionId: string, entryToken: string | undefined) {
    const policy = (attempt.policySnapshot ?? {}) as any;
    return {
      attemptId: attempt.id,
      gameId: attempt.gameId,
      mode: attempt.mode,
      status: attempt.status,
      entryToken,
      playSessionId,
      seed: attempt.seed,
      initialState: policy.initialState,
      maxDurationMs: policy.challengePolicy?.heartbeatTimeoutSec ? undefined : undefined,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      playPath: `/games/${policy.ruleSetVersion?.engineKey ?? ''}/attempts/${attempt.id}/play${
        entryToken ? `?token=${encodeURIComponent(entryToken)}` : ''
      }`,
    };
  }

  // ────────────────────────────────────────── claim ──
  async claim(args: { userId: string; attemptId: string; entryToken: string; playSessionId: string }, ctx: RequestContext = {}) {
    const attempt = await this.assertAttempt(args.attemptId, args.userId);
    const session = await this.sessions.findByToken(args.attemptId, args.entryToken);
    if (!session) return { canEnter: false, status: attempt.status, reason: 'invalid-token', redirectTo: this.expiredPath(attempt) };
    if (session.playSessionId !== args.playSessionId) {
      return { canEnter: false, status: attempt.status, reason: 'session-conflict' };
    }
    if (attempt.status === 'COMPLETED') return { canEnter: false, status: attempt.status, redirectTo: this.resultPath(attempt) };
    if (isTerminal(attempt.status)) return { canEnter: false, status: attempt.status, redirectTo: this.expiredPath(attempt) };

    const result = await this.prisma.gameAttempt.updateMany({
      where: { id: attempt.id, status: 'CREATED' },
      data: { status: 'CLAIMED', statusVersion: { increment: 1 }, claimedAt: new Date() },
    });
    if (result.count === 1) {
      await this.sessions.markClaimed(session.id);
      await this.audit.record({
        attemptId: attempt.id, userId: args.userId, gameId: attempt.gameId,
        action: 'CLAIM', fromStatus: 'CREATED', toStatus: 'CLAIMED',
        playSessionId: args.playSessionId, ipAddress: ctx.ipAddress,
      });
    }
    const fresh = await this.prisma.gameAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    const policy = (fresh.policySnapshot ?? {}) as any;
    return {
      canEnter: true,
      status: fresh.status,
      seed: fresh.seed,
      initialState: policy.initialState,
      startedAt: fresh.startedAt,
      expiresAt: fresh.expiresAt,
    };
  }

  // ────────────────────────────────────────── heartbeat ──
  async heartbeat(args: {
    userId: string; attemptId: string; playSessionId: string;
    clientNow?: string; phase?: 'countdown' | 'playing' | 'submitting'; localElapsedMs?: number;
  }, ctx: RequestContext = {}) {
    const attempt = await this.assertAttempt(args.attemptId, args.userId);
    const session = await this.sessions.findActiveByAttempt(args.attemptId);
    if (!session || session.playSessionId !== args.playSessionId) {
      throw new ForbiddenException('session-conflict');
    }
    const now = new Date();
    if (attempt.expiresAt && attempt.expiresAt.getTime() < now.getTime()) {
      const result = await this.prisma.gameAttempt.updateMany({
        where: { id: attempt.id, status: { in: ['CREATED', 'CLAIMED', 'PLAYING', 'SUBMITTING'] } },
        data: { status: 'TIMEOUT', timeoutAt: attempt.expiresAt, statusVersion: { increment: 1 } },
      });
      if (result.count === 1) {
        await this.audit.record({
          attemptId: attempt.id, userId: args.userId, gameId: attempt.gameId,
          action: 'TIMEOUT', fromStatus: attempt.status, toStatus: 'TIMEOUT',
          reason: 'expires-at-passed', playSessionId: args.playSessionId, ipAddress: ctx.ipAddress,
        });
      }
      return { accepted: false, serverNow: now.toISOString(), status: 'TIMEOUT' as const, remainingMs: 0 };
    }

    // CLAIMED → PLAYING when SPA signals end-of-countdown
    if (attempt.status === 'CLAIMED' && args.phase === 'playing') {
      const result = await this.prisma.gameAttempt.updateMany({
        where: { id: attempt.id, status: 'CLAIMED' },
        data: { status: 'PLAYING', playingAt: now, statusVersion: { increment: 1 } },
      });
      if (result.count === 1) {
        await this.audit.record({
          attemptId: attempt.id, userId: args.userId, gameId: attempt.gameId,
          action: 'START_PLAYING', fromStatus: 'CLAIMED', toStatus: 'PLAYING',
          playSessionId: args.playSessionId, ipAddress: ctx.ipAddress,
        });
      }
    }

    await this.prisma.gameAttempt.update({ where: { id: attempt.id }, data: { lastHeartbeatAt: now } });
    await this.sessions.heartbeat(session.id);

    const remainingMs = attempt.expiresAt ? Math.max(0, attempt.expiresAt.getTime() - now.getTime()) : 0;
    const fresh = await this.prisma.gameAttempt.findUniqueOrThrow({ where: { id: attempt.id }, select: { status: true } });
    return { accepted: true, serverNow: now.toISOString(), status: fresh.status, remainingMs };
  }

  // ────────────────────────────────────────── abandon ──
  async abandon(args: { userId: string; attemptId: string; playSessionId: string; reason: string }, ctx: RequestContext = {}) {
    const attempt = await this.assertAttempt(args.attemptId, args.userId);
    if (isTerminal(attempt.status)) return { accepted: true, status: attempt.status };

    const result = await this.prisma.gameAttempt.updateMany({
      where: { id: attempt.id, status: { in: ['CREATED', 'CLAIMED', 'PLAYING', 'PAUSED'] } },
      data: { status: 'ABANDONED', abandonedAt: new Date(), abandonReason: args.reason, statusVersion: { increment: 1 } },
    });
    if (result.count === 1) {
      await this.audit.record({
        attemptId: attempt.id, userId: args.userId, gameId: attempt.gameId,
        action: 'ABANDON', fromStatus: attempt.status, toStatus: 'ABANDONED',
        reason: args.reason, playSessionId: args.playSessionId, ipAddress: ctx.ipAddress,
      });
    }
    const fresh = await this.prisma.gameAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    return { accepted: true, status: fresh.status };
  }

  // ────────────────────────────────────────── finish ──
  async finish(args: {
    userId: string; attemptId: string; playSessionId: string; finalState: unknown; metrics?: Record<string, unknown>;
  }, ctx: RequestContext = {}) {
    const attempt = await this.assertAttempt(args.attemptId, args.userId);
    const session = await this.sessions.findActiveByAttempt(args.attemptId);
    if (!session || session.playSessionId !== args.playSessionId) {
      throw new ForbiddenException('session-conflict');
    }

    if (attempt.status === 'COMPLETED') {
      return this.completedResponse(attempt);
    }

    // CAS PLAYING → SUBMITTING
    const cas1 = await this.prisma.gameAttempt.updateMany({
      where: { id: attempt.id, status: 'PLAYING' },
      data: { status: 'SUBMITTING', submittedAt: new Date(), statusVersion: { increment: 1 } },
    });
    if (cas1.count !== 1) {
      const fresh = await this.prisma.gameAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
      if (fresh.status === 'COMPLETED') return this.completedResponse(fresh);
      throw new ConflictException({ error: 'invalid-state', status: fresh.status });
    }

    const ruleSetVersion = await this.prisma.gameRuleSetVersion.findUniqueOrThrow({ where: { id: attempt.ruleSetVersionId } });
    const difficulty = attempt.difficultyId ? await this.prisma.gameDifficulty.findUnique({ where: { id: attempt.difficultyId } }) : null;
    const puzzleVersion = attempt.puzzleVersionId ? await this.prisma.puzzleVersion.findUnique({ where: { id: attempt.puzzleVersionId } }) : null;
    const adapter = this.registry.get(ruleSetVersion.engineKey);

    let report;
    try {
      report = await adapter.finishAttempt({
        attempt, ruleSetVersion, difficulty, puzzleVersion,
        finalState: args.finalState, metrics: args.metrics ?? {},
      });
    } catch (err) {
      await this.prisma.gameAttempt.updateMany({
        where: { id: attempt.id, status: 'SUBMITTING' },
        data: {
          status: 'INVALIDATED', invalidatedAt: new Date(),
          invalidReason: 'adapter-error', statusVersion: { increment: 1 },
        },
      });
      await this.audit.record({
        attemptId: attempt.id, userId: args.userId, gameId: attempt.gameId,
        action: 'INVALIDATE', fromStatus: 'SUBMITTING', toStatus: 'INVALIDATED',
        reason: `adapter-error:${(err as Error).message}`, playSessionId: args.playSessionId, ipAddress: ctx.ipAddress,
      });
      throw err;
    }

    await this.prisma.attemptValidationReport.create({
      data: {
        attemptId: attempt.id, gameId: attempt.gameId,
        validatorKey: report.validatorKey,
        validatorVersion: report.validatorVersion,
        passed: report.passed,
        scoreAccepted: report.passed,
        antiCheatFlags: report.antiCheatFlags as any,
        metrics: report.metrics as any,
        report: {} as any,
        isFinal: true,
      },
    });

    const challengePolicy = attempt.challengePolicyId
      ? await this.prisma.gameChallengePolicy.findUnique({ where: { id: attempt.challengePolicyId } })
      : null;

    // Anti-cheat gate → REVIEW_REQUIRED
    if (report.passed && report.antiCheatFlags.length > 0) {
      await this.prisma.gameAttempt.updateMany({
        where: { id: attempt.id, status: 'SUBMITTING' },
        data: { status: 'REVIEW_REQUIRED', completedAt: new Date(), durationMs: report.durationMs, scoreValue: report.scoreValue ?? null, validationStatus: 'REVIEW_REQUIRED', metricsSummary: report.metrics as any, statusVersion: { increment: 1 } },
      });
      await this.prisma.adminReviewTask.create({
        data: {
          resourceType: 'GameAttempt', resourceId: attempt.id, action: 'REVIEW_ATTEMPT',
          requestPayload: { antiCheatFlags: report.antiCheatFlags } as any,
          requestedByUserId: args.userId,
        },
      });
      await this.audit.record({
        attemptId: attempt.id, userId: args.userId, gameId: attempt.gameId,
        action: 'REQUEST_REVIEW', fromStatus: 'SUBMITTING', toStatus: 'REVIEW_REQUIRED',
        reason: 'anti-cheat-flagged', playSessionId: args.playSessionId, ipAddress: ctx.ipAddress,
        metadata: { antiCheatFlags: report.antiCheatFlags } as any,
      });
      const fresh = await this.prisma.gameAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
      const resp = this.completedResponse(fresh);
      resp.leaderboards = [];
      return resp;
    }

    const eligible = report.passed && (challengePolicy?.eligibleForLeaderboard ?? false);
    const leaderboards = await this.prisma.$transaction(async (tx) => {
      const cas2 = await tx.gameAttempt.updateMany({
        where: { id: attempt.id, status: 'SUBMITTING' },
        data: {
          status: 'COMPLETED', completedAt: new Date(),
          durationMs: report.durationMs,
          scoreValue: report.scoreValue ?? null,
          validationStatus: report.passed ? 'VALID' : 'INVALID',
          scoreEligibility: eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
          metricsSummary: report.metrics as any,
          statusVersion: { increment: 1 },
        },
      });
      if (cas2.count !== 1) return [];
      const fresh = await tx.gameAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
      await this.audit.record({
        attemptId: attempt.id, userId: args.userId, gameId: attempt.gameId,
        action: report.passed ? 'VERIFY_SUCCESS' : 'VERIFY_INVALID',
        fromStatus: 'SUBMITTING', toStatus: 'COMPLETED',
        playSessionId: args.playSessionId, ipAddress: ctx.ipAddress,
        metadata: { passed: report.passed, scoreValue: report.scoreValue, durationMs: report.durationMs },
      }, tx);
      return await this.scoreRecording.recordScores(fresh, report.metrics, tx);
    });
    const fresh = await this.prisma.gameAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    const resp = this.completedResponse(fresh);
    resp.leaderboards = leaderboards;
    return resp;
  }

  private completedResponse(attempt: GameAttempt) {
    return {
      accepted: true,
      status: attempt.status,
      result: {
        success: attempt.validationStatus === 'VALID',
        score: attempt.scoreValue ? Number(attempt.scoreValue) : undefined,
        durationMs: attempt.durationMs ?? undefined,
        metrics: attempt.metricsSummary ?? {},
      },
      resultPath: this.resultPath(attempt),
      leaderboards: [] as Array<{ leaderboardSlug: string; recorded: boolean; currentRank?: number }>,
    };
  }

  // ────────────────────────────────────────── status ──
  async getStatus(args: { userId: string; attemptId: string }) {
    const attempt = await this.assertAttempt(args.attemptId, args.userId);
    return {
      attemptId: attempt.id,
      mode: attempt.mode,
      status: attempt.status,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      expiresAt: attempt.expiresAt,
      resultPath: attempt.status === 'COMPLETED' ? this.resultPath(attempt) : undefined,
      expiredPath: isTerminal(attempt.status) && attempt.status !== 'COMPLETED' ? this.expiredPath(attempt) : undefined,
    };
  }

  private async assertAttempt(attemptId: string, userId: string) {
    const attempt = await this.prisma.gameAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('attempt-not-found');
    if (attempt.userId !== userId) throw new ForbiddenException('attempt-forbidden');
    return attempt;
  }

  private resultPath(attempt: { gameId: string; id: string }) {
    return `/api/internal/attempts/${attempt.id}/result`;
  }
  private expiredPath(attempt: { gameId: string; id: string }) {
    return `/api/internal/attempts/${attempt.id}/expired`;
  }
}
