import { z } from 'zod';

export const RadicalSchema = z.object({
  key: z.string(),
  glyph: z.string(),
  label: z.string(),
  category: z.string(),
});

export const CharacterCellSchema = z.object({
  index: z.number().int().min(0).max(35),
  row: z.number().int().min(0).max(5),
  col: z.number().int().min(0).max(5),
  rootKey: z.string(),
  rootGlyph: z.string(),
});

export const PCBConfigSchema = z.object({
  picksPerRound: z.number().int(),
  adjacencyMode: z.enum(['KING_8', 'ORTHOGONAL_4']),
  cooldownRounds: z.number().int(),
  allowRadicalRepeatInRound: z.boolean(),
});

export const StartPCBAttemptRequestSchema = z.object({
  difficultyKey: z.string(),
});

export const StartPCBAttemptResponseSchema = z.object({
  attemptId: z.string(),
  gameSlug: z.string(),
  difficultyKey: z.string(),
  maxDurationMs: z.number().int().positive(),
  boardSize: z.number().int(),
  cells: z.array(CharacterCellSchema),
  radicalPool: z.array(RadicalSchema),
  config: PCBConfigSchema,
  state: z.object({
    currentRoundIndex: z.number().int(),
    currentPosition: z.object({ row: z.number().int(), col: z.number().int() }).nullable(),
    litCellIndices: z.array(z.number().int()),
    disabledRadicalKeys: z.array(z.string()),
    errorCount: z.number().int(),
  }),
  startedAt: z.string(),
});

export const SubmitPCBRoundRequestSchema = z.object({
  selectedRadicalKeys: z.array(z.string()).length(4),
  selectedCellIndices: z.array(z.number().int()).length(4),
});

export const SubmitPCBRoundResponseSchema = z.object({
  correct: z.boolean(),
  errorCount: z.number().int(),
  state: z.object({
    currentRoundIndex: z.number().int(),
    currentPosition: z.object({ row: z.number().int(), col: z.number().int() }).nullable(),
    litCellIndices: z.array(z.number().int()),
    disabledRadicalKeys: z.array(z.string()),
  }),
  roundResult: z.object({
    selectedCellIndices: z.array(z.number().int()),
    selectedRadicalKeys: z.array(z.string()),
    resultChars: z.array(z.string()),
  }).optional(),
  attemptCompleted: z.boolean(),
  result: z.object({
    durationMs: z.number().int(),
    errorCount: z.number().int(),
    rounds: z.number().int(),
    litCells: z.number().int(),
    rank: z.number().int().optional(),
    personalBest: z.boolean(),
  }).optional(),
  errorReason: z.enum([
    'INVALID_PATH',
    'RADICAL_DISABLED',
    'INVALID_COMBINATION',
    'CELL_ALREADY_LIT',
    'ATTEMPT_NOT_STARTED',
  ]).optional(),
});

export const PCBStateSchema = z.object({
  currentRoundIndex: z.number().int(),
  currentPosition: z.object({ row: z.number().int(), col: z.number().int() }).nullable(),
  litCellIndices: z.array(z.number().int()),
  disabledRadicalKeys: z.array(z.string()),
  errorCount: z.number().int(),
});

export const GetPCBAttemptResponseSchema = z.object({
  attemptId: z.string(),
  status: z.enum(['STARTED', 'COMPLETED', 'ABANDONED', 'INVALID']),
  difficultyKey: z.string(),
  maxDurationMs: z.number().int().positive(),
  boardSize: z.number().int(),
  cells: z.array(CharacterCellSchema),
  radicalPool: z.array(RadicalSchema),
  config: PCBConfigSchema,
  state: PCBStateSchema,
  litResults: z.array(z.object({
    cellIndex: z.number().int(),
    radicalKey: z.string(),
    resultChar: z.string(),
  })),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  metrics: z.object({
    durationMs: z.number().int(),
    errorCount: z.number().int(),
    rounds: z.number().int(),
    litCells: z.number().int(),
  }).optional(),
});

export const AbandonPCBAttemptResponseSchema = z.object({
  success: z.boolean(),
});

export const ResetPCBAttemptResponseSchema = z.object({
  success: z.boolean(),
  startedAt: z.string(),
  state: PCBStateSchema,
});
