import { Injectable, OnModuleInit } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import {
  generateSlidingPuzzleInitialState,
  validateSlidingPuzzleAttempt,
} from '@brain-games/game-engine';
import { GameAdapterRegistry } from '../game-adapter-registry.service';
import type {
  GameRuntimeAdapter, StartAttemptInput, StartAttemptResult,
  FinishAttemptInput, FinishAttemptResult,
} from '../game-adapter.interface';

@Injectable()
export class SlidingPuzzleAdapter implements GameRuntimeAdapter, OnModuleInit {
  engineKey = 'sliding-puzzle';

  constructor(private registry: GameAdapterRegistry) {}

  onModuleInit() { this.registry.register(this); }

  async startAttempt(input: StartAttemptInput): Promise<StartAttemptResult> {
    const cfg = (input.difficulty?.config ?? {}) as { size?: number; scrambleMoves?: number };
    const size = cfg.size ?? 4;
    const scrambleMoves = cfg.scrambleMoves ?? 160;
    const seed = randomUUID();
    const state = generateSlidingPuzzleInitialState({ size, seed, scrambleMoves });
    const initialState = { size: state.size, board: state.board };
    const generatedContentHash = createHash('sha256')
      .update(JSON.stringify({ engineKey: this.engineKey, seed, initialState }))
      .digest('hex');
    return {
      seed, initialState,
      contentResolvedType: 'GENERATED',
      generatedContentHash,
      maxDurationMs: input.difficulty?.maxDurationMs ?? 20 * 60_000,
    };
  }

  async finishAttempt(input: FinishAttemptInput): Promise<FinishAttemptResult> {
    const final = input.finalState as {
      size: number;
      board: number[];
      initialBoard?: number[];
      initialState?: { size: number; board: number[] };
      moveTrace?: number[];
    };
    const moveTrace = final.moveTrace ?? [];
    const size = final.size;
    // Initial state may come from final.initialState, final.initialBoard, or attempt.policySnapshot
    const initialBoard = final.initialState?.board ?? final.initialBoard ?? (input.attempt.policySnapshot as any)?.initialState?.board;
    if (!initialBoard) {
      return {
        passed: false, metrics: {},
        antiCheatFlags: ['MISSING_INITIAL_STATE'],
        validatorKey: this.engineKey, validatorVersion: '1.0.0',
      };
    }
    const validation = validateSlidingPuzzleAttempt({
      initialState: { size, board: initialBoard },
      finalState: { size, board: final.board },
      moveTrace, size,
    });
    const completedAt = new Date();
    const startedAt = input.attempt.playingAt ?? input.attempt.claimedAt ?? input.attempt.startedAt ?? input.attempt.createdAt;
    const durationMs = startedAt ? completedAt.getTime() - new Date(startedAt).getTime() : 0;
    return {
      passed: validation.valid,
      scoreValue: validation.valid ? durationMs : undefined,
      durationMs,
      metrics: { moves: moveTrace.length, ...(validation as any).metrics ?? {} },
      antiCheatFlags: validation.valid ? [] : [(validation as any).reason ?? 'INVALID'],
      validatorKey: this.engineKey,
      validatorVersion: '1.0.0',
    };
  }

  async verifySubmission(input: any): Promise<any> {
    if (input.submissionType !== 'FINAL') {
      return { accepted: false, reason: 'submission-type-not-supported', result: { accepted: ['FINAL'] } };
    }
    return { accepted: true, result: {}, finalReady: true };
  }

}
