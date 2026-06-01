import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { GameAdapterRegistry } from '../game-adapter-registry.service';
import { PrismaService } from '../../database/prisma.service';
import type {
  GameRuntimeAdapter, StartAttemptInput, StartAttemptResult,
  FinishAttemptInput, FinishAttemptResult,
} from '../game-adapter.interface';

@Injectable()
export class AbsoluteCommandAdapter implements GameRuntimeAdapter, OnModuleInit {
  engineKey = 'absolute-command';

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
        size: content.size,
        startCoord: content.startCoord,
        cells: content.cells,
        optimalCommandCount: content.optimalCommandCount,
      },
      contentResolvedType: 'CURATED',
      puzzleId: puzzleVersion.puzzleId,
      puzzleVersionId: puzzleVersion.id,
      maxDurationMs: input.difficulty?.maxDurationMs ?? 60 * 60_000,
    };
  }

  async finishAttempt(input: FinishAttemptInput): Promise<FinishAttemptResult> {
    const submissions = await this.prisma.gameSubmission.findMany({
      where: { attemptId: input.attempt.id, submissionType: 'COMMAND', validationPassed: true },
    });
    const final = (input.finalState ?? {}) as { allRequiredVisited?: boolean; commandCount?: number };
    const passed = !!final.allRequiredVisited;
    const completedAt = new Date();
    const startedAt = input.attempt.playingAt ?? input.attempt.claimedAt ?? input.attempt.createdAt;
    const durationMs = startedAt ? completedAt.getTime() - new Date(startedAt).getTime() : 0;
    const commandCount = final.commandCount ?? submissions.length;
    return {
      passed,
      scoreValue: passed ? commandCount : undefined,
      durationMs,
      metrics: { commandCount, durationMs },
      antiCheatFlags: passed ? [] : ['NOT_ALL_REQUIRED_VISITED'],
      validatorKey: this.engineKey,
      validatorVersion: '1.0.0',
    };
  }


  async verifySubmission(input: any): Promise<any> {
    if (input.submissionType !== 'COMMAND') {
      return { accepted: false, reason: 'submission-type-not-supported', result: { accepted: ['COMMAND'] } };
    }
    const { direction, seq } = (input.payload ?? {}) as any;
    const validDirs = new Set(['X_POS','X_NEG','Y_POS','Y_NEG','Z_POS','Z_NEG']);
    if (!validDirs.has(direction)) {
      return { accepted: false, reason: 'invalid-direction', result: { direction } };
    }
    return {
      accepted: true,
      result: { direction, seq },
      metricsDelta: { commandCount: 1 },
      snapshot: { type: 'CHECKPOINT', state: { lastCommand: direction, seq }, metadata: {} },
    };
  }

  private async pickPuzzleVersion(input: StartAttemptInput) {
    const puzzles = await this.prisma.puzzle.findMany({
      where: { gameId: input.game.id, status: 'PUBLISHED' },
      include: { versions: { where: { status: 'PUBLISHED' }, take: 1 } },
    });
    const candidates = puzzles.filter((p) => p.versions.length > 0);
    if (candidates.length === 0) throw new NotFoundException(`No published absolute-command puzzle`);
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return pick.versions[0];
  }
}
