import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { WORLD_ZONES } from "@pawlands/game-data";
import type {
  AdminStats,
  AdminUpdateUserRequest,
  AdminUpdateZoneRequest,
  AdminUserSummary,
  AdminUsersQuery,
  AdminZoneSummary,
  UserRole,
} from "@pawlands/protocol";
import { db } from "../database/index.js";
import { characters, users, wallets, worldZones } from "../database/schema.js";

export interface AdminRepository {
  getStats(): Promise<AdminStats>;
  listUsers(query: AdminUsersQuery): Promise<{ users: AdminUserSummary[]; total: number }>;
  findUserSummaryById(userId: string): Promise<AdminUserSummary | null>;
  updateUser(userId: string, patch: AdminUpdateUserRequest): Promise<AdminUserSummary | null>;
  listZones(): Promise<AdminZoneSummary[]>;
  updateZone(zoneId: string, patch: AdminUpdateZoneRequest): Promise<AdminZoneSummary | null>;
}

function normalizeRole(role: string): UserRole {
  if (role === "admin" || role === "moderator") {
    return role;
  }
  return "player";
}

export class DrizzleAdminRepository implements AdminRepository {
  async getStats(): Promise<AdminStats> {
    const [userCounts] = await db
      .select({
        totalUsers: count(),
        bannedUsers: sql<number>`count(*) filter (where ${users.isBanned} = true)::int`,
        adminUsers: sql<number>`count(*) filter (where ${users.role} = 'admin')::int`,
        moderatorUsers: sql<number>`count(*) filter (where ${users.role} = 'moderator')::int`,
      })
      .from(users);

    const [charCounts] = await db
      .select({
        totalCharacters: count(),
      })
      .from(characters);

    const [walletTotals] = await db
      .select({
        totalCoins: sql<number>`coalesce(sum(${wallets.coins}), 0)::int`,
      })
      .from(wallets);

    const zones = await this.listZones();

    return {
      totalUsers: Number(userCounts?.totalUsers ?? 0),
      bannedUsers: Number(userCounts?.bannedUsers ?? 0),
      adminUsers: Number(userCounts?.adminUsers ?? 0),
      moderatorUsers: Number(userCounts?.moderatorUsers ?? 0),
      totalCharacters: Number(charCounts?.totalCharacters ?? 0),
      totalCoins: Number(walletTotals?.totalCoins ?? 0),
      totalZones: zones.length,
    };
  }

  async listUsers(query: AdminUsersQuery): Promise<{ users: AdminUserSummary[]; total: number }> {
    const conditions: SQL[] = [];

    if (query.search) {
      const pattern = `%${query.search}%`;
      const searchCond = or(ilike(users.username, pattern), ilike(users.email, pattern));
      if (searchCond) conditions.push(searchCond);
    }

    if (query.role) {
      conditions.push(eq(users.role, query.role));
    }

    if (query.bannedOnly) {
      conditions.push(eq(users.isBanned, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db
      .select({ total: count() })
      .from(users)
      .where(whereClause);

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        isBanned: users.isBanned,
        banReason: users.banReason,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        characterCount: sql<number>`count(${characters.id})::int`,
      })
      .from(users)
      .leftJoin(characters, eq(characters.userId, users.id))
      .where(whereClause)
      .groupBy(users.id)
      .orderBy(desc(users.createdAt))
      .limit(query.limit)
      .offset(query.offset);

    return {
      users: rows.map((row) => ({
        id: row.id,
        email: row.email,
        username: row.username,
        role: normalizeRole(row.role),
        isBanned: row.isBanned,
        banReason: row.banReason ?? null,
        characterCount: Number(row.characterCount ?? 0),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      total: Number(totalRow?.total ?? 0),
    };
  }

  async findUserSummaryById(userId: string): Promise<AdminUserSummary | null> {
    const [row] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        isBanned: users.isBanned,
        banReason: users.banReason,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        characterCount: sql<number>`count(${characters.id})::int`,
      })
      .from(users)
      .leftJoin(characters, eq(characters.userId, users.id))
      .where(eq(users.id, userId))
      .groupBy(users.id)
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      username: row.username,
      role: normalizeRole(row.role),
      isBanned: row.isBanned,
      banReason: row.banReason ?? null,
      characterCount: Number(row.characterCount ?? 0),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateUser(
    userId: string,
    patch: AdminUpdateUserRequest
  ): Promise<AdminUserSummary | null> {
    const values: {
      role?: string;
      isBanned?: boolean;
      banReason?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (patch.role !== undefined) {
      values.role = patch.role;
    }
    if (patch.isBanned !== undefined) {
      values.isBanned = patch.isBanned;
      if (!patch.isBanned && patch.banReason === undefined) {
        values.banReason = null;
      }
    }
    if (patch.banReason !== undefined) {
      values.banReason = patch.banReason;
    }

    const [updated] = await db
      .update(users)
      .set(values)
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (!updated) {
      return null;
    }

    return this.findUserSummaryById(updated.id);
  }

  async listZones(): Promise<AdminZoneSummary[]> {
    const dbZones = await db.select().from(worldZones);
    const byId = new Map(dbZones.map((zone) => [zone.id, zone]));

    return WORLD_ZONES.map((def) => {
      const override = byId.get(def.id);
      return {
        id: def.id,
        name: override?.name ?? def.name,
        type: override?.type ?? def.type,
        isPvpEnabled: override?.isPvpEnabled ?? def.isPvpEnabled,
        spawnX: override?.spawnX ?? def.spawnX,
        spawnY: override?.spawnY ?? def.spawnY,
      };
    });
  }

  async updateZone(
    zoneId: string,
    patch: AdminUpdateZoneRequest
  ): Promise<AdminZoneSummary | null> {
    const def = WORLD_ZONES.find((zone) => zone.id === zoneId);
    if (!def) {
      return null;
    }

    const [existing] = await db
      .select()
      .from(worldZones)
      .where(eq(worldZones.id, zoneId))
      .limit(1);

    const nextPvp = patch.isPvpEnabled ?? existing?.isPvpEnabled ?? def.isPvpEnabled;
    const nextSpawnX = patch.spawnX ?? existing?.spawnX ?? def.spawnX;
    const nextSpawnY = patch.spawnY ?? existing?.spawnY ?? def.spawnY;

    if (existing) {
      await db
        .update(worldZones)
        .set({
          isPvpEnabled: nextPvp,
          spawnX: nextSpawnX,
          spawnY: nextSpawnY,
        })
        .where(eq(worldZones.id, zoneId));
    } else {
      await db.insert(worldZones).values({
        id: def.id,
        name: def.name,
        type: def.type,
        isPvpEnabled: nextPvp,
        spawnX: nextSpawnX,
        spawnY: nextSpawnY,
      });
    }

    return {
      id: def.id,
      name: def.name,
      type: def.type,
      isPvpEnabled: nextPvp,
      spawnX: nextSpawnX,
      spawnY: nextSpawnY,
    };
  }
}
