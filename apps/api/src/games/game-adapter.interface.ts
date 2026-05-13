export interface StartAttemptInput {
  userId: string;
  gameId: string;
  difficultyKey: string;
}

export interface StartAttemptResult {
  seed: string;
  initialState: unknown;
  metrics?: Record<string, unknown>;
}

export interface FinishAttemptInput {
  attempt: {
    id: string;
    seed: string;
    initialState: unknown;
    difficultyKey: string;
    startedAt: Date;
  };
  payload: unknown;
  completedAt: Date;
}

export interface FinishAttemptResult {
  valid: boolean;
  invalidReason?: string;
  finalState?: unknown;
  moveTrace?: unknown;
  metrics?: Record<string, unknown>;
  rankValue?: number;
}

export interface GameAdapter {
  slug: string;
  startAttempt(input: StartAttemptInput): Promise<StartAttemptResult>;
  finishAttempt(input: FinishAttemptInput): Promise<FinishAttemptResult>;
}
