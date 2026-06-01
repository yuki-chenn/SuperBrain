import { z } from 'zod';
export declare const TieBreakerSchema: z.ZodObject<{
    metric: z.ZodString;
    direction: z.ZodEnum<["ASC", "DESC"]>;
}, "strip", z.ZodTypeAny, {
    metric: string;
    direction: "ASC" | "DESC";
}, {
    metric: string;
    direction: "ASC" | "DESC";
}>;
export declare const LeaderboardDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    slug: z.ZodString;
    name: z.ZodString;
    scope: z.ZodEnum<["GLOBAL", "DAILY", "WEEKLY", "FRIENDS"]>;
    difficultyKey: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    rankMetric: z.ZodString;
    rankDirection: z.ZodEnum<["ASC", "DESC"]>;
    tieBreakers: z.ZodArray<z.ZodObject<{
        metric: z.ZodString;
        direction: z.ZodEnum<["ASC", "DESC"]>;
    }, "strip", z.ZodTypeAny, {
        metric: string;
        direction: "ASC" | "DESC";
    }, {
        metric: string;
        direction: "ASC" | "DESC";
    }>, "many">;
    entryPolicy: z.ZodEnum<["BEST_PER_USER", "ALL_ATTEMPTS"]>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    slug: string;
    name: string;
    scope: "DAILY" | "GLOBAL" | "WEEKLY" | "FRIENDS";
    rankMetric: string;
    rankDirection: "ASC" | "DESC";
    tieBreakers: {
        metric: string;
        direction: "ASC" | "DESC";
    }[];
    entryPolicy: "BEST_PER_USER" | "ALL_ATTEMPTS";
    metadata?: Record<string, unknown> | undefined;
    difficultyKey?: string | null | undefined;
}, {
    id: string;
    slug: string;
    name: string;
    scope: "DAILY" | "GLOBAL" | "WEEKLY" | "FRIENDS";
    rankMetric: string;
    rankDirection: "ASC" | "DESC";
    tieBreakers: {
        metric: string;
        direction: "ASC" | "DESC";
    }[];
    entryPolicy: "BEST_PER_USER" | "ALL_ATTEMPTS";
    metadata?: Record<string, unknown> | undefined;
    difficultyKey?: string | null | undefined;
}>;
export declare const LeaderboardEntrySchema: z.ZodObject<{
    rank: z.ZodNumber;
    user: z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        username: string;
        id: string;
    }, {
        username: string;
        id: string;
    }>;
    metrics: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    completedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user: {
        username: string;
        id: string;
    };
    metrics: Record<string, unknown>;
    completedAt: string;
    rank: number;
}, {
    user: {
        username: string;
        id: string;
    };
    metrics: Record<string, unknown>;
    completedAt: string;
    rank: number;
}>;
export declare const LeaderboardEntriesResponseSchema: z.ZodObject<{
    leaderboard: z.ZodObject<{
        id: z.ZodString;
        slug: z.ZodString;
        name: z.ZodString;
        scope: z.ZodEnum<["GLOBAL", "DAILY", "WEEKLY", "FRIENDS"]>;
        difficultyKey: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        rankMetric: z.ZodString;
        rankDirection: z.ZodEnum<["ASC", "DESC"]>;
        tieBreakers: z.ZodArray<z.ZodObject<{
            metric: z.ZodString;
            direction: z.ZodEnum<["ASC", "DESC"]>;
        }, "strip", z.ZodTypeAny, {
            metric: string;
            direction: "ASC" | "DESC";
        }, {
            metric: string;
            direction: "ASC" | "DESC";
        }>, "many">;
        entryPolicy: z.ZodEnum<["BEST_PER_USER", "ALL_ATTEMPTS"]>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        slug: string;
        name: string;
        scope: "DAILY" | "GLOBAL" | "WEEKLY" | "FRIENDS";
        rankMetric: string;
        rankDirection: "ASC" | "DESC";
        tieBreakers: {
            metric: string;
            direction: "ASC" | "DESC";
        }[];
        entryPolicy: "BEST_PER_USER" | "ALL_ATTEMPTS";
        metadata?: Record<string, unknown> | undefined;
        difficultyKey?: string | null | undefined;
    }, {
        id: string;
        slug: string;
        name: string;
        scope: "DAILY" | "GLOBAL" | "WEEKLY" | "FRIENDS";
        rankMetric: string;
        rankDirection: "ASC" | "DESC";
        tieBreakers: {
            metric: string;
            direction: "ASC" | "DESC";
        }[];
        entryPolicy: "BEST_PER_USER" | "ALL_ATTEMPTS";
        metadata?: Record<string, unknown> | undefined;
        difficultyKey?: string | null | undefined;
    }>;
    items: z.ZodArray<z.ZodObject<{
        rank: z.ZodNumber;
        user: z.ZodObject<{
            id: z.ZodString;
            username: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            username: string;
            id: string;
        }, {
            username: string;
            id: string;
        }>;
        metrics: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        user: {
            username: string;
            id: string;
        };
        metrics: Record<string, unknown>;
        completedAt: string;
        rank: number;
    }, {
        user: {
            username: string;
            id: string;
        };
        metrics: Record<string, unknown>;
        completedAt: string;
        rank: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    items: {
        user: {
            username: string;
            id: string;
        };
        metrics: Record<string, unknown>;
        completedAt: string;
        rank: number;
    }[];
    leaderboard: {
        id: string;
        slug: string;
        name: string;
        scope: "DAILY" | "GLOBAL" | "WEEKLY" | "FRIENDS";
        rankMetric: string;
        rankDirection: "ASC" | "DESC";
        tieBreakers: {
            metric: string;
            direction: "ASC" | "DESC";
        }[];
        entryPolicy: "BEST_PER_USER" | "ALL_ATTEMPTS";
        metadata?: Record<string, unknown> | undefined;
        difficultyKey?: string | null | undefined;
    };
}, {
    items: {
        user: {
            username: string;
            id: string;
        };
        metrics: Record<string, unknown>;
        completedAt: string;
        rank: number;
    }[];
    leaderboard: {
        id: string;
        slug: string;
        name: string;
        scope: "DAILY" | "GLOBAL" | "WEEKLY" | "FRIENDS";
        rankMetric: string;
        rankDirection: "ASC" | "DESC";
        tieBreakers: {
            metric: string;
            direction: "ASC" | "DESC";
        }[];
        entryPolicy: "BEST_PER_USER" | "ALL_ATTEMPTS";
        metadata?: Record<string, unknown> | undefined;
        difficultyKey?: string | null | undefined;
    };
}>;
//# sourceMappingURL=leaderboards.d.ts.map