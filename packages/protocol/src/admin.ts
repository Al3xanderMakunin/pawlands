import { z } from "zod";
import { UserRoleSchema } from "./auth.js";

export const AdminErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CANNOT_MODIFY_SELF",
  "INTERNAL_ERROR",
]);

export const AdminStatsSchema = z.object({
  totalUsers: z.number().int().nonnegative(),
  bannedUsers: z.number().int().nonnegative(),
  adminUsers: z.number().int().nonnegative(),
  moderatorUsers: z.number().int().nonnegative(),
  totalCharacters: z.number().int().nonnegative(),
  totalCoins: z.number().int().nonnegative(),
  totalZones: z.number().int().nonnegative(),
});

export const AdminUserSummarySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  username: z.string().min(3).max(24),
  role: UserRoleSchema,
  isBanned: z.boolean(),
  banReason: z.string().nullable(),
  characterCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AdminUsersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: UserRoleSchema.optional(),
  bannedOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export const AdminUsersListResponseSchema = z.object({
  users: z.array(AdminUserSummarySchema),
  total: z.number().int().nonnegative(),
});

export const AdminUpdateUserRequestSchema = z
  .object({
    role: UserRoleSchema.optional(),
    isBanned: z.boolean().optional(),
    banReason: z.string().trim().max(255).nullable().optional(),
  })
  .refine(
    (data) =>
      data.role !== undefined ||
      data.isBanned !== undefined ||
      data.banReason !== undefined,
    { message: "At least one field must be provided" }
  );

export const AdminUpdateUserResponseSchema = z.object({
  user: AdminUserSummarySchema,
});

export const AdminZoneSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  isPvpEnabled: z.boolean(),
  spawnX: z.number().finite(),
  spawnY: z.number().finite(),
});

export const AdminZonesListResponseSchema = z.object({
  zones: z.array(AdminZoneSummarySchema),
});

export const AdminUpdateZoneRequestSchema = z
  .object({
    isPvpEnabled: z.boolean().optional(),
    spawnX: z.number().finite().min(0).max(10000).optional(),
    spawnY: z.number().finite().min(0).max(10000).optional(),
  })
  .refine(
    (data) =>
      data.isPvpEnabled !== undefined ||
      data.spawnX !== undefined ||
      data.spawnY !== undefined,
    { message: "At least one field must be provided" }
  );

export const AdminUpdateZoneResponseSchema = z.object({
  zone: AdminZoneSummarySchema,
});

export type AdminErrorCode = z.infer<typeof AdminErrorCodeSchema>;
export type AdminStats = z.infer<typeof AdminStatsSchema>;
export type AdminUserSummary = z.infer<typeof AdminUserSummarySchema>;
export type AdminUsersQuery = z.infer<typeof AdminUsersQuerySchema>;
export type AdminUsersListResponse = z.infer<typeof AdminUsersListResponseSchema>;
export type AdminUpdateUserRequest = z.infer<typeof AdminUpdateUserRequestSchema>;
export type AdminUpdateUserResponse = z.infer<typeof AdminUpdateUserResponseSchema>;
export type AdminZoneSummary = z.infer<typeof AdminZoneSummarySchema>;
export type AdminZonesListResponse = z.infer<typeof AdminZonesListResponseSchema>;
export type AdminUpdateZoneRequest = z.infer<typeof AdminUpdateZoneRequestSchema>;
export type AdminUpdateZoneResponse = z.infer<typeof AdminUpdateZoneResponseSchema>;
