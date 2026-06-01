import { z } from 'zod';
export declare const LifeGameContentSchema: z.ZodObject<{
    engine: z.ZodOptional<z.ZodLiteral<"life-game">>;
    schemaVersion: z.ZodDefault<z.ZodNumber>;
    width: z.ZodNumber;
    height: z.ZodNumber;
    boundary: z.ZodUnion<[z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>]>;
    initialState: z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
        aliveCells: z.ZodArray<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
        aliveCells: {
            x: number;
            y: number;
        }[];
    }, {
        width: number;
        height: number;
        aliveCells: {
            x: number;
            y: number;
        }[];
    }>;
    stableState: z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
        aliveCells: z.ZodArray<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
        aliveCells: {
            x: number;
            y: number;
        }[];
    }, {
        width: number;
        height: number;
        aliveCells: {
            x: number;
            y: number;
        }[];
    }>;
    targetRegionIds: z.ZodArray<z.ZodNumber, "many">;
    targetAnswers: z.ZodArray<z.ZodObject<{
        regionId: z.ZodNumber;
        aliveCells: z.ZodArray<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        aliveCells: {
            x: number;
            y: number;
        }[];
        regionId: number;
    }, {
        aliveCells: {
            x: number;
            y: number;
        }[];
        regionId: number;
    }>, "many">;
    stableGeneration: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    initialState: {
        width: number;
        height: number;
        aliveCells: {
            x: number;
            y: number;
        }[];
    };
    width: number;
    height: number;
    targetRegionIds: number[];
    boundary: string | Record<string, unknown>;
    schemaVersion: number;
    stableState: {
        width: number;
        height: number;
        aliveCells: {
            x: number;
            y: number;
        }[];
    };
    targetAnswers: {
        aliveCells: {
            x: number;
            y: number;
        }[];
        regionId: number;
    }[];
    stableGeneration: number;
    engine?: "life-game" | undefined;
}, {
    initialState: {
        width: number;
        height: number;
        aliveCells: {
            x: number;
            y: number;
        }[];
    };
    width: number;
    height: number;
    targetRegionIds: number[];
    boundary: string | Record<string, unknown>;
    stableState: {
        width: number;
        height: number;
        aliveCells: {
            x: number;
            y: number;
        }[];
    };
    targetAnswers: {
        aliveCells: {
            x: number;
            y: number;
        }[];
        regionId: number;
    }[];
    stableGeneration: number;
    engine?: "life-game" | undefined;
    schemaVersion?: number | undefined;
}>;
export type LifeGameContent = z.infer<typeof LifeGameContentSchema>;
//# sourceMappingURL=content-schema.d.ts.map