import { z } from 'zod';
export const PCBContentSchema = z.object({
    engine: z.literal('precise-character-building').optional(),
    schemaVersion: z.number().int().positive().default(1),
    boardSize: z.number().int().positive(),
    radicalPool: z.array(z.object({
        key: z.string(), glyph: z.string(), label: z.string(), category: z.string(),
    })),
    cells: z.array(z.object({
        index: z.number().int().nonnegative(),
        row: z.number().int(),
        col: z.number().int(),
        rootKey: z.string(),
        rootGlyph: z.string(),
    })),
    solutionRounds: z.array(z.object({
        roundIndex: z.number().int().nonnegative(),
        path: z.array(z.number().int()),
        radicalKeys: z.array(z.string()),
        resultChars: z.array(z.string()),
    })),
    runtimeConfig: z.record(z.unknown()).optional(),
});
//# sourceMappingURL=content-schema.js.map