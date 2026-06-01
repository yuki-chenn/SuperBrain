import type {
  GameAttempt, GameRuleSetVersion, GameDifficulty,
  GameContentPolicy, GameChallengePolicy, ChallengeMode, ContentMode,
  PuzzleVersion, SubmissionType, SnapshotType,
} from '@prisma/client';

export interface StartAttemptInput {
  game: { id: string; slug: string };
  ruleSetVersion: GameRuleSetVersion;
  difficulty: GameDifficulty | null;
  contentPolicy: GameContentPolicy | null;
  challengePolicy: GameChallengePolicy | null;
  mode: ChallengeMode;
  userId: string;
  puzzleVersion?: PuzzleVersion | null;
}

export interface StartAttemptResult {
  seed?: string;
  initialState: unknown;
  contentResolvedType: ContentMode;
  puzzleId?: string;
  puzzleVersionId?: string;
  generatedContentHash?: string;
  maxDurationMs: number;
}

export interface FinishAttemptInput {
  attempt: GameAttempt;
  ruleSetVersion: GameRuleSetVersion;
  difficulty: GameDifficulty | null;
  puzzleVersion?: PuzzleVersion | null;
  finalState: unknown;
  metrics?: Record<string, unknown>;
}

export interface FinishAttemptResult {
  passed: boolean;
  scoreValue?: number;
  durationMs?: number;
  metrics: Record<string, unknown>;
  antiCheatFlags: string[];
  validatorKey: string;
  validatorVersion?: string;
}

export interface VerifySubmissionInput {
  attempt: GameAttempt;
  ruleSetVersion: GameRuleSetVersion;
  difficulty: GameDifficulty | null;
  puzzleVersion?: PuzzleVersion | null;
  submissionType: SubmissionType;
  payload: unknown;
  hints?: { roundIndex?: number; regionId?: string; seq?: number };
}

export interface VerifySubmissionResult {
  accepted: boolean;
  reason?: string;
  result: Record<string, unknown>;
  metricsDelta?: Record<string, number>;
  snapshot?: { type: SnapshotType; state: unknown; metadata?: Record<string, unknown> };
  finalReady?: boolean;
}

export interface GameRuntimeAdapter {
  engineKey: string;
  startAttempt(input: StartAttemptInput): Promise<StartAttemptResult>;
  finishAttempt(input: FinishAttemptInput): Promise<FinishAttemptResult>;
  verifySubmission?(input: VerifySubmissionInput): Promise<VerifySubmissionResult>;
}
