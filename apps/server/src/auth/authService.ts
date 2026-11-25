import type {
  AuthErrorCode,
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from "@pawlands/protocol";
import type { AuthRepository, UserRecord } from "./authRepository.js";
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
    createdAt: record.createdAt.toISOString(),
  };
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

    let created: UserRecord;
    try {
      created = await this.repository.createUser({
        email,
        username,
        passwordHash,
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

    if (!user) {
      throw new AuthError("INVALID_CREDENTIALS", "Invalid email/username or password", 401);
    }

    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthError("INVALID_CREDENTIALS", "Invalid email/username or password", 401);
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

  async getCurrentUser(token: string): Promise<AuthUser> {
    const payload = verifyAuthToken(token, this.jwtSecret);
    if (!payload) {
      throw new AuthError("UNAUTHORIZED", "Invalid or expired authentication token", 401);
    }

    const user = await this.repository.findById(payload.sub);
    if (!user) {
      throw new AuthError("UNAUTHORIZED", "Account no longer exists", 401);
    }

    return toAuthUser(user);
  }
}
