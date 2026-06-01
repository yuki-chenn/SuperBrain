import { z } from 'zod';
export declare const AbsoluteCommandContentSchema: z.ZodObject<{
    engine: z.ZodOptional<z.ZodLiteral<"absolute-command">>;
    schemaVersion: z.ZodDefault<z.ZodNumber>;
    size: z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
        depth: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
        depth: number;
    }, {
        width: number;
        height: number;
        depth: number;
    }>;
    startCoord: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
    }, {
        x: number;
        y: number;
        z: number;
    }>;
    cells: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">;
    optimalCommandCount: z.ZodOptional<z.ZodNumber>;
    difficultyLabel: z.ZodOptional<z.ZodString>;
    season: z.ZodOptional<z.ZodNumber>;
    episode: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    size: {
        width: number;
        height: number;
        depth: number;
    };
    cells: Record<string, unknown>[];
    startCoord: {
        x: number;
        y: number;
        z: number;
    };
    schemaVersion: number;
    difficultyLabel?: string | undefined;
    optimalCommandCount?: number | undefined;
    season?: number | undefined;
    episode?: number | undefined;
    engine?: "absolute-command" | undefined;
}, {
    size: {
        width: number;
        height: number;
        depth: number;
    };
    cells: Record<string, unknown>[];
    startCoord: {
        x: number;
        y: number;
        z: number;
    };
    difficultyLabel?: string | undefined;
    optimalCommandCount?: number | undefined;
    season?: number | undefined;
    episode?: number | undefined;
    engine?: "absolute-command" | undefined;
    schemaVersion?: number | undefined;
}>;
export type AbsoluteCommandContent = z.infer<typeof AbsoluteCommandContentSchema>;
//# sourceMappingURL=content-schema.d.ts.map