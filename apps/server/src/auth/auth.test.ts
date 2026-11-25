import { createHash, createHmac, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import type { AuthRepository, CreateUserInput, UserRecord } from "./authRepository.js";
import type { GoogleOAuthClient, GoogleOAuthConfig, GoogleUserProfile } from "./googleOAuth.js";
import { signAuthToken, verifyAuthToken } from "./jwt.js";
import { hashPassword, verifyPassword } from "./password.js";
import { verifyTelegramAuthPayload } from "./telegram.js";
import {
  YandexOAuthClient,
  type YandexOAuthProvider,
  type YandexUserProfile,
} from "./yandexOAuth.js";

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

  async findByGoogleId(googleId: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.googleId === googleId) ?? null;
  }

  async findByTelegramId(telegramId: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.telegramId === telegramId) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async findByYandexId(yandexId: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.yandexId === yandexId) ?? null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const now = new Date();
    const record: UserRecord = {
      id: randomUUID(),
      email: input.email ? input.email.trim().toLowerCase() : null,
      username: input.username.trim(),
      passwordHash: input.passwordHash ?? null,
      googleId: input.googleId ?? null,
      role: input.role ?? "player",
      isBanned: false,
      banReason: null,
      yandexId: input.yandexId ?? null,
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
    if (!user) {
      throw new Error("User not found");
    }
    user.googleId = googleId;
    user.updatedAt = new Date();
    return user;
  }

  async linkYandexAccount(userId: string, yandexId: string): Promise<UserRecord> {
    const user = this.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error("User not found");
    }
    user.yandexId = yandexId;
    user.updatedAt = new Date();
    return user;
  }
}

class MockYandexOAuthProvider implements YandexOAuthProvider {
  private readonly inner = new YandexOAuthClient({
    clientId: "test-yandex-client-id",
    clientSecret: "test-yandex-client-secret",
    redirectUri: "http://localhost:2567/api/v1/auth/yandex/callback",
  });

  constructor(private readonly profilesByCode: Record<string, YandexUserProfile>) {}

  isConfigured(): boolean {
    return true;
  }

  createState(secret: string, ttlSec?: number): string {
    return this.inner.createState(secret, ttlSec);
  }

  verifyState(state: string, secret: string): boolean {
    return this.inner.verifyState(state, secret);
  }

  getAuthorizationUrl(state: string, redirectUri?: string): string {
    return this.inner.getAuthorizationUrl(state, redirectUri);
  }

  async exchangeCodeForProfile(code: string): Promise<YandexUserProfile> {
    const profile = this.profilesByCode[code];
    if (!profile) {
      throw new Error("Unexpected OAuth code");
    }
    return profile;
  }
}

