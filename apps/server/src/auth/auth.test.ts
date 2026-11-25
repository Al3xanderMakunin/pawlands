import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import type { AuthRepository, CreateUserInput, UserRecord } from "./authRepository.js";
import { signAuthToken, verifyAuthToken } from "./jwt.js";
import { hashPassword, verifyPassword } from "./password.js";

class InMemoryAuthRepository implements AuthRepository {
  private users: UserRecord[] = [];

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    return this.users.find((u) => u.email === normalized) ?? null;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const normalized = username.trim().toLowerCase();
    return this.users.find((u) => u.username.toLowerCase() === normalized) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const now = new Date();
    const record: UserRecord = {
      id: randomUUID(),
      email: input.email.trim().toLowerCase(),
      username: input.username.trim(),
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(record);
    return record;
  }
}

describe("password hashing", () => {
  it("hashes and verifies matching passwords", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).toMatch(/^scrypt\$[0-9a-f]+\$[0-9a-f]+$/);
    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});

describe("jwt helpers", () => {
  it("signs and verifies a valid token and rejects tampered or expired tokens", () => {
    const secret = "test-jwt-secret";
    const token = signAuthToken(
      { sub: "user-123", username: "Whisker", email: "whisker@pawlands.gg" },
      secret,
      3600
    );

    const verified = verifyAuthToken(token, secret);
    expect(verified?.sub).toBe("user-123");
    expect(verified?.username).toBe("Whisker");

    expect(verifyAuthToken(token, "wrong-secret")).toBeNull();
    expect(verifyAuthToken(`${token}tampered`, secret)).toBeNull();

    const expired = signAuthToken(
      { sub: "user-123", username: "Whisker", email: "whisker@pawlands.gg" },
      secret,
      -10
    );
    expect(verifyAuthToken(expired, secret)).toBeNull();
  });
});

describe("auth HTTP routes", () => {
  it("registers, logs in by email or username, fetches /me, and rejects duplicates", async () => {
    const app = await createApp({
      authRepository: new InMemoryAuthRepository(),
      jwtSecret: "test-route-secret",
      logger: false,
    });

    try {
      const registerRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "Whisker@Pawlands.gg",
          username: "Whisker_01",
          password: "password123",
        },
      });

      expect(registerRes.statusCode).toBe(201);
      const registered = registerRes.json();
      expect(registered.token).toBeTypeOf("string");
      expect(registered.user.email).toBe("whisker@pawlands.gg");
      expect(registered.user.username).toBe("Whisker_01");

      // Duplicate email
      const dupEmailRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "whisker@pawlands.gg",
          username: "AnotherCat",
          password: "password123",
        },
      });
      expect(dupEmailRes.statusCode).toBe(409);
      expect(dupEmailRes.json().error).toBe("EMAIL_TAKEN");

      // Duplicate username (case-insensitive)
      const dupUsernameRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "other@pawlands.gg",
          username: "whisker_01",
          password: "password123",
        },
      });
      expect(dupUsernameRes.statusCode).toBe(409);
      expect(dupUsernameRes.json().error).toBe("USERNAME_TAKEN");

      // Login with username
      const loginUsernameRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          identifier: "Whisker_01",
          password: "password123",
        },
      });
      expect(loginUsernameRes.statusCode).toBe(200);
      const loggedIn = loginUsernameRes.json();
      expect(loggedIn.user.username).toBe("Whisker_01");

      // Login with email
      const loginEmailRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          identifier: "WHISKER@PAWLANDS.GG",
          password: "password123",
        },
      });
      expect(loginEmailRes.statusCode).toBe(200);

      // Wrong password
      const badLoginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          identifier: "Whisker_01",
          password: "wrong-password",
        },
      });
      expect(badLoginRes.statusCode).toBe(401);
      expect(badLoginRes.json().error).toBe("INVALID_CREDENTIALS");

      // /me with valid bearer token
      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          authorization: `Bearer ${loggedIn.token}`,
        },
      });
      expect(meRes.statusCode).toBe(200);
      expect(meRes.json().user.email).toBe("whisker@pawlands.gg");

      // /me without token
      const unauthRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
      });
      expect(unauthRes.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });
});
