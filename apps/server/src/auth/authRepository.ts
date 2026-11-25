import { eq, sql } from "drizzle-orm";
import type { UserRole } from "@pawlands/protocol";
import { db } from "../database/index.js";
import { users } from "../database/schema.js";

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string | null;
  googleId: string | null;
  role: UserRole;
  isBanned: boolean;
  banReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  username: string;
  passwordHash?: string | null;
  googleId?: string | null;
  role?: UserRole;
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
    role: normalizeRole(row.role),
    isBanned: row.isBanned,
    banReason: row.banReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface AuthRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  findByGoogleId(googleId: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  linkGoogleAccount(userId: string, googleId: string): Promise<UserRecord>;
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

  async findById(id: string): Promise<UserRecord | null> {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toUserRecord(row) : null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const [created] = await db
      .insert(users)
      .values({
        email: input.email.trim().toLowerCase(),
        username: input.username.trim(),
        passwordHash: input.passwordHash ?? null,
        googleId: input.googleId ?? null,
        role: input.role ?? "player",
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
}
