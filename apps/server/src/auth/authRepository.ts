import { eq, sql } from "drizzle-orm";
import type { UserRole } from "@pawlands/protocol";
import { db } from "../database/index.js";
import { users } from "../database/schema.js";

export interface UserRecord {
  id: string;
  email: string | null;
  username: string;
  passwordHash: string | null;
  googleId: string | null;
  vkId: string | null;
  role: UserRole;
  isBanned: boolean;
  banReason: string | null;
  yandexId: string | null;
  telegramId: string | null;
  telegramUsername: string | null;
  appleSub: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email?: string | null;
  username: string;
  passwordHash?: string | null;
  googleId?: string | null;
  vkId?: string | null;
  role?: UserRole;
  yandexId?: string | null;
  telegramId?: string | null;
  telegramUsername?: string | null;
  appleSub?: string | null;
}

function normalizeRole(role: string): UserRole {
  if (role === "admin" || role === "moderator") {
    return role;
  }
  return "player";
}

function toUserRecord(row: typeof users.$inferSelect): UserRecord {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.passwordHash,
    googleId: row.googleId,
    yandexId: row.yandexId,
    vkId: row.vkId,
    role: normalizeRole(row.role),
    isBanned: row.isBanned,
    banReason: row.banReason ?? null,
    telegramId: row.telegramId ?? null,
    telegramUsername: row.telegramUsername ?? null,
    appleSub: row.appleSub,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface AuthRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  findByGoogleId(googleId: string): Promise<UserRecord | null>;
  findByTelegramId(telegramId: string): Promise<UserRecord | null>;
  findByVkId(vkId: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  findByYandexId(yandexId: string): Promise<UserRecord | null>;
  findByAppleSub(appleSub: string): Promise<UserRecord | null>;
  linkAppleSub(userId: string, appleSub: string): Promise<UserRecord>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  linkGoogleAccount(userId: string, googleId: string): Promise<UserRecord>;
  linkYandexAccount(userId: string, yandexId: string): Promise<UserRecord>;
  linkVkId(userId: string, vkId: string): Promise<UserRecord>;
}

export class DrizzleAuthRepository implements AuthRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);
    return row ? toUserRecord(row) : null;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const normalized = username.trim().toLowerCase();
    const [row] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = ${normalized}`)
      .limit(1);
    return row ? toUserRecord(row) : null;
  }

  async findByGoogleId(googleId: string): Promise<UserRecord | null> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1);
    return row ? toUserRecord(row) : null;
  }

  async findByVkId(vkId: string): Promise<UserRecord | null> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.vkId, vkId.trim()))
      .limit(1);
    return row ? toUserRecord(row) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toUserRecord(row) : null;
  }

  async findByYandexId(yandexId: string): Promise<UserRecord | null> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.yandexId, yandexId))
      .limit(1);
    return row ? toUserRecord(row) : null;
  }

  async findByTelegramId(telegramId: string): Promise<UserRecord | null> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);
    return row ? toUserRecord(row) : null;
  }

  async findByAppleSub(appleSub: string): Promise<UserRecord | null> {
    const [row] = await db.select().from(users).where(eq(users.appleSub, appleSub)).limit(1);
    return row ? toUserRecord(row) : null;
  }

  async linkAppleSub(userId: string, appleSub: string): Promise<UserRecord> {
    const [updated] = await db
      .update(users)
      .set({ appleSub, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error("Failed to link Apple account");
    }

    return toUserRecord(updated);
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const [created] = await db
      .insert(users)
      .values({
        email: input.email ? input.email.trim().toLowerCase() : null,
        username: input.username.trim(),
        passwordHash: input.passwordHash ?? null,
        googleId: input.googleId ?? null,
        vkId: input.vkId ? input.vkId.trim() : null,
        role: input.role ?? "player",
        yandexId: input.yandexId ?? null,
        telegramId: input.telegramId ?? null,
        telegramUsername: input.telegramUsername ?? null,
        appleSub: input.appleSub ?? null,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to insert user record");
    }

    return toUserRecord(created);
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<UserRecord> {
    const [updated] = await db
      .update(users)
      .set({
        googleId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error("Failed to link Google account");
    }

    return toUserRecord(updated);
  }

  async linkYandexAccount(userId: string, yandexId: string): Promise<UserRecord> {
    const [updated] = await db
      .update(users)
      .set({
        yandexId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error("Failed to link Yandex account");
    }

    return toUserRecord(updated);
  }

  async linkVkId(userId: string, vkId: string): Promise<UserRecord> {
    const [updated] = await db
      .update(users)
      .set({
        vkId: vkId.trim(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error("Failed to link VK ID to user record");
    }

    return toUserRecord(updated);
  }
}
