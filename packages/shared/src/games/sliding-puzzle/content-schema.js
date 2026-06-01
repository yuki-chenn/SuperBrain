import { z } from 'zod';
export const SlidingPuzzleContentSchema = z.object({
    engine: z.literal('sliding-puzzle').optional(),
    schemaVersion: z.number().int().positive().default(1),
    size: z.number().int().min(3).max(10),
    scrambleMoves: z.number().int().min(0),
});
//# sourceMappingURL=content-schema.js.map