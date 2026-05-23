import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  generateSlidingPuzzleInitialState,
  validateSlidingPuzzleAttempt,
} from '@brain-games/game-engine';
import {
  FinishAttemptRequestSchema,
  SLIDING_PUZZLE_DIFFICULTIES,
  MIN_DURATION_MS,
} from '@brain-games/shared';
import type {
  GameAdapter,
  StartAttemptInput,
  StartAttemptResult,
  FinishAttemptInput,
  FinishAttemptResult,
} from '../../games/game-adapter.interface';

@Injectable()
export class SlidingPuzzleAdapter implements GameAdapter {
  slug = 'sliding-puzzle';

  async startAttempt(input: StartAttemptInput): Promise<StartAttemptResult> {
    const difficulty = SLIDING_PUZZLE_DIFFICULTIES.find((d) => d.key === input.difficultyKey);
    if (!difficulty) throw new Error(`Invalid difficulty: ${input.difficultyKey}`);

    const seed = randomUUID();
    const state = generateSlidingPuzzleInitialState({
      size: difficulty.size,
      seed,
      scrambleMoves: difficulty.scrambleMoves,
    });

    return {
      seed,
      initialState: { size: state.size, board: state.board },
    };
  }

  async finishAttempt(input: FinishAttemptInput): Promise<FinishAttemptResult> {
    const payload = FinishAttemptRequestSchema.parse(input.payload);
    const difficulty = SLIDING_PUZZLE_DIFFICULTIES.find(
      (d) => d.key === input.attempt.difficultyKey,
    );
    if (!difficulty) return { valid: false, invalidReason: 'INVALID_DIFFICULTY' };

    const initialState = input.attempt.initialState as { size: number; board: number[] };

    // Validate structure and replay
    const validation = validateSlidingPuzzleAttempt({
      initialState,
      moveTrace: payload.moveTrace,
      finalState: payload.finalState,
      size: difficulty.size,
    });

    if (!validation.valid) {
      return { valid: false, invalidReason: validation.reason };
    }

    // Server-side timing (startedAt is set when countdown finishes via start-playing)
    const durationMs = input.completedAt.getTime() - input.attempt.startedAt.getTime();

    // Duration guards
    if (durationMs < MIN_DURATION_MS) {
      return { valid: false, invalidReason: 'SUSPICIOUS_DURATION' };
    }
    if (durationMs > difficulty.maxDurationMs) {
      return { valid: false, invalidReason: 'TIMEOUT' };
    }

    return {
      valid: true,
      finalState: payload.finalState,
      moveTrace: payload.moveTrace,
      metrics: {
        durationMs,
        moves: payload.moveTrace.length,
        size: difficulty.size,
      },
      rankValue: durationMs,
    };
  }
}
