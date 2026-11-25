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

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(24),
  role: UserRoleSchema,
  isBanned: z.boolean(),
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
  "UNAUTHORIZED",
  "GOOGLE_AUTH_NOT_CONFIGURED",
  "GOOGLE_AUTH_FAILED",
  "INTERNAL_ERROR",
]);

export type UserRole = z.infer<typeof UserRoleSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
export type AuthErrorCode = z.infer<typeof AuthErrorCodeSchema>;
