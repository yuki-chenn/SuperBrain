import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { GameAdapterRegistry } from '../game-adapter-registry.service';
import { PrismaService } from '../../database/prisma.service';
import type {
  GameRuntimeAdapter, StartAttemptInput, StartAttemptResult,
  FinishAttemptInput, FinishAttemptResult,
} from '../game-adapter.interface';

@Injectable()
export class PreciseCharacterBuildingAdapter implements GameRuntimeAdapter, OnModuleInit {
  engineKey = 'precise-character-building';

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
        engine: this.engineKey,
        boardSize: content.boardSize,
        radicalPool: content.radicalPool,
        cells: content.cells,
        runtimeConfig: content.runtimeConfig,
      },
      contentResolvedType: 'CURATED',
      puzzleId: puzzleVersion.puzzleId,
      puzzleVersionId: puzzleVersion.id,
      maxDurationMs: input.difficulty?.maxDurationMs ?? 25 * 60_000,
    };
  }

  async finishAttempt(input: FinishAttemptInput): Promise<FinishAttemptResult> {
    const submissions = await this.prisma.gameSubmission.findMany({
      where: { attemptId: input.attempt.id, submissionType: 'ROUND', validationPassed: true },
    });
    const content = (input.puzzleVersion?.content ?? {}) as any;
    const requiredRounds = (content.solutionRounds ?? []).length;
    const passed = requiredRounds > 0 && submissions.length >= requiredRounds;
    const completedAt = new Date();
    const startedAt = input.attempt.playingAt ?? input.attempt.claimedAt ?? input.attempt.createdAt;
    const durationMs = startedAt ? completedAt.getTime() - new Date(startedAt).getTime() : 0;
    return {
      passed,
      scoreValue: passed ? durationMs : undefined,
      durationMs,
      metrics: { roundsCompleted: submissions.length, roundsTotal: requiredRounds },
      antiCheatFlags: passed ? [] : ['INCOMPLETE_ROUNDS'],
      validatorKey: this.engineKey,
      validatorVersion: '1.0.0',
    };
  }


  async verifySubmission(input: any): Promise<any> {
    if (input.submissionType !== 'ROUND') {
      return { accepted: false, reason: 'submission-type-not-supported', result: { accepted: ['ROUND'] } };
    }
    const content = (input.puzzleVersion?.content ?? {}) as any;
    const { roundIndex, radicalKeys, cellPath } = (input.payload ?? {}) as any;
    const expected = (content.solutionRounds ?? []).find((r: any) => r.roundIndex === roundIndex);
    if (!expected) return { accepted: false, reason: 'invalid-round-index', result: { roundIndex } };
    const radicalsMatch = JSON.stringify(radicalKeys) === JSON.stringify(expected.radicalKeys);
    const pathMatch = JSON.stringify(cellPath) === JSON.stringify(expected.path);
    const accepted = radicalsMatch && pathMatch;
    const totalRounds = (content.solutionRounds ?? []).length;
    return {
      accepted,
      result: { roundIndex, radicalsMatch, pathMatch, totalRounds },
      metricsDelta: accepted ? { roundsCompleted: 1 } : { errorCount: 1 },
      finalReady: accepted && (input.attempt.metricsSummary?.roundsCompleted ?? 0) + 1 >= totalRounds,
    };
  }

  private async pickPuzzleVersion(input: StartAttemptInput) {
    const puzzles = await this.prisma.puzzle.findMany({
      where: { gameId: input.game.id, status: 'PUBLISHED', difficultyId: input.difficulty?.id },
      include: { versions: { where: { status: 'PUBLISHED' }, take: 1 } },
    });
    const candidates = puzzles.filter((p) => p.versions.length > 0);
    if (candidates.length === 0) throw new NotFoundException(`No published PCB puzzle for difficulty ${input.difficulty?.key}`);
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return pick.versions[0];
  }
}
