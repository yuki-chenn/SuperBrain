import { z } from 'zod';
export declare const ChallengeModeSchema: z.ZodEnum<["RANKED", "DAILY", "CASUAL", "PRACTICE", "ROOM", "ADMIN_TEST"]>;
export type ChallengeMode = z.infer<typeof ChallengeModeSchema>;
export declare const AttemptStatusSchema: z.ZodEnum<["CREATED", "CLAIMED", "PLAYING", "PAUSED", "SUBMITTING", "COMPLETED", "ABANDONED", "TIMEOUT", "INTERRUPTED", "INVALIDATED", "REVIEW_REQUIRED", "REVOKED", "ADMIN_CORRECTED"]>;
export type AttemptStatus = z.infer<typeof AttemptStatusSchema>;
export declare const ChallengeInvalidReasonSchema: z.ZodEnum<["timeout", "invalid-token", "session-conflict", "tab-conflict", "no-entry-token", "browser-refresh", "policy-rejected", "admin-revoked"]>;
export declare const StartChallengeRequestSchema: z.ZodObject<{
    gameSlug: z.ZodString;
    mode: z.ZodEnum<["RANKED", "DAILY", "CASUAL", "PRACTICE", "ROOM", "ADMIN_TEST"]>;
    difficultyKey: z.ZodString;
    puzzleSlug: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    gameSlug: string;
    mode: "RANKED" | "DAILY" | "CASUAL" | "PRACTICE" | "ROOM" | "ADMIN_TEST";
    difficultyKey: string;
    puzzleSlug?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    gameSlug: string;
    mode: "RANKED" | "DAILY" | "CASUAL" | "PRACTICE" | "ROOM" | "ADMIN_TEST";
    difficultyKey: string;
    puzzleSlug?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
export declare const StartChallengeResponseSchema: z.ZodObject<{
    attemptId: z.ZodString;
    gameId: z.ZodOptional<z.ZodString>;
    mode: z.ZodEnum<["RANKED", "DAILY", "CASUAL", "PRACTICE", "ROOM", "ADMIN_TEST"]>;
    status: z.ZodEnum<["CREATED", "CLAIMED", "PLAYING", "PAUSED", "SUBMITTING", "COMPLETED", "ABANDONED", "TIMEOUT", "INTERRUPTED", "INVALIDATED", "REVIEW_REQUIRED", "REVOKED", "ADMIN_CORRECTED"]>;
    entryToken: z.ZodOptional<z.ZodString>;
    playSessionId: z.ZodString;
    seed: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    initialState: z.ZodUnknown;
    startedAt: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    playPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    mode: "RANKED" | "DAILY" | "CASUAL" | "PRACTICE" | "ROOM" | "ADMIN_TEST";
    attemptId: string;
    playSessionId: string;
    playPath: string;
    gameId?: string | undefined;
    entryToken?: string | undefined;
    seed?: string | null | undefined;
    initialState?: unknown;
    startedAt?: string | Date | null | undefined;
    expiresAt?: string | Date | null | undefined;
}, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    mode: "RANKED" | "DAILY" | "CASUAL" | "PRACTICE" | "ROOM" | "ADMIN_TEST";
    attemptId: string;
    playSessionId: string;
    playPath: string;
    gameId?: string | undefined;
    entryToken?: string | undefined;
    seed?: string | null | undefined;
    initialState?: unknown;
    startedAt?: string | Date | null | undefined;
    expiresAt?: string | Date | null | undefined;
}>;
export declare const ClaimChallengeRequestSchema: z.ZodObject<{
    entryToken: z.ZodString;
    playSessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    entryToken: string;
    playSessionId: string;
}, {
    entryToken: string;
    playSessionId: string;
}>;
export declare const ClaimChallengeResponseSchema: z.ZodObject<{
    canEnter: z.ZodBoolean;
    status: z.ZodEnum<["CREATED", "CLAIMED", "PLAYING", "PAUSED", "SUBMITTING", "COMPLETED", "ABANDONED", "TIMEOUT", "INTERRUPTED", "INVALIDATED", "REVIEW_REQUIRED", "REVOKED", "ADMIN_CORRECTED"]>;
    seed: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    initialState: z.ZodOptional<z.ZodUnknown>;
    startedAt: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    redirectTo: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    canEnter: boolean;
    seed?: string | null | undefined;
    initialState?: unknown;
    startedAt?: string | Date | null | undefined;
    expiresAt?: string | Date | null | undefined;
    redirectTo?: string | undefined;
    reason?: string | undefined;
}, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    canEnter: boolean;
    seed?: string | null | undefined;
    initialState?: unknown;
    startedAt?: string | Date | null | undefined;
    expiresAt?: string | Date | null | undefined;
    redirectTo?: string | undefined;
    reason?: string | undefined;
}>;
export declare const ChallengeHeartbeatRequestSchema: z.ZodObject<{
    playSessionId: z.ZodString;
    clientNow: z.ZodOptional<z.ZodString>;
    phase: z.ZodOptional<z.ZodEnum<["countdown", "playing", "submitting"]>>;
    localElapsedMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    playSessionId: string;
    clientNow?: string | undefined;
    phase?: "countdown" | "playing" | "submitting" | undefined;
    localElapsedMs?: number | undefined;
}, {
    playSessionId: string;
    clientNow?: string | undefined;
    phase?: "countdown" | "playing" | "submitting" | undefined;
    localElapsedMs?: number | undefined;
}>;
export declare const ChallengeHeartbeatResponseSchema: z.ZodObject<{
    accepted: z.ZodBoolean;
    serverNow: z.ZodString;
    status: z.ZodEnum<["CREATED", "CLAIMED", "PLAYING", "PAUSED", "SUBMITTING", "COMPLETED", "ABANDONED", "TIMEOUT", "INTERRUPTED", "INVALIDATED", "REVIEW_REQUIRED", "REVOKED", "ADMIN_CORRECTED"]>;
    remainingMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    accepted: boolean;
    serverNow: string;
    remainingMs: number;
}, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    accepted: boolean;
    serverNow: string;
    remainingMs: number;
}>;
export declare const AbandonChallengeRequestSchema: z.ZodObject<{
    playSessionId: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    playSessionId: string;
    reason: string;
}, {
    playSessionId: string;
    reason: string;
}>;
export declare const AbandonChallengeResponseSchema: z.ZodObject<{
    accepted: z.ZodBoolean;
    status: z.ZodEnum<["CREATED", "CLAIMED", "PLAYING", "PAUSED", "SUBMITTING", "COMPLETED", "ABANDONED", "TIMEOUT", "INTERRUPTED", "INVALIDATED", "REVIEW_REQUIRED", "REVOKED", "ADMIN_CORRECTED"]>;
}, "strip", z.ZodTypeAny, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    accepted: boolean;
}, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    accepted: boolean;
}>;
export declare const FinishChallengeRequestSchema: z.ZodObject<{
    playSessionId: z.ZodString;
    finalState: z.ZodUnknown;
    metrics: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    playSessionId: string;
    finalState?: unknown;
    metrics?: Record<string, unknown> | undefined;
}, {
    playSessionId: string;
    finalState?: unknown;
    metrics?: Record<string, unknown> | undefined;
}>;
export declare const FinishChallengeResponseSchema: z.ZodObject<{
    accepted: z.ZodBoolean;
    status: z.ZodEnum<["CREATED", "CLAIMED", "PLAYING", "PAUSED", "SUBMITTING", "COMPLETED", "ABANDONED", "TIMEOUT", "INTERRUPTED", "INVALIDATED", "REVIEW_REQUIRED", "REVOKED", "ADMIN_CORRECTED"]>;
    result: z.ZodObject<{
        success: z.ZodBoolean;
        score: z.ZodOptional<z.ZodNumber>;
        durationMs: z.ZodOptional<z.ZodNumber>;
        metrics: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        success: boolean;
        metrics?: Record<string, unknown> | undefined;
        score?: number | undefined;
        durationMs?: number | undefined;
    }, {
        success: boolean;
        metrics?: Record<string, unknown> | undefined;
        score?: number | undefined;
        durationMs?: number | undefined;
    }>;
    resultPath: z.ZodString;
    leaderboards: z.ZodArray<z.ZodObject<{
        leaderboardSlug: z.ZodString;
        recorded: z.ZodBoolean;
        currentRank: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        leaderboardSlug: string;
        recorded: boolean;
        currentRank?: number | undefined;
    }, {
        leaderboardSlug: string;
        recorded: boolean;
        currentRank?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    accepted: boolean;
    result: {
        success: boolean;
        metrics?: Record<string, unknown> | undefined;
        score?: number | undefined;
        durationMs?: number | undefined;
    };
    resultPath: string;
    leaderboards: {
        leaderboardSlug: string;
        recorded: boolean;
        currentRank?: number | undefined;
    }[];
}, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    accepted: boolean;
    result: {
        success: boolean;
        metrics?: Record<string, unknown> | undefined;
        score?: number | undefined;
        durationMs?: number | undefined;
    };
    resultPath: string;
    leaderboards: {
        leaderboardSlug: string;
        recorded: boolean;
        currentRank?: number | undefined;
    }[];
}>;
export declare const ChallengeStatusResponseSchema: z.ZodObject<{
    attemptId: z.ZodString;
    mode: z.ZodEnum<["RANKED", "DAILY", "CASUAL", "PRACTICE", "ROOM", "ADMIN_TEST"]>;
    status: z.ZodEnum<["CREATED", "CLAIMED", "PLAYING", "PAUSED", "SUBMITTING", "COMPLETED", "ABANDONED", "TIMEOUT", "INTERRUPTED", "INVALIDATED", "REVIEW_REQUIRED", "REVOKED", "ADMIN_CORRECTED"]>;
    startedAt: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    completedAt: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    resultPath: z.ZodOptional<z.ZodString>;
    expiredPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    mode: "RANKED" | "DAILY" | "CASUAL" | "PRACTICE" | "ROOM" | "ADMIN_TEST";
    attemptId: string;
    startedAt?: string | Date | null | undefined;
    expiresAt?: string | Date | null | undefined;
    resultPath?: string | undefined;
    completedAt?: string | Date | null | undefined;
    expiredPath?: string | undefined;
}, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    mode: "RANKED" | "DAILY" | "CASUAL" | "PRACTICE" | "ROOM" | "ADMIN_TEST";
    attemptId: string;
    startedAt?: string | Date | null | undefined;
    expiresAt?: string | Date | null | undefined;
    resultPath?: string | undefined;
    completedAt?: string | Date | null | undefined;
    expiredPath?: string | undefined;
}>;
export declare const StartAttemptRequestSchema: z.ZodObject<{
    gameSlug: z.ZodString;
    mode: z.ZodEnum<["RANKED", "DAILY", "CASUAL", "PRACTICE", "ROOM", "ADMIN_TEST"]>;
    difficultyKey: z.ZodString;
    puzzleSlug: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    gameSlug: string;
    mode: "RANKED" | "DAILY" | "CASUAL" | "PRACTICE" | "ROOM" | "ADMIN_TEST";
    difficultyKey: string;
    puzzleSlug?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    gameSlug: string;
    mode: "RANKED" | "DAILY" | "CASUAL" | "PRACTICE" | "ROOM" | "ADMIN_TEST";
    difficultyKey: string;
    puzzleSlug?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
export declare const StartAttemptResponseSchema: z.ZodObject<{
    attemptId: z.ZodString;
    gameId: z.ZodOptional<z.ZodString>;
    mode: z.ZodEnum<["RANKED", "DAILY", "CASUAL", "PRACTICE", "ROOM", "ADMIN_TEST"]>;
    status: z.ZodEnum<["CREATED", "CLAIMED", "PLAYING", "PAUSED", "SUBMITTING", "COMPLETED", "ABANDONED", "TIMEOUT", "INTERRUPTED", "INVALIDATED", "REVIEW_REQUIRED", "REVOKED", "ADMIN_CORRECTED"]>;
    entryToken: z.ZodOptional<z.ZodString>;
    playSessionId: z.ZodString;
    seed: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    initialState: z.ZodUnknown;
    startedAt: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    playPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    mode: "RANKED" | "DAILY" | "CASUAL" | "PRACTICE" | "ROOM" | "ADMIN_TEST";
    attemptId: string;
    playSessionId: string;
    playPath: string;
    gameId?: string | undefined;
    entryToken?: string | undefined;
    seed?: string | null | undefined;
    initialState?: unknown;
    startedAt?: string | Date | null | undefined;
    expiresAt?: string | Date | null | undefined;
}, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    mode: "RANKED" | "DAILY" | "CASUAL" | "PRACTICE" | "ROOM" | "ADMIN_TEST";
    attemptId: string;
    playSessionId: string;
    playPath: string;
    gameId?: string | undefined;
    entryToken?: string | undefined;
    seed?: string | null | undefined;
    initialState?: unknown;
    startedAt?: string | Date | null | undefined;
    expiresAt?: string | Date | null | undefined;
}>;
export declare const FinishAttemptRequestSchema: z.ZodObject<{
    playSessionId: z.ZodString;
    finalState: z.ZodUnknown;
    metrics: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    playSessionId: string;
    finalState?: unknown;
    metrics?: Record<string, unknown> | undefined;
}, {
    playSessionId: string;
    finalState?: unknown;
    metrics?: Record<string, unknown> | undefined;
}>;
export declare const FinishAttemptResponseSchema: z.ZodObject<{
    accepted: z.ZodBoolean;
    status: z.ZodEnum<["CREATED", "CLAIMED", "PLAYING", "PAUSED", "SUBMITTING", "COMPLETED", "ABANDONED", "TIMEOUT", "INTERRUPTED", "INVALIDATED", "REVIEW_REQUIRED", "REVOKED", "ADMIN_CORRECTED"]>;
    result: z.ZodObject<{
        success: z.ZodBoolean;
        score: z.ZodOptional<z.ZodNumber>;
        durationMs: z.ZodOptional<z.ZodNumber>;
        metrics: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        success: boolean;
        metrics?: Record<string, unknown> | undefined;
        score?: number | undefined;
        durationMs?: number | undefined;
    }, {
        success: boolean;
        metrics?: Record<string, unknown> | undefined;
        score?: number | undefined;
        durationMs?: number | undefined;
    }>;
    resultPath: z.ZodString;
    leaderboards: z.ZodArray<z.ZodObject<{
        leaderboardSlug: z.ZodString;
        recorded: z.ZodBoolean;
        currentRank: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        leaderboardSlug: string;
        recorded: boolean;
        currentRank?: number | undefined;
    }, {
        leaderboardSlug: string;
        recorded: boolean;
        currentRank?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    accepted: boolean;
    result: {
        success: boolean;
        metrics?: Record<string, unknown> | undefined;
        score?: number | undefined;
        durationMs?: number | undefined;
    };
    resultPath: string;
    leaderboards: {
        leaderboardSlug: string;
        recorded: boolean;
        currentRank?: number | undefined;
    }[];
}, {
    status: "CREATED" | "CLAIMED" | "PLAYING" | "PAUSED" | "SUBMITTING" | "COMPLETED" | "ABANDONED" | "TIMEOUT" | "INTERRUPTED" | "INVALIDATED" | "REVIEW_REQUIRED" | "REVOKED" | "ADMIN_CORRECTED";
    accepted: boolean;
    result: {
        success: boolean;
        metrics?: Record<string, unknown> | undefined;
        score?: number | undefined;
        durationMs?: number | undefined;
    };
    resultPath: string;
    leaderboards: {
        leaderboardSlug: string;
        recorded: boolean;
        currentRank?: number | undefined;
    }[];
}>;
export declare const SlidingPuzzleStateSchema: z.ZodObject<{
    size: z.ZodNumber;
    board: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    size: number;
    board: number[];
}, {
    size: number;
    board: number[];
}>;
//# sourceMappingURL=attempts.d.ts.map