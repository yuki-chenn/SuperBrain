import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { GameAdapterRegistry } from '../game-adapter-registry.service';
import { PrismaService } from '../../database/prisma.service';
import type {
  GameRuntimeAdapter, StartAttemptInput, StartAttemptResult,
  FinishAttemptInput, FinishAttemptResult,
} from '../game-adapter.interface';

/**
 * Life-game adapter (Change 3): selects a published puzzle version for the
 * difficulty, exposes initialState (alive cells + boundary). finishAttempt
 * tallies submitted regions; full per-region verification is in Change 7.
 */
@Injectable()
export class LifeGameAdapter implements GameRuntimeAdapter, OnModuleInit {
  engineKey = 'life-game';

  constructor(
    private registry: GameAdapterRegistry,
    private prisma: PrismaService,
  ) {}

  onModuleInit() { this.registry.register(this); }

  async startAttempt(input: StartAttemptInput): Promise<StartAttemptResult> {
    const puzzleVersion = await this.pickPuzzleVersion(input);
    const content = puzzleVersion.content as any;
    return {
      initialState: {
        engine: 'life-game',
        width: content.width, height: content.height,
        boundary: content.boundary,
        initialState: content.initialState,
        targetRegionIds: content.targetRegionIds,
      },
      contentResolvedType: 'CURATED',
      puzzleId: puzzleVersion.puzzleId,
      puzzleVersionId: puzzleVersion.id,
      maxDurationMs: input.difficulty?.maxDurationMs ?? 20 * 60_000,
    };
  }

  async finishAttempt(input: FinishAttemptInput): Promise<FinishAttemptResult> {
    const submissions = await this.prisma.gameSubmission.findMany({
      where: { attemptId: input.attempt.id, submissionType: 'REGION', validationPassed: true },
      orderBy: { submittedAt: 'asc' },
    });
    const content = (input.puzzleVersion?.content ?? {}) as any;
    const requiredCount = (content.targetRegionIds ?? []).length;
    const passed = requiredCount > 0 && submissions.length >= requiredCount;
    const completedAt = new Date();
    const startedAt = input.attempt.playingAt ?? input.attempt.claimedAt ?? input.attempt.createdAt;
    const durationMs = startedAt ? completedAt.getTime() - new Date(startedAt).getTime() : 0;
    return {
      passed,
      scoreValue: passed ? durationMs : undefined,
      durationMs,
      metrics: { regionsCorrect: submissions.length, regionsTotal: requiredCount },
      antiCheatFlags: passed ? [] : ['INCOMPLETE_REGIONS'],
      validatorKey: this.engineKey,
      validatorVersion: '1.0.0',
    };
  }


  async verifySubmission(input: any): Promise<any> {
    if (input.submissionType !== 'REGION') {
      return { accepted: false, reason: 'submission-type-not-supported', result: { accepted: ['REGION'] } };
    }
    const content = (input.puzzleVersion?.content ?? {}) as any;
    const { regionId, predictedAliveCells } = (input.payload ?? {}) as any;
    const target = (content.targetAnswers ?? []).find((t: any) => t.regionId === regionId);
    if (!target) return { accepted: false, reason: 'unknown-region', result: { regionId } };
    const expected = new Set(target.aliveCells.map((c: any) => `${c.x},${c.y}`));
    const provided = new Set(((predictedAliveCells ?? []) as any[]).map((c: any) => `${c.x},${c.y}`));
    const correct = expected.size === provided.size && Array.from(expected).every((k) => provided.has(k as string));
    const accepted = correct;
    const requiredRegions: number[] = content.targetRegionIds ?? [];
    return {
      accepted,
      result: { regionId, expectedCount: expected.size, providedCount: provided.size, correct },
      metricsDelta: accepted ? { regionsCorrect: 1 } : { errorCount: 1 },
      finalReady: accepted && requiredRegions.length === 1,
    };
  }

  private async pickPuzzleVersion(input: StartAttemptInput) {
    const puzzles = await this.prisma.puzzle.findMany({
      where: {
        gameId: input.game.id,
        status: 'PUBLISHED',
        difficultyId: input.difficulty?.id,
      },
      include: { versions: { where: { status: 'PUBLISHED' }, take: 1 } },
    });
    const candidates = puzzles.filter((p) => p.versions.length > 0);
    if (candidates.length === 0) throw new NotFoundException(`No published life-game puzzle for difficulty ${input.difficulty?.key}`);
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return pick.versions[0];
  }
}