function signTelegramPayload(
  fields: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
  },
  botToken: string
) {
  const entries: Array<[string, string]> = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, String(value)]);
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
  const secretKey = createHash("sha256").update(botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return { ...fields, hash };
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

  it("returns 503 when Google OAuth is not configured", async () => {
    const app = await createApp({
      authRepository: new InMemoryAuthRepository(),
      jwtSecret: "test-route-secret",
      googleOAuthConfig: null,
      logger: false,
    });

    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/auth/google",
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().error).toBe("GOOGLE_AUTH_NOT_CONFIGURED");
    } finally {
      await app.close();
    }
  });

  it("redirects to Google, registers new Google users, and links existing email accounts", async () => {
    const repo = new InMemoryAuthRepository();
    const googleConfig: GoogleOAuthConfig = {
      clientId: "google-client-id",
      clientSecret: "google-client-secret",
      redirectUri: "http://localhost:2567/api/v1/auth/google/callback",
    };

    let nextProfile: GoogleUserProfile = {
      sub: "google-sub-1",
      email: "Mittens@Example.com",
      emailVerified: true,
      name: "Mittens Cat!",
    };

    const mockGoogleClient: GoogleOAuthClient = {
      async exchangeCodeForProfile(code) {
        expect(code).toBe("valid-code");
        return nextProfile;
      },
    };

    const app = await createApp({
      authRepository: repo,
      jwtSecret: "test-google-secret",
      appUrl: "http://localhost:5173",
      googleOAuthConfig: googleConfig,
      googleOAuthClient: mockGoogleClient,
      logger: false,
    });

    try {
      // 1. Start Google OAuth redirect
      const startRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/google",
      });
      expect(startRes.statusCode).toBe(302);
      const location = startRes.headers.location;
      expect(location).toBeTypeOf("string");
      const redirectUrl = new URL(location as string);
      expect(redirectUrl.origin).toBe("https://accounts.google.com");
      const state = redirectUrl.searchParams.get("state");
      expect(state).toBeTruthy();

      // 2. Callback creates new user and redirects with #auth_token=...
      const callbackRes = await app.inject({
        method: "GET",
        url: `/api/v1/auth/google/callback?code=valid-code&state=${encodeURIComponent(state!)}`,
      });
      expect(callbackRes.statusCode).toBe(302);
      const appRedirect = new URL(callbackRes.headers.location as string);
      expect(appRedirect.origin).toBe("http://localhost:5173");
      const hashParams = new URLSearchParams(appRedirect.hash.slice(1));
      const token = hashParams.get("auth_token");
      expect(token).toBeTruthy();

      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(meRes.statusCode).toBe(200);
      expect(meRes.json().user.email).toBe("mittens@example.com");
      expect(meRes.json().user.username).toBe("Mittens_Cat");

      // 3. Invalid state redirects with auth_error
      const badStateRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/google/callback?code=valid-code&state=invalid.state",
      });
      expect(badStateRes.statusCode).toBe(302);
      expect(badStateRes.headers.location).toContain("#auth_error=GOOGLE_AUTH_FAILED");

      // 4. Existing password user with same email gets linked on Google sign-in
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "existing@pawlands.gg",
          username: "ExistingCat",
          password: "password123",
        },
      });

      nextProfile = {
        sub: "google-sub-2",
        email: "existing@pawlands.gg",
        emailVerified: true,
        name: "Existing Cat",
      };

      const startRes2 = await app.inject({ method: "GET", url: "/api/v1/auth/google" });
      const state2 = new URL(startRes2.headers.location as string).searchParams.get("state")!;
      const linkCallbackRes = await app.inject({
        method: "GET",
        url: `/api/v1/auth/google/callback?code=valid-code&state=${encodeURIComponent(state2)}`,
      });
      expect(linkCallbackRes.statusCode).toBe(302);
      const linkedToken = new URLSearchParams(
        new URL(linkCallbackRes.headers.location as string).hash.slice(1)
      ).get("auth_token");

      const linkedMeRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${linkedToken}` },
      });
      expect(linkedMeRes.statusCode).toBe(200);
      expect(linkedMeRes.json().user.username).toBe("ExistingCat");
    } finally {
      await app.close();
    }
  });
});

describe("Yandex ID OAuth", () => {
  it("creates and verifies signed OAuth state tokens and builds authorization URL", () => {
    const client = new YandexOAuthClient({
      clientId: "yandex-client-123",
      clientSecret: "yandex-secret-456",
      redirectUri: "http://localhost:2567/api/v1/auth/yandex/callback",
    });

    expect(client.isConfigured()).toBe(true);

    const state = client.createState("state-secret", 300);
    expect(client.verifyState(state, "state-secret")).toBe(true);
    expect(client.verifyState(state, "wrong-secret")).toBe(false);
    expect(client.verifyState(`${state}x`, "state-secret")).toBe(false);

    const expired = client.createState("state-secret", -10);
    expect(client.verifyState(expired, "state-secret")).toBe(false);

    const authUrl = new URL(client.getAuthorizationUrl(state));
    expect(authUrl.origin).toBe("https://oauth.yandex.ru");
    expect(authUrl.pathname).toBe("/authorize");
    expect(authUrl.searchParams.get("response_type")).toBe("code");
    expect(authUrl.searchParams.get("client_id")).toBe("yandex-client-123");
    expect(authUrl.searchParams.get("state")).toBe(state);
    expect(authUrl.searchParams.get("redirect_uri")).toBe(
      "http://localhost:2567/api/v1/auth/yandex/callback"
    );
  });

  it("redirects with YANDEX_NOT_CONFIGURED when Yandex credentials are missing", async () => {
    const app = await createApp({
      authRepository: new InMemoryAuthRepository(),
      yandexOAuth: new YandexOAuthClient({ clientId: "", clientSecret: "" }),
      jwtSecret: "test-route-secret",
      clientUrl: "http://localhost:5173",
      logger: false,
    });

    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/auth/yandex",
      });
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe("http://localhost:5173/#auth_error=YANDEX_NOT_CONFIGURED");
    } finally {
      await app.close();
    }
  });

  it("registers, logs in, links existing email, and rejects password login for Yandex-only accounts", async () => {
    const repo = new InMemoryAuthRepository();
    const yandexOAuth = new MockYandexOAuthProvider({
      "code-new-user": {
        yandexId: "ya-1001",
        email: "Murzik@Yandex.ru",
        login: "murzik.cat",
        displayName: "Murzik",
      },
      "code-collision-user": {
        yandexId: "ya-1002",
        email: "murzik2@yandex.ru",
        login: "murzik.cat",
        displayName: "Murzik Two",
      },
      "code-existing-email": {
        yandexId: "ya-1003",
        email: "whisker@pawlands.gg",
        login: "whisker_ya",
        displayName: "Whisker",
      },
    });

    const app = await createApp({
      authRepository: repo,
      yandexOAuth,
      jwtSecret: "test-route-secret",
      clientUrl: "http://localhost:5173",
      logger: false,
    });

    try {
      // 1. Start Yandex OAuth flow
      const startRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/yandex",
      });
      expect(startRes.statusCode).toBe(302);
      const authorizeUrl = new URL(startRes.headers.location as string);
      const state = authorizeUrl.searchParams.get("state");
      expect(state).toBeTruthy();

      // 2. Callback with access_denied
      const deniedRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/yandex/callback?error=access_denied",
      });
      expect(deniedRes.statusCode).toBe(302);
      expect(deniedRes.headers.location).toBe(
        "http://localhost:5173/#auth_error=YANDEX_ACCESS_DENIED"
      );

      // 3. Callback with invalid state
      const badStateRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/yandex/callback?code=code-new-user&state=tampered",
      });
      expect(badStateRes.statusCode).toBe(302);
      expect(badStateRes.headers.location).toBe(
        "http://localhost:5173/#auth_error=YANDEX_INVALID_STATE"
      );

      // 4. Register new user via Yandex ID
      const registerCallbackRes = await app.inject({
        method: "GET",
        url: `/api/v1/auth/yandex/callback?code=code-new-user&state=${encodeURIComponent(state!)}`,
      });
      expect(registerCallbackRes.statusCode).toBe(302);
      const registerLocation = registerCallbackRes.headers.location as string;
      expect(registerLocation.startsWith("http://localhost:5173/#auth_token=")).toBe(true);

      const token1 = decodeURIComponent(registerLocation.split("#auth_token=")[1]!);
      const me1Res = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(me1Res.statusCode).toBe(200);
      expect(me1Res.json().user.email).toBe("murzik@yandex.ru");
      expect(me1Res.json().user.username).toBe("murzik_cat");

      // 5. Password login for Yandex-only account fails cleanly with 401
      const pwdLoginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          identifier: "murzik_cat",
          password: "any-password",
        },
      });
      expect(pwdLoginRes.statusCode).toBe(401);
      expect(pwdLoginRes.json().error).toBe("INVALID_CREDENTIALS");

      // 6. Second login with same Yandex ID reuses existing account
      const loginAgainRes = await app.inject({
        method: "GET",
        url: `/api/v1/auth/yandex/callback?code=code-new-user&state=${encodeURIComponent(state!)}`,
      });
      expect(loginAgainRes.statusCode).toBe(302);
      const token2 = decodeURIComponent(
        (loginAgainRes.headers.location as string).split("#auth_token=")[1]!
      );
      const me2Res = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(me2Res.statusCode).toBe(200);
      expect(me2Res.json().user.id).toBe(me1Res.json().user.id);

      // 7. Username collision generates unique username
      const collisionRes = await app.inject({
        method: "GET",
        url: `/api/v1/auth/yandex/callback?code=code-collision-user&state=${encodeURIComponent(state!)}`,
      });
      expect(collisionRes.statusCode).toBe(302);
      const tokenCollision = decodeURIComponent(
        (collisionRes.headers.location as string).split("#auth_token=")[1]!
      );
      const meCollisionRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${tokenCollision}` },
      });
      expect(meCollisionRes.statusCode).toBe(200);
      expect(meCollisionRes.json().user.username).toMatch(/^murzik_cat_\d{4}$/);

      // 8. Linking Yandex ID to an existing email/password account
      const existingReg = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "whisker@pawlands.gg",
          username: "Whisker_01",
          password: "password123",
        },
      });
      expect(existingReg.statusCode).toBe(201);
      const existingUserId = existingReg.json().user.id;

      const linkRes = await app.inject({
        method: "GET",
        url: `/api/v1/auth/yandex/callback?code=code-existing-email&state=${encodeURIComponent(state!)}`,
      });
      expect(linkRes.statusCode).toBe(302);
      const tokenLinked = decodeURIComponent(
        (linkRes.headers.location as string).split("#auth_token=")[1]!
      );
      const meLinkedRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${tokenLinked}` },
      });
      expect(meLinkedRes.statusCode).toBe(200);
      expect(meLinkedRes.json().user.id).toBe(existingUserId);
      expect(meLinkedRes.json().user.username).toBe("Whisker_01");
    } finally {
      await app.close();
    }
  });
});

describe("telegram authentication", () => {
  it("verifies valid Telegram Login Widget payloads and rejects tampered or expired ones", () => {
    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const nowSec = 1_700_000_000;
    const payload = signTelegramPayload(
      {
        id: 987654321,
        first_name: "Whisker",
        username: "whisker_cat",
        auth_date: nowSec - 60,
      },
      botToken
    );

    expect(verifyTelegramAuthPayload(payload, botToken, 86400, nowSec)).toBe(true);
    expect(verifyTelegramAuthPayload({ ...payload, first_name: "EvilCat" }, botToken, 86400, nowSec)).toBe(false);
    expect(verifyTelegramAuthPayload(payload, "wrong-bot-token", 86400, nowSec)).toBe(false);
    expect(verifyTelegramAuthPayload(payload, botToken, 30, nowSec)).toBe(false);
  });

  it("registers a new user on first Telegram login, logs in on subsequent calls, and resolves username collisions", async () => {
    const botToken = "123456:telegram-test-bot-token";
    const repo = new InMemoryAuthRepository();
    const app = await createApp({
      authRepository: repo,
      jwtSecret: "test-route-secret",
      telegramBotToken: botToken,
      logger: false,
    });

    try {
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "existing@pawlands.gg",
          username: "whisker_cat",
          password: "password123",
        },
      });

      const nowSec = Math.floor(Date.now() / 1000);
      const telegramPayload = signTelegramPayload(
        {
          id: 555000111,
          first_name: "Whisker",
          username: "whisker_cat",
          auth_date: nowSec,
        },
        botToken
      );

      const firstRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/telegram",
        payload: telegramPayload,
      });
      expect(firstRes.statusCode).toBe(200);
      const firstBody = firstRes.json();
      expect(firstBody.token).toBeTypeOf("string");
      expect(firstBody.user.email).toBeNull();
      expect(firstBody.user.telegramId).toBe("555000111");
      expect(firstBody.user.username).toBe("whisker_cat_1");

      const secondRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/telegram",
        payload: telegramPayload,
      });
      expect(secondRes.statusCode).toBe(200);
      expect(secondRes.json().user.id).toBe(firstBody.user.id);

      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          authorization: `Bearer ${firstBody.token}`,
        },
      });
      expect(meRes.statusCode).toBe(200);
      expect(meRes.json().user.telegramId).toBe("555000111");

      const pwLoginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          identifier: "whisker_cat_1",
          password: "any-password",
        },
      });
      expect(pwLoginRes.statusCode).toBe(401);
      expect(pwLoginRes.json().error).toBe("INVALID_CREDENTIALS");

      const badRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/telegram",
        payload: {
          ...telegramPayload,
          first_name: "Tampered",
        },
      });
      expect(badRes.statusCode).toBe(401);
      expect(badRes.json().error).toBe("INVALID_TELEGRAM_AUTH");
    } finally {
      await app.close();
    }
  });

  it("returns 503 when TELEGRAM_BOT_TOKEN is not configured", async () => {
    const app = await createApp({
      authRepository: new InMemoryAuthRepository(),
      jwtSecret: "test-route-secret",
      telegramBotToken: "",
      logger: false,
    });

    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/telegram",
        payload: {
          id: 12345,
          first_name: "Cat",
          auth_date: Math.floor(Date.now() / 1000),
          hash: "a".repeat(64),
        },
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().error).toBe("TELEGRAM_NOT_CONFIGURED");
    } finally {
      await app.close();
    }
  });
});
