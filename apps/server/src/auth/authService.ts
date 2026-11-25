import { randomBytes, randomInt } from "node:crypto";
import type {
  AuthErrorCode,
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  TelegramAuthRequest,
  UserRole,
} from "@pawlands/protocol";
import type { AuthRepository, UserRecord } from "./authRepository.js";
import type { GoogleUserProfile } from "./googleOAuth.js";
import { signAuthToken, verifyAuthToken } from "./jwt.js";
import { hashPassword, verifyPassword } from "./password.js";
import { verifyTelegramAuthPayload } from "./telegram.js";
import type { YandexUserProfile } from "./yandexOAuth.js";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly statusCode: number;

  constructor(code: AuthErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function toAuthUser(record: UserRecord): AuthUser {
  return {
    id: record.id,
    email: record.email,
    username: record.username,
    role: record.role,
    isBanned: record.isBanned,
    telegramId: record.telegramId,
    createdAt: record.createdAt.toISOString(),
  };
}

function isBootstrapAdminEmail(email: string): boolean {
  const configured = process.env.ADMIN_EMAILS;
  if (!configured) return false;
  const normalized = email.trim().toLowerCase();
  return configured
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

function sanitizeUsernameBase(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, 24);

  if (cleaned.length >= 3) {
    return cleaned;
  }

  return "yandex_cat";
}

function buildTelegramUsernameBase(input: TelegramAuthRequest): string {
  const raw = (input.username || input.first_name || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (raw.length >= 3) {
    return raw.slice(0, 18);
  }
  const fallback = `tg_${input.id}`;
  return fallback.slice(0, 18);
}

function isPgUniqueViolation(err: unknown): { constraint?: string } | null {
  if (typeof err !== "object" || err === null) return null;
  const record = err as { code?: unknown; constraint?: unknown };
  if (record.code === "23505") {
    return {
      constraint: typeof record.constraint === "string" ? record.constraint : undefined,
    };
  }
  return null;
}

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwtSecret: string,
    private readonly telegramBotToken?: string
  ) {}

  private async resolveUniqueTelegramUsername(input: TelegramAuthRequest): Promise<string> {
    const base = buildTelegramUsernameBase(input);
    const firstMatch = await this.repository.findByUsername(base);
    if (!firstMatch) {
      return base;
    }

    for (let suffix = 1; suffix <= 999; suffix += 1) {
      const candidate = `${base.slice(0, 23 - String(suffix).length)}_${suffix}`;
      const existing = await this.repository.findByUsername(candidate);
      if (!existing) {
        return candidate;
      }
    }

    return `tg_${String(input.id).slice(-12)}_${Date.now().toString(36).slice(-4)}`.slice(0, 24);
  }

  async register(input: RegisterRequest): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim();

    const existingEmail = await this.repository.findByEmail(email);
    if (existingEmail) {
      throw new AuthError("EMAIL_TAKEN", "An account with this email already exists", 409);
    }

    const existingUsername = await this.repository.findByUsername(username);
    if (existingUsername) {
      throw new AuthError("USERNAME_TAKEN", "This username is already taken", 409);
    }

    const passwordHash = await hashPassword(input.password);
    const initialRole: UserRole = isBootstrapAdminEmail(email) ? "admin" : "player";

    let created: UserRecord;
    try {
      created = await this.repository.createUser({
        email,
        username,
        passwordHash,
        role: initialRole,
      });
    } catch (err) {
      const uniqueErr = isPgUniqueViolation(err);
      if (uniqueErr) {
        if (uniqueErr.constraint?.includes("username")) {
          throw new AuthError("USERNAME_TAKEN", "This username is already taken", 409);
        }
        throw new AuthError("EMAIL_TAKEN", "An account with this email already exists", 409);
      }
      throw err;
    }

    return this.buildAuthResponse(created);
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    const identifier = input.identifier.trim();
    const user = identifier.includes("@")
      ? await this.repository.findByEmail(identifier.toLowerCase())
      : await this.repository.findByUsername(identifier);

    if (!user || !user.passwordHash) {
      throw new AuthError("INVALID_CREDENTIALS", "Invalid email/username or password", 401);
    }

    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthError("INVALID_CREDENTIALS", "Invalid email/username or password", 401);
    }

    if (user.isBanned) {
      throw new AuthError(
        "ACCOUNT_BANNED",
        user.banReason ? `Account is banned: ${user.banReason}` : "Account is banned",
        403
      );
    }

    return this.buildAuthResponse(user);
  }

  async authenticateWithYandex(profile: YandexUserProfile): Promise<AuthResponse> {
    const existingByYandexId = await this.repository.findByYandexId(profile.yandexId);
    if (existingByYandexId) {
      if (existingByYandexId.isBanned) {
        throw new AuthError(
          "ACCOUNT_BANNED",
          existingByYandexId.banReason
            ? `Account is banned: ${existingByYandexId.banReason}`
            : "Account is banned",
          403
        );
      }
      return this.buildAuthResponse(existingByYandexId);
    }

    const normalizedEmail = (
      profile.email ?? `yandex_${profile.yandexId}@yandex.id.local`
    )
      .trim()
      .toLowerCase();

    const existingByEmail = await this.repository.findByEmail(normalizedEmail);
    if (existingByEmail) {
      if (existingByEmail.isBanned) {
        throw new AuthError(
          "ACCOUNT_BANNED",
          existingByEmail.banReason
            ? `Account is banned: ${existingByEmail.banReason}`
            : "Account is banned",
          403
        );
      }
      if (existingByEmail.yandexId && existingByEmail.yandexId !== profile.yandexId) {
        throw new AuthError(
          "EMAIL_TAKEN",
          "An account with this email is already linked to another Yandex ID",
          409
        );
      }
      const linked = await this.repository.linkYandexAccount(
        existingByEmail.id,
        profile.yandexId
      );
      return this.buildAuthResponse(linked);
    }

    const baseUsername = sanitizeUsernameBase(
      profile.login ?? profile.displayName ?? normalizedEmail.split("@")[0] ?? "yandex_cat"
    );

    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = await this.pickAvailableUsername(baseUsername, attempt);
      try {
        const created = await this.repository.createUser({
          email: normalizedEmail,
          username: candidate,
          passwordHash: null,
          yandexId: profile.yandexId,
          role: isBootstrapAdminEmail(normalizedEmail) ? "admin" : "player",
        });
        return this.buildAuthResponse(created);
      } catch (err) {
        const uniqueErr = isPgUniqueViolation(err);
        if (uniqueErr?.constraint?.includes("username") && attempt < maxAttempts - 1) {
          continue;
        }
        if (uniqueErr) {
          throw new AuthError("EMAIL_TAKEN", "An account with this email already exists", 409);
        }
        throw err;
      }
    }

    throw new AuthError("YANDEX_AUTH_FAILED", "Could not allocate a unique username", 500);
  }

  private async pickAvailableUsername(base: string, attempt: number): Promise<string> {
    if (attempt === 0) {
      const existing = await this.repository.findByUsername(base);
      if (!existing) return base;
    }

    for (let i = 0; i < 5; i += 1) {
      const suffix = `_${randomInt(1000, 9999)}`;
      const candidate = `${base.slice(0, 24 - suffix.length)}${suffix}`;
      const existing = await this.repository.findByUsername(candidate);
      if (!existing) return candidate;
    }

    const fallbackSuffix = `_${randomInt(100000, 999999)}`;
    return `${base.slice(0, 24 - fallbackSuffix.length)}${fallbackSuffix}`;
  }

  private buildAuthResponse(user: UserRecord): AuthResponse {
    const token = signAuthToken(
      {
        sub: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      this.jwtSecret
    );

    return {
      token,
      user: toAuthUser(user),
    };
  }

  async authenticateWithTelegram(input: TelegramAuthRequest): Promise<AuthResponse> {
    if (!this.telegramBotToken) {
      throw new AuthError("TELEGRAM_NOT_CONFIGURED", "Telegram authentication is not configured", 503);
    }

    if (!verifyTelegramAuthPayload(input, this.telegramBotToken)) {
      throw new AuthError("INVALID_TELEGRAM_AUTH", "Invalid or expired Telegram authentication data", 401);
    }

    const telegramId = String(input.id);
    const existing = await this.repository.findByTelegramId(telegramId);
    if (existing) {
      if (existing.isBanned) {
        throw new AuthError(
          "ACCOUNT_BANNED",
          existing.banReason ? `Account is banned: ${existing.banReason}` : "Account is banned",
          403
        );
      }
      return this.buildAuthResponse(existing);
    }

    const username = await this.resolveUniqueTelegramUsername(input);
    let created: UserRecord;
    try {
      created = await this.repository.createUser({
        email: null,
        username,
        passwordHash: null,
        telegramId,
        telegramUsername: input.username ?? null,
      });
    } catch (err) {
      const uniqueErr = isPgUniqueViolation(err);
      if (uniqueErr) {
        const raced = await this.repository.findByTelegramId(telegramId);
        if (raced) {
          return this.buildAuthResponse(raced);
        }
        const fallbackUsername = `tg_${telegramId.slice(-10)}_${Date.now().toString(36).slice(-4)}`.slice(0, 24);
        created = await this.repository.createUser({
          email: null,
          username: fallbackUsername,
          passwordHash: null,
          telegramId,
          telegramUsername: input.username ?? null,
        });
      } else {
        throw err;
      }
    }

    return this.buildAuthResponse(created);
  }

  async authenticateWithGoogle(profile: GoogleUserProfile): Promise<AuthResponse> {
    if (!profile.emailVerified) {
      throw new AuthError("GOOGLE_AUTH_FAILED", "Google email is not verified", 401);
    }

    const email = profile.email.trim().toLowerCase();
    let user = await this.repository.findByGoogleId(profile.sub);

    if (!user) {
      const existingByEmail = await this.repository.findByEmail(email);
      if (existingByEmail) {
        if (existingByEmail.googleId && existingByEmail.googleId !== profile.sub) {
          throw new AuthError(
            "EMAIL_TAKEN",
            "An account with this email is already linked to another Google account",
            409
          );
        }
        user = await this.repository.linkGoogleAccount(existingByEmail.id, profile.sub);
      } else {
        const username = await this.generateUniqueUsername(profile);
        try {
          user = await this.repository.createUser({
            email,
            username,
            passwordHash: null,
            googleId: profile.sub,
          });
        } catch (err) {
          const uniqueErr = isPgUniqueViolation(err);
          if (uniqueErr) {
            throw new AuthError("EMAIL_TAKEN", "An account with this email already exists", 409);
          }
          throw err;
        }
      }
    }

    const token = signAuthToken(
      {
        sub: user.id,
        username: user.username,
        email: user.email,
      },
      this.jwtSecret
    );

    return {
      token,
      user: toAuthUser(user),
    };
  }

  private async generateUniqueUsername(profile: GoogleUserProfile): Promise<string> {
    const rawSource = profile.name?.trim() || profile.email.split("@")[0] || "paw_cat";
    const sanitized = rawSource
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^[_-]+|[_-]+$/g, "");
    const base = sanitized.length >= 3 ? sanitized.slice(0, 24) : "paw_cat";

    if (!(await this.repository.findByUsername(base))) {
      return base;
    }

    const prefix = base.slice(0, 19);
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `${prefix}_${randomBytes(2).toString("hex")}`;
      if (!(await this.repository.findByUsername(candidate))) {
        return candidate;
      }
    }

    return `cat_${randomBytes(4).toString("hex")}`;
  }

  async getCurrentUser(token: string): Promise<AuthUser> {
    const payload = verifyAuthToken(token, this.jwtSecret);
    if (!payload) {
      throw new AuthError("UNAUTHORIZED", "Invalid or expired authentication token", 401);
    }

    const user = await this.repository.findById(payload.sub);
    if (!user) {
      throw new AuthError("UNAUTHORIZED", "Account no longer exists", 401);
    }

    if (user.isBanned) {
      throw new AuthError(
        "ACCOUNT_BANNED",
        user.banReason ? `Account is banned: ${user.banReason}` : "Account is banned",
        403
      );
    }

    return toAuthUser(user);
  }
}
