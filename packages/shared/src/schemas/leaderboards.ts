import { z } from 'zod';

export const TieBreakerSchema = z.object({
  metric: z.string(),
  direction: z.enum(['ASC', 'DESC']),
});

export const LeaderboardDefinitionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  scope: z.enum(['GLOBAL', 'DAILY', 'WEEKLY', 'FRIENDS']),
  difficultyKey: z.string().nullable().optional(),
  rankMetric: z.string(),
  rankDirection: z.enum(['ASC', 'DESC']),
  tieBreakers: z.array(TieBreakerSchema),
  entryPolicy: z.enum(['BEST_PER_USER', 'ALL_ATTEMPTS']),
  metadata: z.record(z.unknown()).optional(),
});

export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  user: z.object({
    id: z.string(),
    username: z.string(),
  }),
  metrics: z.record(z.unknown()),
  completedAt: z.string(),
});

export const LeaderboardEntriesResponseSchema = z.object({
  leaderboard: LeaderboardDefinitionSchema,
  items: z.array(LeaderboardEntrySchema),
});
