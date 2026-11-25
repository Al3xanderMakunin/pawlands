import { createHmac, timingSafeEqual } from "node:crypto";

export interface AuthTokenClaims {
  sub: string;
  username: string;
  email: string;
}

export interface AuthTokenPayload extends AuthTokenClaims {
  iat: number;
  exp: number;
}

const DEFAULT_TOKEN_TTL_SEC = 60 * 60 * 24 * 7; // 7 days
const JWT_HEADER = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");

export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret !== "change-me") {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set to a secure value in production");
  }
  return secret ?? "pawlands-dev-secret-change-me";
}

/**
 * Signs an HS256 JWT token for an authenticated user.
 */
export function signAuthToken(
  claims: AuthTokenClaims,
  secret: string,
  expiresInSec = DEFAULT_TOKEN_TTL_SEC
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    ...claims,
    iat: nowSec,
    exp: nowSec + expiresInSec,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${JWT_HEADER}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest("base64url");

  return `${signingInput}.${signature}`;
}

/**
 * Verifies an HS256 JWT token and returns its payload if valid and unexpired.
 */
export function verifyAuthToken(token: string, secret: string): AuthTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return null;
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = createHmac("sha256", secret).update(signingInput).digest();

  let actualSig: Buffer;
  try {
    actualSig = Buffer.from(encodedSignature, "base64url");
  } catch {
    return null;
  }

  if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) {
    return null;
  }

  try {
    const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as {
      alg?: unknown;
      typ?: unknown;
    };
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as Partial<AuthTokenPayload>;

    if (
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSec) {
      return null;
    }

    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}
