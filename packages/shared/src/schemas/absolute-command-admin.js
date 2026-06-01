import { z } from 'zod';
import { MazeCoordSchema, AbsoluteCommandDirectionSchema, AbsoluteCommandCellSchema, } from './absolute-command.js';
// ─── Admin Request Schemas ──────────────────────────────────────────
export const AdminCreateACPuzzleSchema = z.object({
    title: z.string().min(1).max(200),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    description: z.string().optional(),
    difficultyLabel: z.enum(['入门', '标准', '困难', '专家']).optional(),
    season: z.number().int().min(1).optional(),
    episode: z.number().int().min(1).optional(),
    source: z.string().optional(),
    estimatedDuration: z.string().optional(),
    optimalCommandCount: z.number().int().min(1).optional(),
    maxDurationMs: z.number().int().min(60000).optional(),
});
export const AdminUpdateACPuzzleSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
    description: z.string().optional(),
    difficultyLabel: z.enum(['入门', '标准', '困难', '专家']).optional(),
    season: z.number().int().min(1).optional(),
    episode: z.number().int().min(1).optional(),
    source: z.string().optional(),
    estimatedDuration: z.string().optional(),
    optimalCommandCount: z.number().int().min(1).optional(),
    maxDurationMs: z.number().int().min(60000).optional(),
});
export const AdminSaveMazeVersionSchema = z.object({
    size: z.object({ width: z.number().int().min(1).max(10), height: z.number().int().min(1).max(10), depth: z.number().int().min(1).max(5) }).optional(),
    cells: z.array(AbsoluteCommandCellSchema),
    startCoord: MazeCoordSchema,
    referenceSolution: z.array(AbsoluteCommandDirectionSchema).optional(),
});
export const AdminListACPuzzlesQuerySchema = z.object({
    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
    difficultyLabel: z.string().optional(),
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
});
// ─── Admin Response Schemas ─────────────────────────────────────────
export const AdminACPuzzleVersionSchema = z.object({
    id: z.string(),
    version: z.number().int(),
    size: z.object({ width: z.number(), height: z.number(), depth: z.number() }),
    startCoord: MazeCoordSchema,
    cells: z.array(AbsoluteCommandCellSchema),
    referenceSolution: z.array(AbsoluteCommandDirectionSchema).optional(),
    validationStatus: z.enum(['UNVALIDATED', 'VALID', 'INVALID']),
    validationReport: z.any(),
    createdByUserId: z.string().optional(),
    createdAt: z.string(),
});
export const AdminACPuzzleListItemSchema = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    difficultyLabel: z.string().optional(),
    status: z.string(),
    mazeSize: z.object({ width: z.number(), height: z.number(), depth: z.number() }),
    publishedAt: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    versionCount: z.number().int(),
    attemptCount: z.number().int(),
});
export const AdminListACPuzzlesResponseSchema = z.object({
    items: z.array(AdminACPuzzleListItemSchema),
    total: z.number().int(),
});
export const AdminACPuzzleDetailSchema = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    difficultyLabel: z.string().optional(),
    status: z.string(),
    maxDurationMs: z.number().int(),
    currentVersionId: z.string().optional(),
    publishedAt: z.string().optional(),
    createdByUserId: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    versions: z.array(AdminACPuzzleVersionSchema),
    attemptCount: z.number().int(),
    completedCount: z.number().int(),
});
export const AdminValidatePuzzleResponseSchema = z.object({
    valid: z.boolean(),
    errors: z.array(z.object({
        code: z.string(),
        message: z.string(),
        coord: MazeCoordSchema.optional(),
    })),
    warnings: z.array(z.object({
        code: z.string(),
        message: z.string(),
        coord: MazeCoordSchema.optional(),
    })),
    referenceSolutionResult: z.object({
        completed: z.boolean(),
        commandCount: z.number().int(),
        visitedCellCount: z.number().int(),
        requiredVisitCellCount: z.number().int(),
    }).optional(),
});
export const AdminACPuzzleAttemptSchema = z.object({
    id: z.string(),
    userId: z.string(),
    username: z.string(),
    status: z.string(),
    startedAt: z.string(),
    completedAt: z.string().optional(),
    metrics: z.any(),
    rankValue: z.any(),
});
export const AdminListAttemptsResponseSchema = z.object({
    items: z.array(AdminACPuzzleAttemptSchema),
    total: z.number().int(),
});
export const AdminAttemptReplaySchema = z.object({
    id: z.string(),
    userId: z.string(),
    username: z.string(),
    status: z.string(),
    startedAt: z.string(),
    completedAt: z.string().optional(),
    metrics: z.any(),
    puzzleSnapshot: z.any(),
    runtimeState: z.any(),
    commandLogs: z.array(z.object({
        id: z.string(),
        index: z.number().int(),
        direction: z.string(),
        fromCoord: z.any(),
        toCoord: z.any(),
        path: z.any(),
        stopReason: z.string(),
        changedCells: z.any(),
        createdAt: z.string(),
    })),
});
export const AdminLeaderboardItemSchema = z.object({
    rank: z.number().int(),
    user: z.object({
        id: z.string(),
        username: z.string(),
        avatarUrl: z.string().optional(),
    }),
    commandCount: z.number().int(),
    durationMs: z.number(),
    travelDistance: z.number().int(),
    completedAt: z.string(),
});
export const AdminPuzzleLeaderboardResponseSchema = z.object({
    puzzle: z.object({
        id: z.string(),
        title: z.string(),
        slug: z.string(),
    }),
    items: z.array(AdminLeaderboardItemSchema),
    total: z.number().int(),
});
//# sourceMappingURL=absolute-command-admin.js.map