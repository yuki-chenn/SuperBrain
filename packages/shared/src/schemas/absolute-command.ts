import { z } from 'zod';

export const MazeCoordSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  z: z.number().int().min(0),
});

export const AbsoluteCommandDirectionSchema = z.enum([
  'X_POS', 'X_NEG', 'Y_POS', 'Y_NEG', 'Z_POS', 'Z_NEG',
]);

export const AbsoluteCommandCellTypeSchema = z.enum([
  'NORMAL', 'YELLOW_STOP', 'NUMBER', 'INITIAL_RED', 'DISABLED', 'START',
]);

export const AbsoluteCommandCellSchema = z.object({
  coord: MazeCoordSchema,
  type: AbsoluteCommandCellTypeSchema,
  requiredPasses: z.number().int().min(1).optional(),
  label: z.string().optional(),
  adminNote: z.string().optional(),
});

export const AbsoluteCommandNumberStateSchema = z.object({
  coord: MazeCoordSchema,
  requiredPasses: z.number().int().min(1),
  remainingPasses: z.number().int().min(0),
});

export const AbsoluteCommandHistoryItemSchema = z.object({
  index: z.number().int().min(0),
  direction: AbsoluteCommandDirectionSchema,
  from: MazeCoordSchema,
  to: MazeCoordSchema,
  path: z.array(MazeCoordSchema),
  stopReason: z.enum(['BOUNDARY', 'DISABLED', 'RED_BLOCK', 'YELLOW_STOP']),
  changedNumberCells: z.array(z.object({
    coord: MazeCoordSchema,
    beforeRemaining: z.number().int(),
    afterRemaining: z.number().int(),
    becameRed: z.boolean(),
  })),
  snapshotBefore: z.any(),
  snapshotAfter: z.any(),
  createdAt: z.string(),
});

export const AbsoluteCommandRuntimeStateSchema = z.object({
  position: MazeCoordSchema,
  visitedCells: z.array(z.string()),
  redCells: z.array(z.string()),
  numberStates: z.array(AbsoluteCommandNumberStateSchema),
  commandCount: z.number().int().min(0),
  travelDistance: z.number().int().min(0),
  commandHistory: z.array(AbsoluteCommandHistoryItemSchema),
  completed: z.boolean(),
});

// ─── API Request/Response schemas ───────────────────────────────────

export const StartAbsoluteCommandAttemptResponseSchema = z.object({
  attemptId: z.string(),
  puzzle: z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    version: z.number().int(),
    size: z.object({ width: z.number(), height: z.number(), depth: z.number() }),
    startCoord: MazeCoordSchema,
    cells: z.array(AbsoluteCommandCellSchema),
  }),
  state: AbsoluteCommandRuntimeStateSchema,
  startedAt: z.string(),
});

export const ExecuteAbsoluteCommandRequestSchema = z.object({
  direction: AbsoluteCommandDirectionSchema,
});

export const ExecuteAbsoluteCommandResponseSchema = z.object({
  moved: z.boolean(),
  invalidReason: z.enum(['NO_MOVEMENT', 'ATTEMPT_NOT_ACTIVE']).optional(),
  state: AbsoluteCommandRuntimeStateSchema,
  commandResult: z.object({
    direction: AbsoluteCommandDirectionSchema,
    from: MazeCoordSchema,
    to: MazeCoordSchema,
    path: z.array(MazeCoordSchema),
    stopReason: z.enum(['BOUNDARY', 'DISABLED', 'RED_BLOCK', 'YELLOW_STOP']),
    commandCount: z.number().int(),
    travelDistanceDelta: z.number().int(),
  }).optional(),
  completed: z.boolean(),
  result: z.object({
    commandCount: z.number().int(),
    durationMs: z.number(),
    travelDistance: z.number().int(),
    rank: z.number().int().optional(),
    personalBest: z.boolean(),
  }).optional(),
});

