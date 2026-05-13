import { z } from 'zod';

export const DifficultyLevelSchema = z.object({
  key: z.string(),
  label: z.string(),
  size: z.number().int().positive(),
});

export const GameSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  description: z.string(),
  source: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  difficultyLevels: z.array(DifficultyLevelSchema),
  metadata: z.record(z.unknown()).default({}),
});

export const GameListResponseSchema = z.object({
  items: z.array(GameSchema),
});
