import { z } from 'zod';
export declare const LocalCellCoordSchema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
}, {
    x: number;
    y: number;
}>;
export declare const LifeBoardStateSchema: z.ZodObject<{
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
export declare const LifeBoundaryRuleSchema: z.ZodObject<{
    wrapX: z.ZodBoolean;
    wrapY: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    wrapX: boolean;
    wrapY: boolean;
}, {
    wrapX: boolean;
    wrapY: boolean;
}>;
export declare const StartLifeAttemptResponseSchema: z.ZodObject<{
    attemptId: z.ZodString;
    gameSlug: z.ZodString;
    difficultyKey: z.ZodString;
    seed: z.ZodString;
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
    maxDurationMs: z.ZodNumber;
    targetRegionIds: z.ZodArray<z.ZodNumber, "many">;
    boundary: z.ZodObject<{
        wrapX: z.ZodBoolean;
        wrapY: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        wrapX: boolean;
        wrapY: boolean;
    }, {
        wrapX: boolean;
        wrapY: boolean;
    }>;
    width: z.ZodNumber;
    height: z.ZodNumber;
    startedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    gameSlug: string;
    difficultyKey: string;
    attemptId: string;
    seed: string;
    initialState: {
        width: number;
        height: number;
        aliveCells: {
            x: number;
            y: number;
        }[];
    };
    startedAt: string;
    width: number;
    height: number;
    maxDurationMs: number;
    targetRegionIds: number[];
    boundary: {
        wrapX: boolean;
        wrapY: boolean;
    };
}, {
    gameSlug: string;
    difficultyKey: string;
    attemptId: string;
    seed: string;
    initialState: {
        width: number;
        height: number;
        aliveCells: {
            x: number;
            y: number;
        }[];
    };
    startedAt: string;
    width: number;
    height: number;
    maxDurationMs: number;
    targetRegionIds: number[];
    boundary: {
        wrapX: boolean;
        wrapY: boolean;
    };
}>;
export declare const SubmitLifeRegionRequestSchema: z.ZodObject<{
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
}, {
    aliveCells: {
        x: number;
        y: number;
    }[];
}>;
export declare const SubmitLifeRegionResponseSchema: z.ZodObject<{
    regionId: z.ZodNumber;
    correct: z.ZodBoolean;
    errorCount: z.ZodNumber;
    correctRegionIds: z.ZodArray<z.ZodNumber, "many">;
    attemptCompleted: z.ZodBoolean;
    result: z.ZodOptional<z.ZodObject<{
        durationMs: z.ZodNumber;
        errorCount: z.ZodNumber;
        targetRegionCount: z.ZodNumber;
        rank: z.ZodOptional<z.ZodNumber>;
        personalBest: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        durationMs: number;
        errorCount: number;
        targetRegionCount: number;
        personalBest: boolean;
        rank?: number | undefined;
    }, {
        durationMs: number;
        errorCount: number;
        targetRegionCount: number;
        personalBest: boolean;
        rank?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    regionId: number;
    correct: boolean;
    errorCount: number;
    correctRegionIds: number[];
    attemptCompleted: boolean;
    result?: {
        durationMs: number;
        errorCount: number;
        targetRegionCount: number;
        personalBest: boolean;
        rank?: number | undefined;
    } | undefined;
}, {
    regionId: number;
    correct: boolean;
    errorCount: number;
    correctRegionIds: number[];
    attemptCompleted: boolean;
    result?: {
        durationMs: number;
        errorCount: number;
        targetRegionCount: number;
        personalBest: boolean;
        rank?: number | undefined;
    } | undefined;
}>;
export declare const GetLifeAttemptResponseSchema: z.ZodObject<{
    attemptId: z.ZodString;
    status: z.ZodEnum<["STARTED", "COMPLETED", "FAILED"]>;
    difficultyKey: z.ZodString;
    width: z.ZodNumber;
    height: z.ZodNumber;
    boundary: z.ZodObject<{
        wrapX: z.ZodBoolean;
        wrapY: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        wrapX: boolean;
        wrapY: boolean;
    }, {
        wrapX: boolean;
        wrapY: boolean;
    }>;
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
    targetRegionIds: z.ZodArray<z.ZodNumber, "many">;
    correctRegionIds: z.ZodArray<z.ZodNumber, "many">;
    errorCount: z.ZodNumber;
    maxDurationMs: z.ZodNumber;
    startedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    submissions: z.ZodArray<z.ZodObject<{
        regionId: z.ZodNumber;
        submittedAt: z.ZodString;
        correct: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        regionId: number;
        correct: boolean;
        submittedAt: string;
    }, {
        regionId: number;
        correct: boolean;
        submittedAt: string;
    }>, "many">;
    metrics: z.ZodOptional<z.ZodObject<{
        durationMs: z.ZodNumber;
        errorCount: z.ZodNumber;
        targetRegionCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        durationMs: number;
        errorCount: number;
        targetRegionCount: number;
    }, {
        durationMs: number;
        errorCount: number;
        targetRegionCount: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "COMPLETED" | "STARTED" | "FAILED";
    difficultyKey: string;
    attemptId: string;
    initialState: {
        width: number;
        height: number;
        aliveCells: {
            x: number;
            y: number;
        }[];
    };
    startedAt: string;
    width: number;
    height: number;
    maxDurationMs: number;
    targetRegionIds: number[];
    boundary: {
        wrapX: boolean;
        wrapY: boolean;
    };
    errorCount: number;
    correctRegionIds: number[];
    submissions: {
        regionId: number;
        correct: boolean;
        submittedAt: string;
    }[];
    metrics?: {
        durationMs: number;
        errorCount: number;
        targetRegionCount: number;
    } | undefined;
    completedAt?: string | undefined;
}, {
    status: "COMPLETED" | "STARTED" | "FAILED";
    difficultyKey: string;
    attemptId: string;
    initialState: {
        width: number;
        height: number;
        aliveCells: {
            x: number;
            y: number;
        }[];
    };
    startedAt: string;
    width: number;
    height: number;
    maxDurationMs: number;
    targetRegionIds: number[];
    boundary: {
        wrapX: boolean;
        wrapY: boolean;
    };
    errorCount: number;
    correctRegionIds: number[];
    submissions: {
        regionId: number;
        correct: boolean;
        submittedAt: string;
    }[];
    metrics?: {
        durationMs: number;
        errorCount: number;
        targetRegionCount: number;
    } | undefined;
    completedAt?: string | undefined;
}>;
export declare const AbandonLifeAttemptResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    success: boolean;
}, {
    success: boolean;
}>;
//# sourceMappingURL=life-game.d.ts.map