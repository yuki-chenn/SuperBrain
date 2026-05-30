import { z } from 'zod';

export const SlidingPuzzleStateSchema = z.object({
  size: z.number().int().positive(),
  board: z.array(z.number().int()),
});

export const StartAttemptRequestSchema = z.object({
  difficultyKey: z.string(),
});

export const StartAttemptResponseSchema = z.object({
  attemptId: z.string(),
  gameSlug: z.string(),
  difficultyKey: z.string(),
  seed: z.string(),
  initialState: SlidingPuzzleStateSchema,
  maxDurationMs: z.number().int().positive(),
  startedAt: z.string(),
});

export const FinishAttemptRequestSchema = z.object({
  finalState: SlidingPuzzleStateSchema,
  moveTrace: z.array(z.number().int().positive()),
  clientDurationMs: z.number().int().positive(),
});

export const FinishAttemptResponseSchema = z.object({
  attemptId: z.string(),
  status: z.enum(['COMPLETED', 'FAILED']),
  metrics: z.record(z.unknown()).optional(),
  leaderboardUpdated: z.boolean().optional(),
  personalBest: z.boolean().optional(),
  reason: z.string().optional(),
});
