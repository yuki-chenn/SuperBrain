import { z } from 'zod';
export declare const RadicalSchema: z.ZodObject<{
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
}>;
export declare const CharacterCellSchema: z.ZodObject<{
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
}>;
export declare const PCBConfigSchema: z.ZodObject<{
    picksPerRound: z.ZodNumber;
    adjacencyMode: z.ZodEnum<["KING_8", "ORTHOGONAL_4"]>;
    cooldownRounds: z.ZodNumber;
    allowRadicalRepeatInRound: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    picksPerRound: number;
    adjacencyMode: "ORTHOGONAL_4" | "KING_8";
    cooldownRounds: number;
    allowRadicalRepeatInRound: boolean;
}, {
    picksPerRound: number;
    adjacencyMode: "ORTHOGONAL_4" | "KING_8";
    cooldownRounds: number;
    allowRadicalRepeatInRound: boolean;
}>;
export declare const StartPCBAttemptRequestSchema: z.ZodObject<{
    difficultyKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    difficultyKey: string;
}, {
    difficultyKey: string;
}>;
export declare const StartPCBAttemptResponseSchema: z.ZodObject<{
    attemptId: z.ZodString;
    gameSlug: z.ZodString;
    difficultyKey: z.ZodString;
    maxDurationMs: z.ZodNumber;
    boardSize: z.ZodNumber;
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
    config: z.ZodObject<{
        picksPerRound: z.ZodNumber;
        adjacencyMode: z.ZodEnum<["KING_8", "ORTHOGONAL_4"]>;
        cooldownRounds: z.ZodNumber;
        allowRadicalRepeatInRound: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        picksPerRound: number;
        adjacencyMode: "ORTHOGONAL_4" | "KING_8";
        cooldownRounds: number;
        allowRadicalRepeatInRound: boolean;
    }, {
        picksPerRound: number;
        adjacencyMode: "ORTHOGONAL_4" | "KING_8";
        cooldownRounds: number;
        allowRadicalRepeatInRound: boolean;
    }>;
    state: z.ZodObject<{
        currentRoundIndex: z.ZodNumber;
        currentPosition: z.ZodNullable<z.ZodObject<{
            row: z.ZodNumber;
            col: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            row: number;
            col: number;
        }, {
            row: number;
            col: number;
        }>>;
        litCellIndices: z.ZodArray<z.ZodNumber, "many">;
        disabledRadicalKeys: z.ZodArray<z.ZodString, "many">;
        errorCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        errorCount: number;
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    }, {
        errorCount: number;
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    }>;
    startedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    gameSlug: string;
    difficultyKey: string;
    attemptId: string;
    startedAt: string;
    maxDurationMs: number;
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
    config: {
        picksPerRound: number;
        adjacencyMode: "ORTHOGONAL_4" | "KING_8";
        cooldownRounds: number;
        allowRadicalRepeatInRound: boolean;
    };
    state: {
        errorCount: number;
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    };
}, {
    gameSlug: string;
    difficultyKey: string;
    attemptId: string;
    startedAt: string;
    maxDurationMs: number;
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
    config: {
        picksPerRound: number;
        adjacencyMode: "ORTHOGONAL_4" | "KING_8";
        cooldownRounds: number;
        allowRadicalRepeatInRound: boolean;
    };
    state: {
        errorCount: number;
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    };
}>;
export declare const SubmitPCBRoundRequestSchema: z.ZodObject<{
    selectedRadicalKeys: z.ZodArray<z.ZodString, "many">;
    selectedCellIndices: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    selectedRadicalKeys: string[];
    selectedCellIndices: number[];
}, {
    selectedRadicalKeys: string[];
    selectedCellIndices: number[];
}>;
export declare const SubmitPCBRoundResponseSchema: z.ZodObject<{
    correct: z.ZodBoolean;
    errorCount: z.ZodNumber;
    state: z.ZodObject<{
        currentRoundIndex: z.ZodNumber;
        currentPosition: z.ZodNullable<z.ZodObject<{
            row: z.ZodNumber;
            col: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            row: number;
            col: number;
        }, {
            row: number;
            col: number;
        }>>;
        litCellIndices: z.ZodArray<z.ZodNumber, "many">;
        disabledRadicalKeys: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    }, {
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    }>;
    roundResult: z.ZodOptional<z.ZodObject<{
        selectedCellIndices: z.ZodArray<z.ZodNumber, "many">;
        selectedRadicalKeys: z.ZodArray<z.ZodString, "many">;
        resultChars: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        selectedRadicalKeys: string[];
        selectedCellIndices: number[];
        resultChars: string[];
    }, {
        selectedRadicalKeys: string[];
        selectedCellIndices: number[];
        resultChars: string[];
    }>>;
    attemptCompleted: z.ZodBoolean;
    result: z.ZodOptional<z.ZodObject<{
        durationMs: z.ZodNumber;
        errorCount: z.ZodNumber;
        rounds: z.ZodNumber;
        litCells: z.ZodNumber;
        rank: z.ZodOptional<z.ZodNumber>;
        personalBest: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        durationMs: number;
        errorCount: number;
        personalBest: boolean;
        rounds: number;
        litCells: number;
        rank?: number | undefined;
    }, {
        durationMs: number;
        errorCount: number;
        personalBest: boolean;
        rounds: number;
        litCells: number;
        rank?: number | undefined;
    }>>;
    errorReason: z.ZodOptional<z.ZodEnum<["INVALID_PATH", "RADICAL_DISABLED", "INVALID_COMBINATION", "CELL_ALREADY_LIT", "ATTEMPT_NOT_STARTED"]>>;
}, "strip", z.ZodTypeAny, {
    correct: boolean;
    errorCount: number;
    attemptCompleted: boolean;
    state: {
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    };
    result?: {
        durationMs: number;
        errorCount: number;
        personalBest: boolean;
        rounds: number;
        litCells: number;
        rank?: number | undefined;
    } | undefined;
    roundResult?: {
        selectedRadicalKeys: string[];
        selectedCellIndices: number[];
        resultChars: string[];
    } | undefined;
    errorReason?: "INVALID_PATH" | "RADICAL_DISABLED" | "INVALID_COMBINATION" | "CELL_ALREADY_LIT" | "ATTEMPT_NOT_STARTED" | undefined;
}, {
    correct: boolean;
    errorCount: number;
    attemptCompleted: boolean;
    state: {
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    };
    result?: {
        durationMs: number;
        errorCount: number;
        personalBest: boolean;
        rounds: number;
        litCells: number;
        rank?: number | undefined;
    } | undefined;
    roundResult?: {
        selectedRadicalKeys: string[];
        selectedCellIndices: number[];
        resultChars: string[];
    } | undefined;
    errorReason?: "INVALID_PATH" | "RADICAL_DISABLED" | "INVALID_COMBINATION" | "CELL_ALREADY_LIT" | "ATTEMPT_NOT_STARTED" | undefined;
}>;
export declare const PCBStateSchema: z.ZodObject<{
    currentRoundIndex: z.ZodNumber;
    currentPosition: z.ZodNullable<z.ZodObject<{
        row: z.ZodNumber;
        col: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        row: number;
        col: number;
    }, {
        row: number;
        col: number;
    }>>;
    litCellIndices: z.ZodArray<z.ZodNumber, "many">;
    disabledRadicalKeys: z.ZodArray<z.ZodString, "many">;
    errorCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    errorCount: number;
    currentRoundIndex: number;
    currentPosition: {
        row: number;
        col: number;
    } | null;
    litCellIndices: number[];
    disabledRadicalKeys: string[];
}, {
    errorCount: number;
    currentRoundIndex: number;
    currentPosition: {
        row: number;
        col: number;
    } | null;
    litCellIndices: number[];
    disabledRadicalKeys: string[];
}>;
export declare const GetPCBAttemptResponseSchema: z.ZodObject<{
    attemptId: z.ZodString;
    status: z.ZodEnum<["STARTED", "COMPLETED", "FAILED"]>;
    difficultyKey: z.ZodString;
    maxDurationMs: z.ZodNumber;
    boardSize: z.ZodNumber;
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
    config: z.ZodObject<{
        picksPerRound: z.ZodNumber;
        adjacencyMode: z.ZodEnum<["KING_8", "ORTHOGONAL_4"]>;
        cooldownRounds: z.ZodNumber;
        allowRadicalRepeatInRound: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        picksPerRound: number;
        adjacencyMode: "ORTHOGONAL_4" | "KING_8";
        cooldownRounds: number;
        allowRadicalRepeatInRound: boolean;
    }, {
        picksPerRound: number;
        adjacencyMode: "ORTHOGONAL_4" | "KING_8";
        cooldownRounds: number;
        allowRadicalRepeatInRound: boolean;
    }>;
    state: z.ZodObject<{
        currentRoundIndex: z.ZodNumber;
        currentPosition: z.ZodNullable<z.ZodObject<{
            row: z.ZodNumber;
            col: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            row: number;
            col: number;
        }, {
            row: number;
            col: number;
        }>>;
        litCellIndices: z.ZodArray<z.ZodNumber, "many">;
        disabledRadicalKeys: z.ZodArray<z.ZodString, "many">;
        errorCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        errorCount: number;
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    }, {
        errorCount: number;
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    }>;
    litResults: z.ZodArray<z.ZodObject<{
        cellIndex: z.ZodNumber;
        radicalKey: z.ZodString;
        resultChar: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        cellIndex: number;
        radicalKey: string;
        resultChar: string;
    }, {
        cellIndex: number;
        radicalKey: string;
        resultChar: string;
    }>, "many">;
    startedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    metrics: z.ZodOptional<z.ZodObject<{
        durationMs: z.ZodNumber;
        errorCount: z.ZodNumber;
        rounds: z.ZodNumber;
        litCells: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        durationMs: number;
        errorCount: number;
        rounds: number;
        litCells: number;
    }, {
        durationMs: number;
        errorCount: number;
        rounds: number;
        litCells: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "COMPLETED" | "STARTED" | "FAILED";
    difficultyKey: string;
    attemptId: string;
    startedAt: string;
    maxDurationMs: number;
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
    config: {
        picksPerRound: number;
        adjacencyMode: "ORTHOGONAL_4" | "KING_8";
        cooldownRounds: number;
        allowRadicalRepeatInRound: boolean;
    };
    state: {
        errorCount: number;
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    };
    litResults: {
        cellIndex: number;
        radicalKey: string;
        resultChar: string;
    }[];
    metrics?: {
        durationMs: number;
        errorCount: number;
        rounds: number;
        litCells: number;
    } | undefined;
    completedAt?: string | undefined;
}, {
    status: "COMPLETED" | "STARTED" | "FAILED";
    difficultyKey: string;
    attemptId: string;
    startedAt: string;
    maxDurationMs: number;
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
    config: {
        picksPerRound: number;
        adjacencyMode: "ORTHOGONAL_4" | "KING_8";
        cooldownRounds: number;
        allowRadicalRepeatInRound: boolean;
    };
    state: {
        errorCount: number;
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    };
    litResults: {
        cellIndex: number;
        radicalKey: string;
        resultChar: string;
    }[];
    metrics?: {
        durationMs: number;
        errorCount: number;
        rounds: number;
        litCells: number;
    } | undefined;
    completedAt?: string | undefined;
}>;
export declare const AbandonPCBAttemptResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    success: boolean;
}, {
    success: boolean;
}>;
export declare const ResetPCBAttemptResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    startedAt: z.ZodString;
    state: z.ZodObject<{
        currentRoundIndex: z.ZodNumber;
        currentPosition: z.ZodNullable<z.ZodObject<{
            row: z.ZodNumber;
            col: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            row: number;
            col: number;
        }, {
            row: number;
            col: number;
        }>>;
        litCellIndices: z.ZodArray<z.ZodNumber, "many">;
        disabledRadicalKeys: z.ZodArray<z.ZodString, "many">;
        errorCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        errorCount: number;
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    }, {
        errorCount: number;
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    startedAt: string;
    success: boolean;
    state: {
        errorCount: number;
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    };
}, {
    startedAt: string;
    success: boolean;
    state: {
        errorCount: number;
        currentRoundIndex: number;
        currentPosition: {
            row: number;
            col: number;
        } | null;
        litCellIndices: number[];
        disabledRadicalKeys: string[];
    };
}>;
//# sourceMappingURL=precise-character-building.d.ts.map