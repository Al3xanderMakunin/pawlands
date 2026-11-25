import { randomBytes } from "node:crypto";
import type {
  AuthErrorCode,
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  UserRole,
} from "@pawlands/protocol";
import type { AuthRepository, UserRecord } from "./authRepository.js";
import type { GoogleUserProfile } from "./googleOAuth.js";
import { signAuthToken, verifyAuthToken } from "./jwt.js";
import { hashPassword, verifyPassword } from "./password.js";

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
    private readonly jwtSecret: string
  ) {}

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

    const token = signAuthToken(
      {
        sub: created.id,
        username: created.username,
        email: created.email,
        role: created.role,
      },
      this.jwtSecret
    );

    return {
      token,
      user: toAuthUser(created),
    };
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
