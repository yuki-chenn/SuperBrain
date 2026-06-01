import { z } from 'zod';
export declare const AdminCreateACPuzzleSchema: z.ZodObject<{
    title: z.ZodString;
    slug: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    difficultyLabel: z.ZodOptional<z.ZodEnum<["入门", "标准", "困难", "专家"]>>;
    season: z.ZodOptional<z.ZodNumber>;
    episode: z.ZodOptional<z.ZodNumber>;
    source: z.ZodOptional<z.ZodString>;
    estimatedDuration: z.ZodOptional<z.ZodString>;
    optimalCommandCount: z.ZodOptional<z.ZodNumber>;
    maxDurationMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    slug: string;
    title: string;
    description?: string | undefined;
    source?: string | undefined;
    maxDurationMs?: number | undefined;
    difficultyLabel?: "入门" | "标准" | "困难" | "专家" | undefined;
    estimatedDuration?: string | undefined;
    optimalCommandCount?: number | undefined;
    season?: number | undefined;
    episode?: number | undefined;
}, {
    slug: string;
    title: string;
    description?: string | undefined;
    source?: string | undefined;
    maxDurationMs?: number | undefined;
    difficultyLabel?: "入门" | "标准" | "困难" | "专家" | undefined;
    estimatedDuration?: string | undefined;
    optimalCommandCount?: number | undefined;
    season?: number | undefined;
    episode?: number | undefined;
}>;
export declare const AdminUpdateACPuzzleSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    difficultyLabel: z.ZodOptional<z.ZodEnum<["入门", "标准", "困难", "专家"]>>;
    season: z.ZodOptional<z.ZodNumber>;
    episode: z.ZodOptional<z.ZodNumber>;
    source: z.ZodOptional<z.ZodString>;
    estimatedDuration: z.ZodOptional<z.ZodString>;
    optimalCommandCount: z.ZodOptional<z.ZodNumber>;
    maxDurationMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    slug?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    source?: string | undefined;
    maxDurationMs?: number | undefined;
    difficultyLabel?: "入门" | "标准" | "困难" | "专家" | undefined;
    estimatedDuration?: string | undefined;
    optimalCommandCount?: number | undefined;
    season?: number | undefined;
    episode?: number | undefined;
}, {
    slug?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    source?: string | undefined;
    maxDurationMs?: number | undefined;
    difficultyLabel?: "入门" | "标准" | "困难" | "专家" | undefined;
    estimatedDuration?: string | undefined;
    optimalCommandCount?: number | undefined;
    season?: number | undefined;
    episode?: number | undefined;
}>;
export declare const AdminSaveMazeVersionSchema: z.ZodObject<{
    size: z.ZodOptional<z.ZodObject<{
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
    }>>;
    cells: z.ZodArray<z.ZodObject<{
        coord: z.ZodObject<{
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
        type: z.ZodEnum<["NORMAL", "YELLOW_STOP", "NUMBER", "INITIAL_RED", "DISABLED", "START"]>;
        requiredPasses: z.ZodOptional<z.ZodNumber>;
        label: z.ZodOptional<z.ZodString>;
        adminNote: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "NORMAL" | "YELLOW_STOP" | "NUMBER" | "INITIAL_RED" | "DISABLED" | "START";
        coord: {
            x: number;
            y: number;
            z: number;
        };
        label?: string | undefined;
        requiredPasses?: number | undefined;
        adminNote?: string | undefined;
    }, {
        type: "NORMAL" | "YELLOW_STOP" | "NUMBER" | "INITIAL_RED" | "DISABLED" | "START";
        coord: {
            x: number;
            y: number;
            z: number;
        };
        label?: string | undefined;
        requiredPasses?: number | undefined;
        adminNote?: string | undefined;
    }>, "many">;
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
    referenceSolution: z.ZodOptional<z.ZodArray<z.ZodEnum<["X_POS", "X_NEG", "Y_POS", "Y_NEG", "Z_POS", "Z_NEG"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    cells: {
        type: "NORMAL" | "YELLOW_STOP" | "NUMBER" | "INITIAL_RED" | "DISABLED" | "START";
        coord: {
            x: number;
            y: number;
            z: number;
        };
        label?: string | undefined;
        requiredPasses?: number | undefined;
        adminNote?: string | undefined;
    }[];
    startCoord: {
        x: number;
        y: number;
        z: number;
    };
    size?: {
        width: number;
        height: number;
        depth: number;
    } | undefined;
    referenceSolution?: ("X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG")[] | undefined;
}, {
    cells: {
        type: "NORMAL" | "YELLOW_STOP" | "NUMBER" | "INITIAL_RED" | "DISABLED" | "START";
        coord: {
            x: number;
            y: number;
            z: number;
        };
        label?: string | undefined;
        requiredPasses?: number | undefined;
        adminNote?: string | undefined;
    }[];
    startCoord: {
        x: number;
        y: number;
        z: number;
    };
    size?: {
        width: number;
        height: number;
        depth: number;
    } | undefined;
    referenceSolution?: ("X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG")[] | undefined;
}>;
export declare const AdminListACPuzzlesQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "PUBLISHED"]>>;
    difficultyLabel: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodNumber>;
    pageSize: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: "DRAFT" | "PUBLISHED" | undefined;
    difficultyLabel?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}, {
    status?: "DRAFT" | "PUBLISHED" | undefined;
    difficultyLabel?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export declare const AdminACPuzzleVersionSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodNumber;
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
    cells: z.ZodArray<z.ZodObject<{
        coord: z.ZodObject<{
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
        type: z.ZodEnum<["NORMAL", "YELLOW_STOP", "NUMBER", "INITIAL_RED", "DISABLED", "START"]>;
        requiredPasses: z.ZodOptional<z.ZodNumber>;
        label: z.ZodOptional<z.ZodString>;
        adminNote: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "NORMAL" | "YELLOW_STOP" | "NUMBER" | "INITIAL_RED" | "DISABLED" | "START";
        coord: {
            x: number;
            y: number;
            z: number;
        };
        label?: string | undefined;
        requiredPasses?: number | undefined;
        adminNote?: string | undefined;
    }, {
        type: "NORMAL" | "YELLOW_STOP" | "NUMBER" | "INITIAL_RED" | "DISABLED" | "START";
        coord: {
            x: number;
            y: number;
            z: number;
        };
        label?: string | undefined;
        requiredPasses?: number | undefined;
        adminNote?: string | undefined;
    }>, "many">;
    referenceSolution: z.ZodOptional<z.ZodArray<z.ZodEnum<["X_POS", "X_NEG", "Y_POS", "Y_NEG", "Z_POS", "Z_NEG"]>, "many">>;
    validationStatus: z.ZodEnum<["UNVALIDATED", "VALID", "INVALID"]>;
    validationReport: z.ZodAny;
    createdByUserId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    size: {
        width: number;
        height: number;
        depth: number;
    };
    cells: {
        type: "NORMAL" | "YELLOW_STOP" | "NUMBER" | "INITIAL_RED" | "DISABLED" | "START";
        coord: {
            x: number;
            y: number;
            z: number;
        };
        label?: string | undefined;
        requiredPasses?: number | undefined;
        adminNote?: string | undefined;
    }[];
    createdAt: string;
    version: number;
    startCoord: {
        x: number;
        y: number;
        z: number;
    };
    validationStatus: "UNVALIDATED" | "VALID" | "INVALID";
    referenceSolution?: ("X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG")[] | undefined;
    validationReport?: any;
    createdByUserId?: string | undefined;
}, {
    id: string;
    size: {
        width: number;
        height: number;
        depth: number;
    };
    cells: {
        type: "NORMAL" | "YELLOW_STOP" | "NUMBER" | "INITIAL_RED" | "DISABLED" | "START";
        coord: {
            x: number;
            y: number;
            z: number;
        };
        label?: string | undefined;
        requiredPasses?: number | undefined;
        adminNote?: string | undefined;
    }[];
    createdAt: string;
    version: number;
    startCoord: {
        x: number;
        y: number;
        z: number;
    };
    validationStatus: "UNVALIDATED" | "VALID" | "INVALID";
    referenceSolution?: ("X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG")[] | undefined;
    validationReport?: any;
    createdByUserId?: string | undefined;
}>;
export declare const AdminACPuzzleListItemSchema: z.ZodObject<{
    id: z.ZodString;
    slug: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    difficultyLabel: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    mazeSize: z.ZodObject<{
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
    publishedAt: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    versionCount: z.ZodNumber;
    attemptCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    status: string;
    id: string;
    slug: string;
    title: string;
    createdAt: string;
    mazeSize: {
        width: number;
        height: number;
        depth: number;
    };
    updatedAt: string;
    versionCount: number;
    attemptCount: number;
    description?: string | undefined;
    difficultyLabel?: string | undefined;
    publishedAt?: string | undefined;
}, {
    status: string;
    id: string;
    slug: string;
    title: string;
    createdAt: string;
    mazeSize: {
        width: number;
        height: number;
        depth: number;
    };
    updatedAt: string;
    versionCount: number;
    attemptCount: number;
    description?: string | undefined;
    difficultyLabel?: string | undefined;
    publishedAt?: string | undefined;
}>;
export declare const AdminListACPuzzlesResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        slug: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        difficultyLabel: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        mazeSize: z.ZodObject<{
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
        publishedAt: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        versionCount: z.ZodNumber;
        attemptCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        status: string;
        id: string;
        slug: string;
        title: string;
        createdAt: string;
        mazeSize: {
            width: number;
            height: number;
            depth: number;
        };
        updatedAt: string;
        versionCount: number;
        attemptCount: number;
        description?: string | undefined;
        difficultyLabel?: string | undefined;
        publishedAt?: string | undefined;
    }, {
        status: string;
        id: string;
        slug: string;
        title: string;
        createdAt: string;
        mazeSize: {
            width: number;
            height: number;
            depth: number;
        };
        updatedAt: string;
        versionCount: number;
        attemptCount: number;
        description?: string | undefined;
        difficultyLabel?: string | undefined;
        publishedAt?: string | undefined;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    items: {
        status: string;
        id: string;
        slug: string;
        title: string;
        createdAt: string;
        mazeSize: {
            width: number;
            height: number;
            depth: number;
        };
        updatedAt: string;
        versionCount: number;
        attemptCount: number;
        description?: string | undefined;
        difficultyLabel?: string | undefined;
        publishedAt?: string | undefined;
    }[];
    total: number;
}, {
    items: {
        status: string;
        id: string;
        slug: string;
        title: string;
        createdAt: string;
        mazeSize: {
            width: number;
            height: number;
            depth: number;
        };
        updatedAt: string;
        versionCount: number;
        attemptCount: number;
        description?: string | undefined;
        difficultyLabel?: string | undefined;
        publishedAt?: string | undefined;
    }[];
    total: number;
}>;
export declare const AdminACPuzzleDetailSchema: z.ZodObject<{
    id: z.ZodString;
    slug: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    difficultyLabel: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    maxDurationMs: z.ZodNumber;
    currentVersionId: z.ZodOptional<z.ZodString>;
    publishedAt: z.ZodOptional<z.ZodString>;
    createdByUserId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    versions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        version: z.ZodNumber;
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
        cells: z.ZodArray<z.ZodObject<{
            coord: z.ZodObject<{
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
            type: z.ZodEnum<["NORMAL", "YELLOW_STOP", "NUMBER", "INITIAL_RED", "DISABLED", "START"]>;
            requiredPasses: z.ZodOptional<z.ZodNumber>;
            label: z.ZodOptional<z.ZodString>;
            adminNote: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "NORMAL" | "YELLOW_STOP" | "NUMBER" | "INITIAL_RED" | "DISABLED" | "START";
            coord: {
                x: number;
                y: number;
                z: number;
            };
            label?: string | undefined;
            requiredPasses?: number | undefined;
            adminNote?: string | undefined;
        }, {
            type: "NORMAL" | "YELLOW_STOP" | "NUMBER" | "INITIAL_RED" | "DISABLED" | "START";
            coord: {
                x: number;
                y: number;
                z: number;
            };
            label?: string | undefined;
            requiredPasses?: number | undefined;
            adminNote?: string | undefined;
        }>, "many">;
        referenceSolution: z.ZodOptional<z.ZodArray<z.ZodEnum<["X_POS", "X_NEG", "Y_POS", "Y_NEG", "Z_POS", "Z_NEG"]>, "many">>;
        validationStatus: z.ZodEnum<["UNVALIDATED", "VALID", "INVALID"]>;
        validationReport: z.ZodAny;
        createdByUserId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        cells: {
            type: "NORMAL" | "YELLOW_STOP" | "NUMBER" | "INITIAL_RED" | "DISABLED" | "START";
            coord: {
                x: number;
                y: number;
                z: number;
            };
            label?: string | undefined;
            requiredPasses?: number | undefined;
            adminNote?: string | undefined;
        }[];
        createdAt: string;
        version: number;
        startCoord: {
            x: number;
            y: number;
            z: number;
        };
        validationStatus: "UNVALIDATED" | "VALID" | "INVALID";
        referenceSolution?: ("X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG")[] | undefined;
        validationReport?: any;
        createdByUserId?: string | undefined;
    }, {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        cells: {
            type: "NORMAL" | "YELLOW_STOP" | "NUMBER" | "INITIAL_RED" | "DISABLED" | "START";
            coord: {
                x: number;
                y: number;
                z: number;
            };
            label?: string | undefined;
            requiredPasses?: number | undefined;
            adminNote?: string | undefined;
        }[];
        createdAt: string;
        version: number;
        startCoord: {
            x: number;
            y: number;
            z: number;
        };
        validationStatus: "UNVALIDATED" | "VALID" | "INVALID";
        referenceSolution?: ("X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG")[] | undefined;
        validationReport?: any;
        createdByUserId?: string | undefined;
    }>, "many">;
    attemptCount: z.ZodNumber;
    completedCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    status: string;
    id: string;
    slug: string;
    title: string;
    maxDurationMs: number;
    createdAt: string;
    completedCount: number;
    updatedAt: string;
    attemptCount: number;
    versions: {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        cells: {
            type: "NORMAL" | "YELLOW_STOP" | "NUMBER" | "INITIAL_RED" | "DISABLED" | "START";
            coord: {
                x: number;
                y: number;
                z: number;
            };
            label?: string | undefined;
            requiredPasses?: number | undefined;
            adminNote?: string | undefined;
        }[];
        createdAt: string;
        version: number;
        startCoord: {
            x: number;
            y: number;
            z: number;
        };
        validationStatus: "UNVALIDATED" | "VALID" | "INVALID";
        referenceSolution?: ("X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG")[] | undefined;
        validationReport?: any;
        createdByUserId?: string | undefined;
    }[];
    description?: string | undefined;
    difficultyLabel?: string | undefined;
    createdByUserId?: string | undefined;
    publishedAt?: string | undefined;
    currentVersionId?: string | undefined;
}, {
    status: string;
    id: string;
    slug: string;
    title: string;
    maxDurationMs: number;
    createdAt: string;
    completedCount: number;
    updatedAt: string;
    attemptCount: number;
    versions: {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        cells: {
            type: "NORMAL" | "YELLOW_STOP" | "NUMBER" | "INITIAL_RED" | "DISABLED" | "START";
            coord: {
                x: number;
                y: number;
                z: number;
            };
            label?: string | undefined;
            requiredPasses?: number | undefined;
            adminNote?: string | undefined;
        }[];
        createdAt: string;
        version: number;
        startCoord: {
            x: number;
            y: number;
            z: number;
        };
        validationStatus: "UNVALIDATED" | "VALID" | "INVALID";
        referenceSolution?: ("X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG")[] | undefined;
        validationReport?: any;
        createdByUserId?: string | undefined;
    }[];
    description?: string | undefined;
    difficultyLabel?: string | undefined;
    createdByUserId?: string | undefined;
    publishedAt?: string | undefined;
    currentVersionId?: string | undefined;
}>;
export declare const AdminValidatePuzzleResponseSchema: z.ZodObject<{
    valid: z.ZodBoolean;
    errors: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        coord: z.ZodOptional<z.ZodObject<{
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
        }>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        coord?: {
            x: number;
            y: number;
            z: number;
        } | undefined;
    }, {
        code: string;
        message: string;
        coord?: {
            x: number;
            y: number;
            z: number;
        } | undefined;
    }>, "many">;
    warnings: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        coord: z.ZodOptional<z.ZodObject<{
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
        }>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        coord?: {
            x: number;
            y: number;
            z: number;
        } | undefined;
    }, {
        code: string;
        message: string;
        coord?: {
            x: number;
            y: number;
            z: number;
        } | undefined;
    }>, "many">;
    referenceSolutionResult: z.ZodOptional<z.ZodObject<{
        completed: z.ZodBoolean;
        commandCount: z.ZodNumber;
        visitedCellCount: z.ZodNumber;
        requiredVisitCellCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        commandCount: number;
        completed: boolean;
        visitedCellCount: number;
        requiredVisitCellCount: number;
    }, {
        commandCount: number;
        completed: boolean;
        visitedCellCount: number;
        requiredVisitCellCount: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    valid: boolean;
    errors: {
        code: string;
        message: string;
        coord?: {
            x: number;
            y: number;
            z: number;
        } | undefined;
    }[];
    warnings: {
        code: string;
        message: string;
        coord?: {
            x: number;
            y: number;
            z: number;
        } | undefined;
    }[];
    referenceSolutionResult?: {
        commandCount: number;
        completed: boolean;
        visitedCellCount: number;
        requiredVisitCellCount: number;
    } | undefined;
}, {
    valid: boolean;
    errors: {
        code: string;
        message: string;
        coord?: {
            x: number;
            y: number;
            z: number;
        } | undefined;
    }[];
    warnings: {
        code: string;
        message: string;
        coord?: {
            x: number;
            y: number;
            z: number;
        } | undefined;
    }[];
    referenceSolutionResult?: {
        commandCount: number;
        completed: boolean;
        visitedCellCount: number;
        requiredVisitCellCount: number;
    } | undefined;
}>;
export declare const AdminACPuzzleAttemptSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    username: z.ZodString;
    status: z.ZodString;
    startedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    metrics: z.ZodAny;
    rankValue: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    username: string;
    status: string;
    id: string;
    startedAt: string;
    userId: string;
    metrics?: any;
    completedAt?: string | undefined;
    rankValue?: any;
}, {
    username: string;
    status: string;
    id: string;
    startedAt: string;
    userId: string;
    metrics?: any;
    completedAt?: string | undefined;
    rankValue?: any;
}>;
export declare const AdminListAttemptsResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        username: z.ZodString;
        status: z.ZodString;
        startedAt: z.ZodString;
        completedAt: z.ZodOptional<z.ZodString>;
        metrics: z.ZodAny;
        rankValue: z.ZodAny;
    }, "strip", z.ZodTypeAny, {
        username: string;
        status: string;
        id: string;
        startedAt: string;
        userId: string;
        metrics?: any;
        completedAt?: string | undefined;
        rankValue?: any;
    }, {
        username: string;
        status: string;
        id: string;
        startedAt: string;
        userId: string;
        metrics?: any;
        completedAt?: string | undefined;
        rankValue?: any;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    items: {
        username: string;
        status: string;
        id: string;
        startedAt: string;
        userId: string;
        metrics?: any;
        completedAt?: string | undefined;
        rankValue?: any;
    }[];
    total: number;
}, {
    items: {
        username: string;
        status: string;
        id: string;
        startedAt: string;
        userId: string;
        metrics?: any;
        completedAt?: string | undefined;
        rankValue?: any;
    }[];
    total: number;
}>;
export declare const AdminAttemptReplaySchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    username: z.ZodString;
    status: z.ZodString;
    startedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    metrics: z.ZodAny;
    puzzleSnapshot: z.ZodAny;
    runtimeState: z.ZodAny;
    commandLogs: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        index: z.ZodNumber;
        direction: z.ZodString;
        fromCoord: z.ZodAny;
        toCoord: z.ZodAny;
        path: z.ZodAny;
        stopReason: z.ZodString;
        changedCells: z.ZodAny;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        direction: string;
        index: number;
        stopReason: string;
        createdAt: string;
        path?: any;
        fromCoord?: any;
        toCoord?: any;
        changedCells?: any;
    }, {
        id: string;
        direction: string;
        index: number;
        stopReason: string;
        createdAt: string;
        path?: any;
        fromCoord?: any;
        toCoord?: any;
        changedCells?: any;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    username: string;
    status: string;
    id: string;
    startedAt: string;
    userId: string;
    commandLogs: {
        id: string;
        direction: string;
        index: number;
        stopReason: string;
        createdAt: string;
        path?: any;
        fromCoord?: any;
        toCoord?: any;
        changedCells?: any;
    }[];
    metrics?: any;
    completedAt?: string | undefined;
    puzzleSnapshot?: any;
    runtimeState?: any;
}, {
    username: string;
    status: string;
    id: string;
    startedAt: string;
    userId: string;
    commandLogs: {
        id: string;
        direction: string;
        index: number;
        stopReason: string;
        createdAt: string;
        path?: any;
        fromCoord?: any;
        toCoord?: any;
        changedCells?: any;
    }[];
    metrics?: any;
    completedAt?: string | undefined;
    puzzleSnapshot?: any;
    runtimeState?: any;
}>;
export declare const AdminLeaderboardItemSchema: z.ZodObject<{
    rank: z.ZodNumber;
    user: z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        username: string;
        id: string;
        avatarUrl?: string | undefined;
    }, {
        username: string;
        id: string;
        avatarUrl?: string | undefined;
    }>;
    commandCount: z.ZodNumber;
    durationMs: z.ZodNumber;
    travelDistance: z.ZodNumber;
    completedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user: {
        username: string;
        id: string;
        avatarUrl?: string | undefined;
    };
    durationMs: number;
    completedAt: string;
    rank: number;
    commandCount: number;
    travelDistance: number;
}, {
    user: {
        username: string;
        id: string;
        avatarUrl?: string | undefined;
    };
    durationMs: number;
    completedAt: string;
    rank: number;
    commandCount: number;
    travelDistance: number;
}>;
export declare const AdminPuzzleLeaderboardResponseSchema: z.ZodObject<{
    puzzle: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        slug: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        slug: string;
        title: string;
    }, {
        id: string;
        slug: string;
        title: string;
    }>;
    items: z.ZodArray<z.ZodObject<{
        rank: z.ZodNumber;
        user: z.ZodObject<{
            id: z.ZodString;
            username: z.ZodString;
            avatarUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            username: string;
            id: string;
            avatarUrl?: string | undefined;
        }, {
            username: string;
            id: string;
            avatarUrl?: string | undefined;
        }>;
        commandCount: z.ZodNumber;
        durationMs: z.ZodNumber;
        travelDistance: z.ZodNumber;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        user: {
            username: string;
            id: string;
            avatarUrl?: string | undefined;
        };
        durationMs: number;
        completedAt: string;
        rank: number;
        commandCount: number;
        travelDistance: number;
    }, {
        user: {
            username: string;
            id: string;
            avatarUrl?: string | undefined;
        };
        durationMs: number;
        completedAt: string;
        rank: number;
        commandCount: number;
        travelDistance: number;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    items: {
        user: {
            username: string;
            id: string;
            avatarUrl?: string | undefined;
        };
        durationMs: number;
        completedAt: string;
        rank: number;
        commandCount: number;
        travelDistance: number;
    }[];
    puzzle: {
        id: string;
        slug: string;
        title: string;
    };
    total: number;
}, {
    items: {
        user: {
            username: string;
            id: string;
            avatarUrl?: string | undefined;
        };
        durationMs: number;
        completedAt: string;
        rank: number;
        commandCount: number;
        travelDistance: number;
    }[];
    puzzle: {
        id: string;
        slug: string;
        title: string;
    };
    total: number;
}>;
export type AdminCreateACPuzzle = z.infer<typeof AdminCreateACPuzzleSchema>;
export type AdminUpdateACPuzzle = z.infer<typeof AdminUpdateACPuzzleSchema>;
export type AdminSaveMazeVersion = z.infer<typeof AdminSaveMazeVersionSchema>;
export type AdminListACPuzzlesQuery = z.infer<typeof AdminListACPuzzlesQuerySchema>;
export type AdminACPuzzleVersion = z.infer<typeof AdminACPuzzleVersionSchema>;
export type AdminACPuzzleListItem = z.infer<typeof AdminACPuzzleListItemSchema>;
export type AdminListACPuzzlesResponse = z.infer<typeof AdminListACPuzzlesResponseSchema>;
export type AdminACPuzzleDetail = z.infer<typeof AdminACPuzzleDetailSchema>;
export type AdminValidatePuzzleResponse = z.infer<typeof AdminValidatePuzzleResponseSchema>;
export type AdminACPuzzleAttempt = z.infer<typeof AdminACPuzzleAttemptSchema>;
export type AdminListAttemptsResponse = z.infer<typeof AdminListAttemptsResponseSchema>;
export type AdminAttemptReplay = z.infer<typeof AdminAttemptReplaySchema>;
export type AdminLeaderboardItem = z.infer<typeof AdminLeaderboardItemSchema>;
export type AdminPuzzleLeaderboardResponse = z.infer<typeof AdminPuzzleLeaderboardResponseSchema>;
//# sourceMappingURL=absolute-command-admin.d.ts.map