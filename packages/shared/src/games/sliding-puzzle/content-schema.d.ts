import { z } from 'zod';
export declare const SlidingPuzzleContentSchema: z.ZodObject<{
    engine: z.ZodOptional<z.ZodLiteral<"sliding-puzzle">>;
    schemaVersion: z.ZodDefault<z.ZodNumber>;
    size: z.ZodNumber;
    scrambleMoves: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    size: number;
    schemaVersion: number;
    scrambleMoves: number;
    engine?: "sliding-puzzle" | undefined;
}, {
    size: number;
    scrambleMoves: number;
    engine?: "sliding-puzzle" | undefined;
    schemaVersion?: number | undefined;
}>;
export type SlidingPuzzleContent = z.infer<typeof SlidingPuzzleContentSchema>;
//# sourceMappingURL=content-schema.d.ts.map