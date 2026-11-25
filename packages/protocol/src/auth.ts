import { z } from "zod";

export const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export const RegisterRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(USERNAME_REGEX, "Username may only contain letters, numbers, underscores, and hyphens"),
  password: z.string().min(8).max(128),
});

export const LoginRequestSchema = z.object({
  identifier: z.string().trim().min(3).max(255),
  password: z.string().min(1).max(128),
});

export const UserRoleSchema = z.enum(["player", "moderator", "admin"]);

export const TelegramAuthRequestSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().trim().min(1).max(255),
  last_name: z.string().trim().max(255).optional(),
  username: z.string().trim().max(64).optional(),
  photo_url: z.string().trim().url().max(1024).optional(),
  auth_date: z.number().int().positive(),
  hash: z.string().trim().regex(/^[0-9a-f]{64}$/i, "Invalid Telegram hash format"),
});

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  username: z.string().min(3).max(24),
  role: UserRoleSchema,
  isBanned: z.boolean(),
  telegramId: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const AuthResponseSchema = z.object({
  token: z.string().min(1),
  user: AuthUserSchema,
});

export const AuthMeResponseSchema = z.object({
  user: AuthUserSchema,
});

export const AuthErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "EMAIL_TAKEN",
  "USERNAME_TAKEN",
  "INVALID_CREDENTIALS",
  "ACCOUNT_BANNED",
  "INVALID_TELEGRAM_AUTH",
  "TELEGRAM_NOT_CONFIGURED",
  "UNAUTHORIZED",
  "GOOGLE_AUTH_NOT_CONFIGURED",
  "GOOGLE_AUTH_FAILED",
  "YANDEX_NOT_CONFIGURED",
  "YANDEX_INVALID_STATE",
  "YANDEX_ACCESS_DENIED",
  "YANDEX_AUTH_FAILED",
  "INTERNAL_ERROR",
]);

export type UserRole = z.infer<typeof UserRoleSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type TelegramAuthRequest = z.infer<typeof TelegramAuthRequestSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
export type AuthErrorCode = z.infer<typeof AuthErrorCodeSchema>;