export const UndoAbsoluteCommandResponseSchema = z.object({
  success: z.boolean(),
  state: AbsoluteCommandRuntimeStateSchema,
});

export const ResetAbsoluteCommandResponseSchema = z.object({
  success: z.boolean(),
  state: AbsoluteCommandRuntimeStateSchema,
});

export const GetAbsoluteCommandAttemptResponseSchema = z.object({
  attemptId: z.string(),
  status: z.enum(['STARTED', 'COMPLETED', 'FAILED']),
  puzzle: z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    version: z.number().int(),
    size: z.object({ width: z.number(), height: z.number(), depth: z.number() }),
    startCoord: MazeCoordSchema,
    cells: z.array(AbsoluteCommandCellSchema),
  }),
  state: AbsoluteCommandRuntimeStateSchema,
  startedAt: z.string(),
  completedAt: z.string().optional(),
  metrics: z.object({
    commandCount: z.number().int(),
    durationMs: z.number(),
    travelDistance: z.number().int(),
  }).optional(),
});

export const AbandonAbsoluteCommandResponseSchema = z.object({
  success: z.boolean(),
});

export const ListAbsoluteCommandPuzzlesResponseSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    difficultyLabel: z.string().optional(),
    estimatedDuration: z.string().optional(),
    optimalCommandCount: z.number().int().optional(),
    completedCount: z.number().int(),
    bestRecord: z.object({
      username: z.string(),
      commandCount: z.number().int(),
      durationMs: z.number(),
    }).optional(),
  })),
  total: z.number().int(),
});

export const GetAbsoluteCommandPuzzleDetailResponseSchema = z.object({
  puzzle: z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    difficultyLabel: z.string().optional(),
    estimatedDuration: z.string().optional(),
    optimalCommandCount: z.number().int().optional(),
    source: z.string().optional(),
    size: z.object({ width: z.number(), height: z.number(), depth: z.number() }),
    cells: z.array(AbsoluteCommandCellSchema),
  }),
  leaderboardPreview: z.object({
    items: z.array(z.object({
      rank: z.number().int(),
      user: z.object({ id: z.string(), username: z.string() }),
      commandCount: z.number().int(),
      durationMs: z.number(),
      completedAt: z.string(),
    })),
  }),
});

export const GetPuzzleLeaderboardResponseSchema = z.object({
  puzzle: z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
  }),
  items: z.array(z.object({
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
  })),
  myBest: z.object({
    rank: z.number().int(),
    commandCount: z.number().int(),
    durationMs: z.number(),
    travelDistance: z.number().int(),
    completedAt: z.string(),
  }).optional(),
});

// ─── Inferred types ─────────────────────────────────────────────────

export type StartAbsoluteCommandAttemptResponse = z.infer<typeof StartAbsoluteCommandAttemptResponseSchema>;
export type ExecuteAbsoluteCommandRequest = z.infer<typeof ExecuteAbsoluteCommandRequestSchema>;
export type ExecuteAbsoluteCommandResponse = z.infer<typeof ExecuteAbsoluteCommandResponseSchema>;
export type UndoAbsoluteCommandResponse = z.infer<typeof UndoAbsoluteCommandResponseSchema>;
export type ResetAbsoluteCommandResponse = z.infer<typeof ResetAbsoluteCommandResponseSchema>;
export type GetAbsoluteCommandAttemptResponse = z.infer<typeof GetAbsoluteCommandAttemptResponseSchema>;
export type AbandonAbsoluteCommandResponse = z.infer<typeof AbandonAbsoluteCommandResponseSchema>;
export type ListAbsoluteCommandPuzzlesResponse = z.infer<typeof ListAbsoluteCommandPuzzlesResponseSchema>;
export type GetAbsoluteCommandPuzzleDetailResponse = z.infer<typeof GetAbsoluteCommandPuzzleDetailResponseSchema>;
export type GetPuzzleLeaderboardResponse = z.infer<typeof GetPuzzleLeaderboardResponseSchema>;
