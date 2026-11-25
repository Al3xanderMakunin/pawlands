import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { WORLD_ZONES } from "@pawlands/game-data";
import type {
  AdminStats,
  AdminUpdateUserRequest,
  AdminUpdateZoneRequest,
  AdminUserSummary,
  AdminUsersQuery,
  AdminZoneSummary,
} from "@pawlands/protocol";
import { createApp } from "../app.js";
import type { AuthRepository, CreateUserInput, UserRecord } from "../auth/authRepository.js";
import type { AdminRepository } from "./adminRepository.js";

class InMemoryStore implements AuthRepository, AdminRepository {
  private users: UserRecord[] = [];
  private zones: AdminZoneSummary[] = WORLD_ZONES.map((z) => ({
    id: z.id,
    name: z.name,
    type: z.type,
    isPvpEnabled: z.isPvpEnabled,
    spawnX: z.spawnX,
    spawnY: z.spawnY,
  }));

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    return this.users.find((u) => u.email === normalized) ?? null;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const normalized = username.trim().toLowerCase();
    return this.users.find((u) => u.username.toLowerCase() === normalized) ?? null;
  }

  async findByGoogleId(googleId: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.googleId === googleId) ?? null;
  }

  async findByYandexId(yandexId: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.yandexId === yandexId) ?? null;
  }

  async findByTelegramId(telegramId: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.telegramId === telegramId) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const now = new Date();
    const record: UserRecord = {
      id: randomUUID(),
      email: input.email ? input.email.trim().toLowerCase() : null,
      username: input.username.trim(),
      passwordHash: input.passwordHash ?? null,
      googleId: input.googleId ?? null,
      yandexId: input.yandexId ?? null,
      role: input.role ?? "player",
      isBanned: false,
      banReason: null,
      telegramId: input.telegramId ?? null,
      telegramUsername: input.telegramUsername ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(record);
    return record;
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<UserRecord> {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    user.googleId = googleId;
    user.updatedAt = new Date();
    return user;
  }

  async linkYandexAccount(userId: string, yandexId: string): Promise<UserRecord> {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    user.yandexId = yandexId;
    user.updatedAt = new Date();
    return user;
  }

  private toSummary(user: UserRecord): AdminUserSummary {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isBanned: user.isBanned,
      banReason: user.banReason,
      characterCount: 0,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async getStats(): Promise<AdminStats> {
    return {
      totalUsers: this.users.length,
      bannedUsers: this.users.filter((u) => u.isBanned).length,
      adminUsers: this.users.filter((u) => u.role === "admin").length,
      moderatorUsers: this.users.filter((u) => u.role === "moderator").length,
      totalCharacters: 0,
      totalCoins: 0,
      totalZones: this.zones.length,
    };
  }

  async listUsers(query: AdminUsersQuery): Promise<{ users: AdminUserSummary[]; total: number }> {
    let filtered = [...this.users];
    if (query.search) {
      const q = query.search.toLowerCase();
      filtered = filtered.filter(
        (u) => u.username.toLowerCase().includes(q) || (u.email?.toLowerCase().includes(q) ?? false)
      );
    }
    if (query.role) {
      filtered = filtered.filter((u) => u.role === query.role);
    }
    if (query.bannedOnly) {
      filtered = filtered.filter((u) => u.isBanned);
    }

    const total = filtered.length;
    const paged = filtered.slice(query.offset, query.offset + query.limit);
    return {
      users: paged.map((u) => this.toSummary(u)),
      total,
    };
  }

  async findUserSummaryById(userId: string): Promise<AdminUserSummary | null> {
    const user = this.users.find((u) => u.id === userId);
    return user ? this.toSummary(user) : null;
  }

  async updateUser(
    userId: string,
    patch: AdminUpdateUserRequest
  ): Promise<AdminUserSummary | null> {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return null;

    if (patch.role !== undefined) user.role = patch.role;
    if (patch.isBanned !== undefined) {
      user.isBanned = patch.isBanned;
      if (!patch.isBanned && patch.banReason === undefined) {
        user.banReason = null;
      }
    }
    if (patch.banReason !== undefined) {
      user.banReason = patch.banReason;
    }
    user.updatedAt = new Date();
    return this.toSummary(user);
  }

  async listZones(): Promise<AdminZoneSummary[]> {
    return [...this.zones];
  }

  async updateZone(
    zoneId: string,
    patch: AdminUpdateZoneRequest
  ): Promise<AdminZoneSummary | null> {
    const zone = this.zones.find((z) => z.id === zoneId);
    if (!zone) return null;
    if (patch.isPvpEnabled !== undefined) zone.isPvpEnabled = patch.isPvpEnabled;
    if (patch.spawnX !== undefined) zone.spawnX = patch.spawnX;
    if (patch.spawnY !== undefined) zone.spawnY = patch.spawnY;
    return { ...zone };
  }
}

describe("admin HTTP routes", () => {
  it("enforces admin authorization, manages users and bans, and updates zones", async () => {
    const previousAdminEmails = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = "admin@pawlands.gg";

    const store = new InMemoryStore();
    const app = await createApp({
      authRepository: store,
      adminRepository: store,
      jwtSecret: "test-admin-secret",
      logger: false,
    });

    try {
      // Unauthenticated request -> 401
      const unauthRes = await app.inject({ method: "GET", url: "/api/v1/admin/stats" });
      expect(unauthRes.statusCode).toBe(401);

      // Register regular player -> 403 on admin routes
      const playerReg = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "player@pawlands.gg",
          username: "PlayerCat",
          password: "password123",
        },
      });
      expect(playerReg.statusCode).toBe(201);
      const playerData = playerReg.json();
      expect(playerData.user.role).toBe("player");

      const forbiddenRes = await app.inject({
        method: "GET",
        url: "/api/v1/admin/stats",
        headers: { authorization: `Bearer ${playerData.token}` },
      });
      expect(forbiddenRes.statusCode).toBe(403);
      expect(forbiddenRes.json().error).toBe("FORBIDDEN");

      // Register admin (bootstrapped via ADMIN_EMAILS)
      const adminReg = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "admin@pawlands.gg",
          username: "AdminCat",
          password: "password123",
        },
      });
      expect(adminReg.statusCode).toBe(201);
      const adminData = adminReg.json();
      expect(adminData.user.role).toBe("admin");

      // Fetch stats
      const statsRes = await app.inject({
        method: "GET",
        url: "/api/v1/admin/stats",
        headers: { authorization: `Bearer ${adminData.token}` },
      });
      expect(statsRes.statusCode).toBe(200);
      expect(statsRes.json()).toMatchObject({
        totalUsers: 2,
        adminUsers: 1,
        bannedUsers: 0,
        totalZones: WORLD_ZONES.length,
      });

      // Prevent self-demotion or self-ban
      const selfBanRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${adminData.user.id}`,
        headers: { authorization: `Bearer ${adminData.token}` },
        payload: { isBanned: true },
      });
      expect(selfBanRes.statusCode).toBe(400);
      expect(selfBanRes.json().error).toBe("CANNOT_MODIFY_SELF");

      // Promote & ban player
      const banRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${playerData.user.id}`,
        headers: { authorization: `Bearer ${adminData.token}` },
        payload: { role: "moderator", isBanned: true, banReason: "Rule violation" },
      });
      expect(banRes.statusCode).toBe(200);
      expect(banRes.json().user).toMatchObject({
        id: playerData.user.id,
        role: "moderator",
        isBanned: true,
        banReason: "Rule violation",
      });

      // Banned user cannot log in or fetch /me
      const bannedLoginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { identifier: "PlayerCat", password: "password123" },
      });
      expect(bannedLoginRes.statusCode).toBe(403);
      expect(bannedLoginRes.json().error).toBe("ACCOUNT_BANNED");

      // Filter banned users
      const listBannedRes = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users?bannedOnly=true",
        headers: { authorization: `Bearer ${adminData.token}` },
      });
      expect(listBannedRes.statusCode).toBe(200);
      expect(listBannedRes.json().total).toBe(1);
      expect(listBannedRes.json().users[0].username).toBe("PlayerCat");

      // Update zone PvP and spawn coordinates
      const zoneId = WORLD_ZONES[0]!.id;
      const updateZoneRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/zones/${zoneId}`,
        headers: { authorization: `Bearer ${adminData.token}` },
        payload: { isPvpEnabled: true, spawnX: 512, spawnY: 256 },
      });
      expect(updateZoneRes.statusCode).toBe(200);
      expect(updateZoneRes.json().zone).toMatchObject({
        id: zoneId,
        isPvpEnabled: true,
        spawnX: 512,
        spawnY: 256,
      });
    } finally {
      if (previousAdminEmails === undefined) {
        delete process.env.ADMIN_EMAILS;
      } else {
        process.env.ADMIN_EMAILS = previousAdminEmails;
      }
      await app.close();
    }
  });
});
