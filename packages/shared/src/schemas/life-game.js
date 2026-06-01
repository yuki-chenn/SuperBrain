import { z } from 'zod';
export const LocalCellCoordSchema = z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
});
export const LifeBoardStateSchema = z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    aliveCells: z.array(z.object({ x: z.number().int(), y: z.number().int() })),
});
export const LifeBoundaryRuleSchema = z.object({
    wrapX: z.boolean(),
    wrapY: z.boolean(),
});
export const StartLifeAttemptResponseSchema = z.object({
    attemptId: z.string(),
    gameSlug: z.string(),
    difficultyKey: z.string(),
    seed: z.string(),
    initialState: LifeBoardStateSchema,
    maxDurationMs: z.number().int().positive(),
    targetRegionIds: z.array(z.number().int()),
    boundary: LifeBoundaryRuleSchema,
    width: z.number().int(),
    height: z.number().int(),
    startedAt: z.string(),
});
export const SubmitLifeRegionRequestSchema = z.object({
    aliveCells: z.array(LocalCellCoordSchema),
});
export const SubmitLifeRegionResponseSchema = z.object({
    regionId: z.number().int(),
    correct: z.boolean(),
    errorCount: z.number().int(),
    correctRegionIds: z.array(z.number().int()),
    attemptCompleted: z.boolean(),
    result: z.object({
        durationMs: z.number().int(),
        errorCount: z.number().int(),
        targetRegionCount: z.number().int(),
        rank: z.number().int().optional(),
        personalBest: z.boolean(),
    }).optional(),
});
export const GetLifeAttemptResponseSchema = z.object({
    attemptId: z.string(),
    status: z.enum(['STARTED', 'COMPLETED', 'FAILED']),
    difficultyKey: z.string(),
    width: z.number().int(),
    height: z.number().int(),
    boundary: LifeBoundaryRuleSchema,
    initialState: LifeBoardStateSchema,
    targetRegionIds: z.array(z.number().int()),
    correctRegionIds: z.array(z.number().int()),
    errorCount: z.number().int(),
    maxDurationMs: z.number().int().positive(),
    startedAt: z.string(),
    completedAt: z.string().optional(),
    submissions: z.array(z.object({
        regionId: z.number().int(),
        submittedAt: z.string(),
        correct: z.boolean(),
    })),
    metrics: z.object({
        durationMs: z.number().int(),
        errorCount: z.number().int(),
        targetRegionCount: z.number().int(),
    }).optional(),
});
export const AbandonLifeAttemptResponseSchema = z.object({
    success: z.boolean(),
});
//# sourceMappingURL=life-game.js.map