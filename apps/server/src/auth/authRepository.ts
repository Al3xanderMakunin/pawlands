import { eq, sql } from "drizzle-orm";
import { db } from "../database/index.js";
import { users } from "../database/schema.js";

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  username: string;
  passwordHash: string;
}

export interface AuthRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
}

export class DrizzleAuthRepository implements AuthRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);
    return row ?? null;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const normalized = username.trim().toLowerCase();
    const [row] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = ${normalized}`)
      .limit(1);
    return row ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const [created] = await db
      .insert(users)
      .values({
        email: input.email.trim().toLowerCase(),
        username: input.username.trim(),
        passwordHash: input.passwordHash,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to insert user record");
    }

    return created;
  }
}
