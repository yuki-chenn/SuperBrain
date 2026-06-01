import { z } from 'zod';
export declare const DifficultyLevelSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    size: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    key: string;
    label: string;
    size: number;
}, {
    key: string;
    label: string;
    size: number;
}>;
export declare const GameSchema: z.ZodObject<{
    id: z.ZodString;
    slug: z.ZodString;
    title: z.ZodString;
    subtitle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodString;
    source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    coverUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodEnum<["DRAFT", "PUBLISHED", "ARCHIVED"]>;
    difficultyLevels: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        size: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        key: string;
        label: string;
        size: number;
    }, {
        key: string;
        label: string;
        size: number;
    }>, "many">;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    id: string;
    slug: string;
    title: string;
    description: string;
    difficultyLevels: {
        key: string;
        label: string;
        size: number;
    }[];
    metadata: Record<string, unknown>;
    subtitle?: string | null | undefined;
    source?: string | null | undefined;
    coverUrl?: string | null | undefined;
}, {
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    id: string;
    slug: string;
    title: string;
    description: string;
    difficultyLevels: {
        key: string;
        label: string;
        size: number;
    }[];
    subtitle?: string | null | undefined;
    source?: string | null | undefined;
    coverUrl?: string | null | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const GameListResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        slug: z.ZodString;
        title: z.ZodString;
        subtitle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodString;
        source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        coverUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodEnum<["DRAFT", "PUBLISHED", "ARCHIVED"]>;
        difficultyLevels: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            label: z.ZodString;
            size: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            key: string;
            label: string;
            size: number;
        }, {
            key: string;
            label: string;
            size: number;
        }>, "many">;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
        id: string;
        slug: string;
        title: string;
        description: string;
        difficultyLevels: {
            key: string;
            label: string;
            size: number;
        }[];
        metadata: Record<string, unknown>;
        subtitle?: string | null | undefined;
        source?: string | null | undefined;
        coverUrl?: string | null | undefined;
    }, {
        status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
        id: string;
        slug: string;
        title: string;
        description: string;
        difficultyLevels: {
            key: string;
            label: string;
            size: number;
        }[];
        subtitle?: string | null | undefined;
        source?: string | null | undefined;
        coverUrl?: string | null | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    items: {
        status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
        id: string;
        slug: string;
        title: string;
        description: string;
        difficultyLevels: {
            key: string;
            label: string;
            size: number;
        }[];
        metadata: Record<string, unknown>;
        subtitle?: string | null | undefined;
        source?: string | null | undefined;
        coverUrl?: string | null | undefined;
    }[];
}, {
    items: {
        status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
        id: string;
        slug: string;
        title: string;
        description: string;
        difficultyLevels: {
            key: string;
            label: string;
            size: number;
        }[];
        subtitle?: string | null | undefined;
        source?: string | null | undefined;
        coverUrl?: string | null | undefined;
        metadata?: Record<string, unknown> | undefined;
    }[];
}>;
//# sourceMappingURL=games.d.ts.map