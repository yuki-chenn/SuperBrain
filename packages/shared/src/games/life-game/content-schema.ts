import { z } from 'zod';
const Cell = z.object({ x: z.number().int(), y: z.number().int() });
export const LifeGameContentSchema = z.object({
  engine: z.literal('life-game').optional(),
  schemaVersion: z.number().int().positive().default(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  boundary: z.union([z.string(), z.record(z.unknown())]),
  initialState: z.object({ width: z.number().int(), height: z.number().int(), aliveCells: z.array(Cell) }),
  stableState: z.object({ width: z.number().int(), height: z.number().int(), aliveCells: z.array(Cell) }),
  targetRegionIds: z.array(z.number().int()),
  targetAnswers: z.array(z.object({ regionId: z.number().int(), aliveCells: z.array(Cell) })),
  stableGeneration: z.number().int().nonnegative(),
});
export type LifeGameContent = z.infer<typeof LifeGameContentSchema>;
