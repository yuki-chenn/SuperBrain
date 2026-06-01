import { z } from 'zod';

export const ChallengeModeSchema = z.enum(['RANKED', 'DAILY', 'CASUAL', 'PRACTICE', 'ROOM', 'ADMIN_TEST']);
export type ChallengeMode = z.infer<typeof ChallengeModeSchema>;

export const AttemptStatusSchema = z.enum([
  'CREATED', 'CLAIMED', 'PLAYING', 'PAUSED', 'SUBMITTING',
  'COMPLETED', 'ABANDONED', 'TIMEOUT', 'INTERRUPTED', 'INVALIDATED',
  'REVIEW_REQUIRED', 'REVOKED', 'ADMIN_CORRECTED',
]);
export type AttemptStatus = z.infer<typeof AttemptStatusSchema>;

export const ChallengeInvalidReasonSchema = z.enum([
  'timeout', 'invalid-token', 'session-conflict', 'tab-conflict',
  'no-entry-token', 'browser-refresh', 'policy-rejected', 'admin-revoked',
]);

export const StartChallengeRequestSchema = z.object({
  gameSlug: z.string(),
  mode: ChallengeModeSchema,
  difficultyKey: z.string(),
  puzzleSlug: z.string().optional(),
  idempotencyKey: z.string().optional(),
});
export const StartChallengeResponseSchema = z.object({
  attemptId: z.string(),
  gameId: z.string().optional(),
  mode: ChallengeModeSchema,
  status: AttemptStatusSchema,
  entryToken: z.string().optional(),
  playSessionId: z.string(),
  seed: z.string().nullable().optional(),
  initialState: z.unknown(),
  startedAt: z.string().or(z.date()).nullable().optional(),
  expiresAt: z.string().or(z.date()).nullable().optional(),
  playPath: z.string(),
});

export const ClaimChallengeRequestSchema = z.object({
  entryToken: z.string(),
  playSessionId: z.string(),
});
export const ClaimChallengeResponseSchema = z.object({
  canEnter: z.boolean(),
  status: AttemptStatusSchema,
  seed: z.string().nullable().optional(),
  initialState: z.unknown().optional(),
  startedAt: z.string().or(z.date()).nullable().optional(),
  expiresAt: z.string().or(z.date()).nullable().optional(),
  redirectTo: z.string().optional(),
  reason: z.string().optional(),
});

export const ChallengeHeartbeatRequestSchema = z.object({
  playSessionId: z.string(),
  clientNow: z.string().optional(),
  phase: z.enum(['countdown', 'playing', 'submitting']).optional(),
  localElapsedMs: z.number().optional(),
});
export const ChallengeHeartbeatResponseSchema = z.object({
  accepted: z.boolean(),
  serverNow: z.string(),
  status: AttemptStatusSchema,
  remainingMs: z.number(),
});

export const AbandonChallengeRequestSchema = z.object({
  playSessionId: z.string(),
  reason: z.string(),
});
export const AbandonChallengeResponseSchema = z.object({
  accepted: z.boolean(),
  status: AttemptStatusSchema,
});

export const FinishChallengeRequestSchema = z.object({
  playSessionId: z.string(),
  finalState: z.unknown(),
  metrics: z.record(z.unknown()).optional(),
});
export const FinishChallengeResponseSchema = z.object({
  accepted: z.boolean(),
  status: AttemptStatusSchema,
  result: z.object({
    success: z.boolean(),
    score: z.number().optional(),
    durationMs: z.number().optional(),
    metrics: z.record(z.unknown()).optional(),
  }),
  resultPath: z.string(),
  leaderboards: z.array(z.object({
    leaderboardSlug: z.string(),
    recorded: z.boolean(),
    currentRank: z.number().optional(),
  })),
});

export const ChallengeStatusResponseSchema = z.object({
  attemptId: z.string(),
  mode: ChallengeModeSchema,
  status: AttemptStatusSchema,
  startedAt: z.string().or(z.date()).nullable().optional(),
  completedAt: z.string().or(z.date()).nullable().optional(),
  expiresAt: z.string().or(z.date()).nullable().optional(),
  resultPath: z.string().optional(),
  expiredPath: z.string().optional(),
});

// Legacy aliases (will be removed in Change 7)
export const StartAttemptRequestSchema = StartChallengeRequestSchema;
export const StartAttemptResponseSchema = StartChallengeResponseSchema;
export const FinishAttemptRequestSchema = FinishChallengeRequestSchema;
export const FinishAttemptResponseSchema = FinishChallengeResponseSchema;

// Sliding-puzzle state shape (used by web)
export const SlidingPuzzleStateSchema = z.object({
  size: z.number().int().positive(),
  board: z.array(z.number().int()),
});
