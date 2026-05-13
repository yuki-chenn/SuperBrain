import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(128),
});

export const LoginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  role: z.enum(['USER', 'ADMIN']),
  avatarUrl: z.string().nullable().optional(),
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
});
