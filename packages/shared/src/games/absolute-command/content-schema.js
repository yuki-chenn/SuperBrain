import { z } from 'zod';
export const AbsoluteCommandContentSchema = z.object({
    engine: z.literal('absolute-command').optional(),
    schemaVersion: z.number().int().positive().default(1),
    size: z.object({ width: z.number().int(), height: z.number().int(), depth: z.number().int() }),
    startCoord: z.object({ x: z.number().int(), y: z.number().int(), z: z.number().int() }),
    cells: z.array(z.record(z.unknown())),
    optimalCommandCount: z.number().int().positive().optional(),
    difficultyLabel: z.string().optional(),
    season: z.number().int().optional(),
    episode: z.number().int().optional(),
});
//# sourceMappingURL=content-schema.js.map