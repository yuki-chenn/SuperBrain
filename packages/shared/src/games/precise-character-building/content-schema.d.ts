import { z } from 'zod';
export declare const PCBContentSchema: z.ZodObject<{
    engine: z.ZodOptional<z.ZodLiteral<"precise-character-building">>;
    schemaVersion: z.ZodDefault<z.ZodNumber>;
    boardSize: z.ZodNumber;
    radicalPool: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        glyph: z.ZodString;
        label: z.ZodString;
        category: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        key: string;
        label: string;
        glyph: string;
        category: string;
    }, {
        key: string;
        label: string;
        glyph: string;
        category: string;
    }>, "many">;
    cells: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        row: z.ZodNumber;
        col: z.ZodNumber;
        rootKey: z.ZodString;
        rootGlyph: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        index: number;
        row: number;
        col: number;
        rootKey: string;
        rootGlyph: string;
    }, {
        index: number;
        row: number;
        col: number;
        rootKey: string;
        rootGlyph: string;
    }>, "many">;
    solutionRounds: z.ZodArray<z.ZodObject<{
        roundIndex: z.ZodNumber;
        path: z.ZodArray<z.ZodNumber, "many">;
        radicalKeys: z.ZodArray<z.ZodString, "many">;
        resultChars: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        path: number[];
        resultChars: string[];
        roundIndex: number;
        radicalKeys: string[];
    }, {
        path: number[];
        resultChars: string[];
        roundIndex: number;
        radicalKeys: string[];
    }>, "many">;
    runtimeConfig: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    boardSize: number;
    cells: {
        index: number;
        row: number;
        col: number;
        rootKey: string;
        rootGlyph: string;
    }[];
    radicalPool: {
        key: string;
        label: string;
        glyph: string;
        category: string;
    }[];
    schemaVersion: number;
    solutionRounds: {
        path: number[];
        resultChars: string[];
        roundIndex: number;
        radicalKeys: string[];
    }[];
    engine?: "precise-character-building" | undefined;
    runtimeConfig?: Record<string, unknown> | undefined;
}, {
    boardSize: number;
    cells: {
        index: number;
        row: number;
        col: number;
        rootKey: string;
        rootGlyph: string;
    }[];
    radicalPool: {
        key: string;
        label: string;
        glyph: string;
        category: string;
    }[];
    solutionRounds: {
        path: number[];
        resultChars: string[];
        roundIndex: number;
        radicalKeys: string[];
    }[];
    engine?: "precise-character-building" | undefined;
    schemaVersion?: number | undefined;
    runtimeConfig?: Record<string, unknown> | undefined;
}>;
export type PCBContent = z.infer<typeof PCBContentSchema>;
//# sourceMappingURL=content-schema.d.ts.map