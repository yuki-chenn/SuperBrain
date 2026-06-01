import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import type { SubmissionType } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { GameAdapterRegistry } from '../games/game-adapter-registry.service';

interface SubmitArgs {
  userId: string;
  attemptId: string;
  submissionType: SubmissionType;
  payload: unknown;
  idempotencyKey: string;
  playSessionId: string;
  hints?: { roundIndex?: number; regionId?: string; seq?: number };
}

@Injectable()
export class SubmissionsService {
  constructor(private prisma: PrismaService, private registry: GameAdapterRegistry) {}

  async submit(args: SubmitArgs, _ctx: { ipAddress?: string; userAgent?: string }) {
    if (!args.idempotencyKey) throw new BadRequestException({ error: 'idempotency-key-required' });
    const attempt = await this.prisma.gameAttempt.findUnique({ where: { id: args.attemptId } });
    if (!attempt) throw new NotFoundException('attempt-not-found');
    if (attempt.userId !== args.userId) throw new ForbiddenException('attempt-forbidden');
    if (attempt.status !== 'PLAYING') throw new ConflictException({ error: 'attempt-not-active', status: attempt.status });

    const session = await this.prisma.attemptRuntimeSession.findFirst({
      where: { attemptId: args.attemptId, status: { in: ['CLAIMED', 'PLAYING'] } },
    });
    if (!session || session.playSessionId !== args.playSessionId) throw new ForbiddenException('session-conflict');

    // Idempotent replay
    const existing = await this.prisma.gameSubmission.findUnique({
      where: { attemptId_idempotencyKey: { attemptId: args.attemptId, idempotencyKey: args.idempotencyKey } },
    });
    if (existing) {
      return {
        accepted: true,
        submission: {
          id: existing.id, validationPassed: existing.validationPassed,
          result: existing.validationResult, errorReason: existing.errorReason,
        },
        finalReady: false,
      };
    }

    const ruleSetVersion = await this.prisma.gameRuleSetVersion.findUniqueOrThrow({ where: { id: attempt.ruleSetVersionId } });
    const difficulty = attempt.difficultyId ? await this.prisma.gameDifficulty.findUnique({ where: { id: attempt.difficultyId } }) : null;
    const puzzleVersion = attempt.puzzleVersionId ? await this.prisma.puzzleVersion.findUnique({ where: { id: attempt.puzzleVersionId } }) : null;
    const adapter = this.registry.get(ruleSetVersion.engineKey);
    if (!adapter.verifySubmission) {
      throw new BadRequestException({ error: 'submission-type-not-supported', engineKey: adapter.engineKey });
    }

    const verdict = await adapter.verifySubmission({
      attempt, ruleSetVersion, difficulty, puzzleVersion,
      submissionType: args.submissionType, payload: args.payload, hints: args.hints,
    });

    const payloadHash = createHash('sha256').update(JSON.stringify(args.payload ?? {})).digest('hex');

    const sub = await this.prisma.gameSubmission.create({
      data: {
        attemptId: args.attemptId, userId: args.userId, gameId: attempt.gameId,
        playSessionId: args.playSessionId, submissionType: args.submissionType,
        idempotencyKey: args.idempotencyKey,
        roundIndex: args.hints?.roundIndex, regionId: args.hints?.regionId, seq: args.hints?.seq,
        payload: args.payload as any, payloadHash,
        validationPassed: verdict.accepted,
        validationResult: verdict.result as any,
        errorReason: verdict.reason,
      },
    });

    if (verdict.accepted) {
      const updates: any = {};
      if (verdict.metricsDelta) {
        const cur = (attempt.metricsSummary ?? {}) as Record<string, number>;
        const next = { ...cur };
        for (const [k, v] of Object.entries(verdict.metricsDelta)) {
          next[k] = (Number(next[k] ?? 0)) + v;
        }
        updates.metricsSummary = next;
      }
      if (Object.keys(updates).length > 0) {
        await this.prisma.gameAttempt.update({ where: { id: attempt.id }, data: updates });
      }
      if (verdict.snapshot) {
        await this.prisma.attemptSnapshot.create({
          data: {
            attemptId: attempt.id,
            seq: (args.hints?.seq ?? Date.now()),
            snapshotType: verdict.snapshot.type,
            state: verdict.snapshot.state as any,
            stateHash: createHash('sha256').update(JSON.stringify(verdict.snapshot.state ?? {})).digest('hex'),
            metadata: (verdict.snapshot.metadata ?? {}) as any,
          },
        });
      }
    }

    return {
      accepted: verdict.accepted,
      submission: {
        id: sub.id, validationPassed: verdict.accepted,
        result: verdict.result, errorReason: verdict.reason,
      },
      finalReady: !!verdict.finalReady,
    };
  }
}
