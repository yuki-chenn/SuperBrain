import { z } from 'zod';
import type {
  RegisterSchema,
  LoginSchema,
  UserSchema,
  AuthResponseSchema,
} from './schemas/auth.js';
import type {
  DifficultyLevelSchema,
  GameSchema,
  GameListResponseSchema,
} from './schemas/games.js';
import type {
  SlidingPuzzleStateSchema,
  StartAttemptRequestSchema,
  StartAttemptResponseSchema,
  FinishAttemptRequestSchema,
  FinishAttemptResponseSchema,
} from './schemas/attempts.js';
import type {
  TieBreakerSchema,
  LeaderboardDefinitionSchema,
  LeaderboardEntrySchema,
  LeaderboardEntriesResponseSchema,
} from './schemas/leaderboards.js';
import type {
  LocalCellCoordSchema,
  LifeBoardStateSchema,
  LifeBoundaryRuleSchema,
  StartLifeAttemptResponseSchema,
  SubmitLifeRegionRequestSchema,
  SubmitLifeRegionResponseSchema,
  GetLifeAttemptResponseSchema,
  AbandonLifeAttemptResponseSchema,
} from './schemas/life-game.js';

// Auth
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type User = z.infer<typeof UserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// Games
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;
export type Game = z.infer<typeof GameSchema>;
export type GameListResponse = z.infer<typeof GameListResponseSchema>;

// Attempts
export type SlidingPuzzleState = z.infer<typeof SlidingPuzzleStateSchema>;
export type StartAttemptRequest = z.infer<typeof StartAttemptRequestSchema>;
export type StartAttemptResponse = z.infer<typeof StartAttemptResponseSchema>;
export type FinishAttemptRequest = z.infer<typeof FinishAttemptRequestSchema>;
export type FinishAttemptResponse = z.infer<typeof FinishAttemptResponseSchema>;

// Leaderboards
export type TieBreaker = z.infer<typeof TieBreakerSchema>;
export type LeaderboardDefinition = z.infer<typeof LeaderboardDefinitionSchema>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type LeaderboardEntriesResponse = z.infer<typeof LeaderboardEntriesResponseSchema>;

// Life Game
export type LocalCellCoord = z.infer<typeof LocalCellCoordSchema>;
export type LifeBoardState = z.infer<typeof LifeBoardStateSchema>;
export type LifeBoundaryRule = z.infer<typeof LifeBoundaryRuleSchema>;
export type StartLifeAttemptResponse = z.infer<typeof StartLifeAttemptResponseSchema>;
export type SubmitLifeRegionRequest = z.infer<typeof SubmitLifeRegionRequestSchema>;
export type SubmitLifeRegionResponse = z.infer<typeof SubmitLifeRegionResponseSchema>;
export type GetLifeAttemptResponse = z.infer<typeof GetLifeAttemptResponseSchema>;
export type AbandonLifeAttemptResponse = z.infer<typeof AbandonLifeAttemptResponseSchema>;
