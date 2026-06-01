import { z } from 'zod';
export declare const MazeCoordSchema: z.ZodObject<{
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
export declare const AbsoluteCommandDirectionSchema: z.ZodEnum<["X_POS", "X_NEG", "Y_POS", "Y_NEG", "Z_POS", "Z_NEG"]>;
export declare const AbsoluteCommandCellTypeSchema: z.ZodEnum<["NORMAL", "YELLOW_STOP", "NUMBER", "INITIAL_RED", "DISABLED", "START"]>;
export declare const AbsoluteCommandCellSchema: z.ZodObject<{
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
}>;
export declare const AbsoluteCommandNumberStateSchema: z.ZodObject<{
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
    requiredPasses: z.ZodNumber;
    remainingPasses: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    coord: {
        x: number;
        y: number;
        z: number;
    };
    requiredPasses: number;
    remainingPasses: number;
}, {
    coord: {
        x: number;
        y: number;
        z: number;
    };
    requiredPasses: number;
    remainingPasses: number;
}>;
export declare const AbsoluteCommandHistoryItemSchema: z.ZodObject<{
    index: z.ZodNumber;
    direction: z.ZodEnum<["X_POS", "X_NEG", "Y_POS", "Y_NEG", "Z_POS", "Z_NEG"]>;
    from: z.ZodObject<{
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
    to: z.ZodObject<{
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
    path: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
    stopReason: z.ZodEnum<["BOUNDARY", "DISABLED", "RED_BLOCK", "YELLOW_STOP"]>;
    changedNumberCells: z.ZodArray<z.ZodObject<{
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
        beforeRemaining: z.ZodNumber;
        afterRemaining: z.ZodNumber;
        becameRed: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        coord: {
            x: number;
            y: number;
            z: number;
        };
        beforeRemaining: number;
        afterRemaining: number;
        becameRed: boolean;
    }, {
        coord: {
            x: number;
            y: number;
            z: number;
        };
        beforeRemaining: number;
        afterRemaining: number;
        becameRed: boolean;
    }>, "many">;
    snapshotBefore: z.ZodAny;
    snapshotAfter: z.ZodAny;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    path: {
        x: number;
        y: number;
        z: number;
    }[];
    direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
    index: number;
    from: {
        x: number;
        y: number;
        z: number;
    };
    to: {
        x: number;
        y: number;
        z: number;
    };
    stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
    changedNumberCells: {
        coord: {
            x: number;
            y: number;
            z: number;
        };
        beforeRemaining: number;
        afterRemaining: number;
        becameRed: boolean;
    }[];
    createdAt: string;
    snapshotBefore?: any;
    snapshotAfter?: any;
}, {
    path: {
        x: number;
        y: number;
        z: number;
    }[];
    direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
    index: number;
    from: {
        x: number;
        y: number;
        z: number;
    };
    to: {
        x: number;
        y: number;
        z: number;
    };
    stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
    changedNumberCells: {
        coord: {
            x: number;
            y: number;
            z: number;
        };
        beforeRemaining: number;
        afterRemaining: number;
        becameRed: boolean;
    }[];
    createdAt: string;
    snapshotBefore?: any;
    snapshotAfter?: any;
}>;
export declare const AbsoluteCommandRuntimeStateSchema: z.ZodObject<{
    position: z.ZodObject<{
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
    visitedCells: z.ZodArray<z.ZodString, "many">;
    redCells: z.ZodArray<z.ZodString, "many">;
    numberStates: z.ZodArray<z.ZodObject<{
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
        requiredPasses: z.ZodNumber;
        remainingPasses: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        coord: {
            x: number;
            y: number;
            z: number;
        };
        requiredPasses: number;
        remainingPasses: number;
    }, {
        coord: {
            x: number;
            y: number;
            z: number;
        };
        requiredPasses: number;
        remainingPasses: number;
    }>, "many">;
    commandCount: z.ZodNumber;
    travelDistance: z.ZodNumber;
    commandHistory: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        direction: z.ZodEnum<["X_POS", "X_NEG", "Y_POS", "Y_NEG", "Z_POS", "Z_NEG"]>;
        from: z.ZodObject<{
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
        to: z.ZodObject<{
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
        path: z.ZodArray<z.ZodObject<{
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
        }>, "many">;
        stopReason: z.ZodEnum<["BOUNDARY", "DISABLED", "RED_BLOCK", "YELLOW_STOP"]>;
        changedNumberCells: z.ZodArray<z.ZodObject<{
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
            beforeRemaining: z.ZodNumber;
            afterRemaining: z.ZodNumber;
            becameRed: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            beforeRemaining: number;
            afterRemaining: number;
            becameRed: boolean;
        }, {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            beforeRemaining: number;
            afterRemaining: number;
            becameRed: boolean;
        }>, "many">;
        snapshotBefore: z.ZodAny;
        snapshotAfter: z.ZodAny;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: {
            x: number;
            y: number;
            z: number;
        }[];
        direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
        index: number;
        from: {
            x: number;
            y: number;
            z: number;
        };
        to: {
            x: number;
            y: number;
            z: number;
        };
        stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
        changedNumberCells: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            beforeRemaining: number;
            afterRemaining: number;
            becameRed: boolean;
        }[];
        createdAt: string;
        snapshotBefore?: any;
        snapshotAfter?: any;
    }, {
        path: {
            x: number;
            y: number;
            z: number;
        }[];
        direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
        index: number;
        from: {
            x: number;
            y: number;
            z: number;
        };
        to: {
            x: number;
            y: number;
            z: number;
        };
        stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
        changedNumberCells: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            beforeRemaining: number;
            afterRemaining: number;
            becameRed: boolean;
        }[];
        createdAt: string;
        snapshotBefore?: any;
        snapshotAfter?: any;
    }>, "many">;
    completed: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    position: {
        x: number;
        y: number;
        z: number;
    };
    visitedCells: string[];
    redCells: string[];
    numberStates: {
        coord: {
            x: number;
            y: number;
            z: number;
        };
        requiredPasses: number;
        remainingPasses: number;
    }[];
    commandCount: number;
    travelDistance: number;
    commandHistory: {
        path: {
            x: number;
            y: number;
            z: number;
        }[];
        direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
        index: number;
        from: {
            x: number;
            y: number;
            z: number;
        };
        to: {
            x: number;
            y: number;
            z: number;
        };
        stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
        changedNumberCells: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            beforeRemaining: number;
            afterRemaining: number;
            becameRed: boolean;
        }[];
        createdAt: string;
        snapshotBefore?: any;
        snapshotAfter?: any;
    }[];
    completed: boolean;
}, {
    position: {
        x: number;
        y: number;
        z: number;
    };
    visitedCells: string[];
    redCells: string[];
    numberStates: {
        coord: {
            x: number;
            y: number;
            z: number;
        };
        requiredPasses: number;
        remainingPasses: number;
    }[];
    commandCount: number;
    travelDistance: number;
    commandHistory: {
        path: {
            x: number;
            y: number;
            z: number;
        }[];
        direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
        index: number;
        from: {
            x: number;
            y: number;
            z: number;
        };
        to: {
            x: number;
            y: number;
            z: number;
        };
        stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
        changedNumberCells: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            beforeRemaining: number;
            afterRemaining: number;
            becameRed: boolean;
        }[];
        createdAt: string;
        snapshotBefore?: any;
        snapshotAfter?: any;
    }[];
    completed: boolean;
}>;
export declare const StartAbsoluteCommandAttemptResponseSchema: z.ZodObject<{
    attemptId: z.ZodString;
    puzzle: z.ZodObject<{
        id: z.ZodString;
        slug: z.ZodString;
        title: z.ZodString;
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
    }, "strip", z.ZodTypeAny, {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        slug: string;
        title: string;
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
        version: number;
        startCoord: {
            x: number;
            y: number;
            z: number;
        };
    }, {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        slug: string;
        title: string;
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
        version: number;
        startCoord: {
            x: number;
            y: number;
            z: number;
        };
    }>;
    state: z.ZodObject<{
        position: z.ZodObject<{
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
        visitedCells: z.ZodArray<z.ZodString, "many">;
        redCells: z.ZodArray<z.ZodString, "many">;
        numberStates: z.ZodArray<z.ZodObject<{
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
            requiredPasses: z.ZodNumber;
            remainingPasses: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }, {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }>, "many">;
        commandCount: z.ZodNumber;
        travelDistance: z.ZodNumber;
        commandHistory: z.ZodArray<z.ZodObject<{
            index: z.ZodNumber;
            direction: z.ZodEnum<["X_POS", "X_NEG", "Y_POS", "Y_NEG", "Z_POS", "Z_NEG"]>;
            from: z.ZodObject<{
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
            to: z.ZodObject<{
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
            path: z.ZodArray<z.ZodObject<{
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
            }>, "many">;
            stopReason: z.ZodEnum<["BOUNDARY", "DISABLED", "RED_BLOCK", "YELLOW_STOP"]>;
            changedNumberCells: z.ZodArray<z.ZodObject<{
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
                beforeRemaining: z.ZodNumber;
                afterRemaining: z.ZodNumber;
                becameRed: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }, {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }>, "many">;
            snapshotBefore: z.ZodAny;
            snapshotAfter: z.ZodAny;
            createdAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }, {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }>, "many">;
        completed: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    }, {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    }>;
    startedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    attemptId: string;
    startedAt: string;
    state: {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    };
    puzzle: {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        slug: string;
        title: string;
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
        version: number;
        startCoord: {
            x: number;
            y: number;
            z: number;
        };
    };
}, {
    attemptId: string;
    startedAt: string;
    state: {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    };
    puzzle: {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        slug: string;
        title: string;
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
        version: number;
        startCoord: {
            x: number;
            y: number;
            z: number;
        };
    };
}>;
export declare const ExecuteAbsoluteCommandRequestSchema: z.ZodObject<{
    direction: z.ZodEnum<["X_POS", "X_NEG", "Y_POS", "Y_NEG", "Z_POS", "Z_NEG"]>;
}, "strip", z.ZodTypeAny, {
    direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
}, {
    direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
}>;
export declare const ExecuteAbsoluteCommandResponseSchema: z.ZodObject<{
    moved: z.ZodBoolean;
    invalidReason: z.ZodOptional<z.ZodEnum<["NO_MOVEMENT", "ATTEMPT_NOT_ACTIVE"]>>;
    state: z.ZodObject<{
        position: z.ZodObject<{
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
        visitedCells: z.ZodArray<z.ZodString, "many">;
        redCells: z.ZodArray<z.ZodString, "many">;
        numberStates: z.ZodArray<z.ZodObject<{
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
            requiredPasses: z.ZodNumber;
            remainingPasses: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }, {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }>, "many">;
        commandCount: z.ZodNumber;
        travelDistance: z.ZodNumber;
        commandHistory: z.ZodArray<z.ZodObject<{
            index: z.ZodNumber;
            direction: z.ZodEnum<["X_POS", "X_NEG", "Y_POS", "Y_NEG", "Z_POS", "Z_NEG"]>;
            from: z.ZodObject<{
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
            to: z.ZodObject<{
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
            path: z.ZodArray<z.ZodObject<{
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
            }>, "many">;
            stopReason: z.ZodEnum<["BOUNDARY", "DISABLED", "RED_BLOCK", "YELLOW_STOP"]>;
            changedNumberCells: z.ZodArray<z.ZodObject<{
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
                beforeRemaining: z.ZodNumber;
                afterRemaining: z.ZodNumber;
                becameRed: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }, {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }>, "many">;
            snapshotBefore: z.ZodAny;
            snapshotAfter: z.ZodAny;
            createdAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }, {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }>, "many">;
        completed: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    }, {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    }>;
    commandResult: z.ZodOptional<z.ZodObject<{
        direction: z.ZodEnum<["X_POS", "X_NEG", "Y_POS", "Y_NEG", "Z_POS", "Z_NEG"]>;
        from: z.ZodObject<{
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
        to: z.ZodObject<{
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
        path: z.ZodArray<z.ZodObject<{
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
        }>, "many">;
        stopReason: z.ZodEnum<["BOUNDARY", "DISABLED", "RED_BLOCK", "YELLOW_STOP"]>;
        commandCount: z.ZodNumber;
        travelDistanceDelta: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        path: {
            x: number;
            y: number;
            z: number;
        }[];
        direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
        from: {
            x: number;
            y: number;
            z: number;
        };
        to: {
            x: number;
            y: number;
            z: number;
        };
        stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
        commandCount: number;
        travelDistanceDelta: number;
    }, {
        path: {
            x: number;
            y: number;
            z: number;
        }[];
        direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
        from: {
            x: number;
            y: number;
            z: number;
        };
        to: {
            x: number;
            y: number;
            z: number;
        };
        stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
        commandCount: number;
        travelDistanceDelta: number;
    }>>;
    completed: z.ZodBoolean;
    result: z.ZodOptional<z.ZodObject<{
        commandCount: z.ZodNumber;
        durationMs: z.ZodNumber;
        travelDistance: z.ZodNumber;
        rank: z.ZodOptional<z.ZodNumber>;
        personalBest: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        durationMs: number;
        personalBest: boolean;
        commandCount: number;
        travelDistance: number;
        rank?: number | undefined;
    }, {
        durationMs: number;
        personalBest: boolean;
        commandCount: number;
        travelDistance: number;
        rank?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    state: {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    };
    completed: boolean;
    moved: boolean;
    result?: {
        durationMs: number;
        personalBest: boolean;
        commandCount: number;
        travelDistance: number;
        rank?: number | undefined;
    } | undefined;
    invalidReason?: "NO_MOVEMENT" | "ATTEMPT_NOT_ACTIVE" | undefined;
    commandResult?: {
        path: {
            x: number;
            y: number;
            z: number;
        }[];
        direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
        from: {
            x: number;
            y: number;
            z: number;
        };
        to: {
            x: number;
            y: number;
            z: number;
        };
        stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
        commandCount: number;
        travelDistanceDelta: number;
    } | undefined;
}, {
    state: {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    };
    completed: boolean;
    moved: boolean;
    result?: {
        durationMs: number;
        personalBest: boolean;
        commandCount: number;
        travelDistance: number;
        rank?: number | undefined;
    } | undefined;
    invalidReason?: "NO_MOVEMENT" | "ATTEMPT_NOT_ACTIVE" | undefined;
    commandResult?: {
        path: {
            x: number;
            y: number;
            z: number;
        }[];
        direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
        from: {
            x: number;
            y: number;
            z: number;
        };
        to: {
            x: number;
            y: number;
            z: number;
        };
        stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
        commandCount: number;
        travelDistanceDelta: number;
    } | undefined;
}>;
export declare const UndoAbsoluteCommandResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    state: z.ZodObject<{
        position: z.ZodObject<{
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
        visitedCells: z.ZodArray<z.ZodString, "many">;
        redCells: z.ZodArray<z.ZodString, "many">;
        numberStates: z.ZodArray<z.ZodObject<{
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
            requiredPasses: z.ZodNumber;
            remainingPasses: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }, {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }>, "many">;
        commandCount: z.ZodNumber;
        travelDistance: z.ZodNumber;
        commandHistory: z.ZodArray<z.ZodObject<{
            index: z.ZodNumber;
            direction: z.ZodEnum<["X_POS", "X_NEG", "Y_POS", "Y_NEG", "Z_POS", "Z_NEG"]>;
            from: z.ZodObject<{
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
            to: z.ZodObject<{
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
            path: z.ZodArray<z.ZodObject<{
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
            }>, "many">;
            stopReason: z.ZodEnum<["BOUNDARY", "DISABLED", "RED_BLOCK", "YELLOW_STOP"]>;
            changedNumberCells: z.ZodArray<z.ZodObject<{
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
                beforeRemaining: z.ZodNumber;
                afterRemaining: z.ZodNumber;
                becameRed: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }, {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }>, "many">;
            snapshotBefore: z.ZodAny;
            snapshotAfter: z.ZodAny;
            createdAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }, {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }>, "many">;
        completed: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    }, {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    state: {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    };
}, {
    success: boolean;
    state: {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    };
}>;
export declare const ResetAbsoluteCommandResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    state: z.ZodObject<{
        position: z.ZodObject<{
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
        visitedCells: z.ZodArray<z.ZodString, "many">;
        redCells: z.ZodArray<z.ZodString, "many">;
        numberStates: z.ZodArray<z.ZodObject<{
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
            requiredPasses: z.ZodNumber;
            remainingPasses: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }, {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }>, "many">;
        commandCount: z.ZodNumber;
        travelDistance: z.ZodNumber;
        commandHistory: z.ZodArray<z.ZodObject<{
            index: z.ZodNumber;
            direction: z.ZodEnum<["X_POS", "X_NEG", "Y_POS", "Y_NEG", "Z_POS", "Z_NEG"]>;
            from: z.ZodObject<{
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
            to: z.ZodObject<{
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
            path: z.ZodArray<z.ZodObject<{
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
            }>, "many">;
            stopReason: z.ZodEnum<["BOUNDARY", "DISABLED", "RED_BLOCK", "YELLOW_STOP"]>;
            changedNumberCells: z.ZodArray<z.ZodObject<{
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
                beforeRemaining: z.ZodNumber;
                afterRemaining: z.ZodNumber;
                becameRed: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }, {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }>, "many">;
            snapshotBefore: z.ZodAny;
            snapshotAfter: z.ZodAny;
            createdAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }, {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }>, "many">;
        completed: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    }, {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    state: {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    };
}, {
    success: boolean;
    state: {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    };
}>;
export declare const GetAbsoluteCommandAttemptResponseSchema: z.ZodObject<{
    attemptId: z.ZodString;
    status: z.ZodEnum<["STARTED", "COMPLETED", "FAILED"]>;
    puzzle: z.ZodObject<{
        id: z.ZodString;
        slug: z.ZodString;
        title: z.ZodString;
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
    }, "strip", z.ZodTypeAny, {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        slug: string;
        title: string;
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
        version: number;
        startCoord: {
            x: number;
            y: number;
            z: number;
        };
    }, {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        slug: string;
        title: string;
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
        version: number;
        startCoord: {
            x: number;
            y: number;
            z: number;
        };
    }>;
    state: z.ZodObject<{
        position: z.ZodObject<{
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
        visitedCells: z.ZodArray<z.ZodString, "many">;
        redCells: z.ZodArray<z.ZodString, "many">;
        numberStates: z.ZodArray<z.ZodObject<{
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
            requiredPasses: z.ZodNumber;
            remainingPasses: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }, {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }>, "many">;
        commandCount: z.ZodNumber;
        travelDistance: z.ZodNumber;
        commandHistory: z.ZodArray<z.ZodObject<{
            index: z.ZodNumber;
            direction: z.ZodEnum<["X_POS", "X_NEG", "Y_POS", "Y_NEG", "Z_POS", "Z_NEG"]>;
            from: z.ZodObject<{
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
            to: z.ZodObject<{
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
            path: z.ZodArray<z.ZodObject<{
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
            }>, "many">;
            stopReason: z.ZodEnum<["BOUNDARY", "DISABLED", "RED_BLOCK", "YELLOW_STOP"]>;
            changedNumberCells: z.ZodArray<z.ZodObject<{
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
                beforeRemaining: z.ZodNumber;
                afterRemaining: z.ZodNumber;
                becameRed: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }, {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }>, "many">;
            snapshotBefore: z.ZodAny;
            snapshotAfter: z.ZodAny;
            createdAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }, {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }>, "many">;
        completed: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    }, {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    }>;
    startedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    metrics: z.ZodOptional<z.ZodObject<{
        commandCount: z.ZodNumber;
        durationMs: z.ZodNumber;
        travelDistance: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        durationMs: number;
        commandCount: number;
        travelDistance: number;
    }, {
        durationMs: number;
        commandCount: number;
        travelDistance: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "COMPLETED" | "STARTED" | "FAILED";
    attemptId: string;
    startedAt: string;
    state: {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    };
    puzzle: {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        slug: string;
        title: string;
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
        version: number;
        startCoord: {
            x: number;
            y: number;
            z: number;
        };
    };
    metrics?: {
        durationMs: number;
        commandCount: number;
        travelDistance: number;
    } | undefined;
    completedAt?: string | undefined;
}, {
    status: "COMPLETED" | "STARTED" | "FAILED";
    attemptId: string;
    startedAt: string;
    state: {
        position: {
            x: number;
            y: number;
            z: number;
        };
        visitedCells: string[];
        redCells: string[];
        numberStates: {
            coord: {
                x: number;
                y: number;
                z: number;
            };
            requiredPasses: number;
            remainingPasses: number;
        }[];
        commandCount: number;
        travelDistance: number;
        commandHistory: {
            path: {
                x: number;
                y: number;
                z: number;
            }[];
            direction: "X_POS" | "X_NEG" | "Y_POS" | "Y_NEG" | "Z_POS" | "Z_NEG";
            index: number;
            from: {
                x: number;
                y: number;
                z: number;
            };
            to: {
                x: number;
                y: number;
                z: number;
            };
            stopReason: "YELLOW_STOP" | "DISABLED" | "BOUNDARY" | "RED_BLOCK";
            changedNumberCells: {
                coord: {
                    x: number;
                    y: number;
                    z: number;
                };
                beforeRemaining: number;
                afterRemaining: number;
                becameRed: boolean;
            }[];
            createdAt: string;
            snapshotBefore?: any;
            snapshotAfter?: any;
        }[];
        completed: boolean;
    };
    puzzle: {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        slug: string;
        title: string;
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
        version: number;
        startCoord: {
            x: number;
            y: number;
            z: number;
        };
    };
    metrics?: {
        durationMs: number;
        commandCount: number;
        travelDistance: number;
    } | undefined;
    completedAt?: string | undefined;
}>;
export declare const AbandonAbsoluteCommandResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    success: boolean;
}, {
    success: boolean;
}>;
export declare const ListAbsoluteCommandPuzzlesResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        slug: z.ZodString;
        title: z.ZodString;
        difficultyLabel: z.ZodOptional<z.ZodString>;
        estimatedDuration: z.ZodOptional<z.ZodString>;
        optimalCommandCount: z.ZodOptional<z.ZodNumber>;
        completedCount: z.ZodNumber;
        bestRecord: z.ZodOptional<z.ZodObject<{
            username: z.ZodString;
            commandCount: z.ZodNumber;
            durationMs: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            username: string;
            durationMs: number;
            commandCount: number;
        }, {
            username: string;
            durationMs: number;
            commandCount: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        slug: string;
        title: string;
        completedCount: number;
        difficultyLabel?: string | undefined;
        estimatedDuration?: string | undefined;
        optimalCommandCount?: number | undefined;
        bestRecord?: {
            username: string;
            durationMs: number;
            commandCount: number;
        } | undefined;
    }, {
        id: string;
        slug: string;
        title: string;
        completedCount: number;
        difficultyLabel?: string | undefined;
        estimatedDuration?: string | undefined;
        optimalCommandCount?: number | undefined;
        bestRecord?: {
            username: string;
            durationMs: number;
            commandCount: number;
        } | undefined;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    items: {
        id: string;
        slug: string;
        title: string;
        completedCount: number;
        difficultyLabel?: string | undefined;
        estimatedDuration?: string | undefined;
        optimalCommandCount?: number | undefined;
        bestRecord?: {
            username: string;
            durationMs: number;
            commandCount: number;
        } | undefined;
    }[];
    total: number;
}, {
    items: {
        id: string;
        slug: string;
        title: string;
        completedCount: number;
        difficultyLabel?: string | undefined;
        estimatedDuration?: string | undefined;
        optimalCommandCount?: number | undefined;
        bestRecord?: {
            username: string;
            durationMs: number;
            commandCount: number;
        } | undefined;
    }[];
    total: number;
}>;
export declare const GetAbsoluteCommandPuzzleDetailResponseSchema: z.ZodObject<{
    puzzle: z.ZodObject<{
        id: z.ZodString;
        slug: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        difficultyLabel: z.ZodOptional<z.ZodString>;
        estimatedDuration: z.ZodOptional<z.ZodString>;
        optimalCommandCount: z.ZodOptional<z.ZodNumber>;
        source: z.ZodOptional<z.ZodString>;
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
    }, "strip", z.ZodTypeAny, {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        slug: string;
        title: string;
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
        description?: string | undefined;
        source?: string | undefined;
        difficultyLabel?: string | undefined;
        estimatedDuration?: string | undefined;
        optimalCommandCount?: number | undefined;
    }, {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        slug: string;
        title: string;
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
        description?: string | undefined;
        source?: string | undefined;
        difficultyLabel?: string | undefined;
        estimatedDuration?: string | undefined;
        optimalCommandCount?: number | undefined;
    }>;
    leaderboardPreview: z.ZodObject<{
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
            commandCount: z.ZodNumber;
            durationMs: z.ZodNumber;
            completedAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            user: {
                username: string;
                id: string;
            };
            durationMs: number;
            completedAt: string;
            rank: number;
            commandCount: number;
        }, {
            user: {
                username: string;
                id: string;
            };
            durationMs: number;
            completedAt: string;
            rank: number;
            commandCount: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        items: {
            user: {
                username: string;
                id: string;
            };
            durationMs: number;
            completedAt: string;
            rank: number;
            commandCount: number;
        }[];
    }, {
        items: {
            user: {
                username: string;
                id: string;
            };
            durationMs: number;
            completedAt: string;
            rank: number;
            commandCount: number;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    puzzle: {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        slug: string;
        title: string;
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
        description?: string | undefined;
        source?: string | undefined;
        difficultyLabel?: string | undefined;
        estimatedDuration?: string | undefined;
        optimalCommandCount?: number | undefined;
    };
    leaderboardPreview: {
        items: {
            user: {
                username: string;
                id: string;
            };
            durationMs: number;
            completedAt: string;
            rank: number;
            commandCount: number;
        }[];
    };
}, {
    puzzle: {
        id: string;
        size: {
            width: number;
            height: number;
            depth: number;
        };
        slug: string;
        title: string;
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
        description?: string | undefined;
        source?: string | undefined;
        difficultyLabel?: string | undefined;
        estimatedDuration?: string | undefined;
        optimalCommandCount?: number | undefined;
    };
    leaderboardPreview: {
        items: {
            user: {
                username: string;
                id: string;
            };
            durationMs: number;
            completedAt: string;
            rank: number;
            commandCount: number;
        }[];
    };
}>;
export declare const GetPuzzleLeaderboardResponseSchema: z.ZodObject<{
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
    myBest: z.ZodOptional<z.ZodObject<{
        rank: z.ZodNumber;
        commandCount: z.ZodNumber;
        durationMs: z.ZodNumber;
        travelDistance: z.ZodNumber;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        durationMs: number;
        completedAt: string;
        rank: number;
        commandCount: number;
        travelDistance: number;
    }, {
        durationMs: number;
        completedAt: string;
        rank: number;
        commandCount: number;
        travelDistance: number;
    }>>;
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
    myBest?: {
        durationMs: number;
        completedAt: string;
        rank: number;
        commandCount: number;
        travelDistance: number;
    } | undefined;
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
    myBest?: {
        durationMs: number;
        completedAt: string;
        rank: number;
        commandCount: number;
        travelDistance: number;
    } | undefined;
}>;
export type StartAbsoluteCommandAttemptResponse = z.infer<typeof StartAbsoluteCommandAttemptResponseSchema>;
export type ExecuteAbsoluteCommandRequest = z.infer<typeof ExecuteAbsoluteCommandRequestSchema>;
export type ExecuteAbsoluteCommandResponse = z.infer<typeof ExecuteAbsoluteCommandResponseSchema>;
export type UndoAbsoluteCommandResponse = z.infer<typeof UndoAbsoluteCommandResponseSchema>;
export type ResetAbsoluteCommandResponse = z.infer<typeof ResetAbsoluteCommandResponseSchema>;
export type GetAbsoluteCommandAttemptResponse = z.infer<typeof GetAbsoluteCommandAttemptResponseSchema>;
export type AbandonAbsoluteCommandResponse = z.infer<typeof AbandonAbsoluteCommandResponseSchema>;
export type ListAbsoluteCommandPuzzlesResponse = z.infer<typeof ListAbsoluteCommandPuzzlesResponseSchema>;
export type GetAbsoluteCommandPuzzleDetailResponse = z.infer<typeof GetAbsoluteCommandPuzzleDetailResponseSchema>;
export type GetPuzzleLeaderboardResponse = z.infer<typeof GetPuzzleLeaderboardResponseSchema>;
//# sourceMappingURL=absolute-command.d.ts.map