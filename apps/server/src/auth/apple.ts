import { createPublicKey, createVerify, type JsonWebKey } from "node:crypto";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

export interface AppleTokenClaims {
  sub: string;
  email?: string;
  emailVerified: boolean;
}

export interface AppleTokenVerifier {
  verifyIdToken(idToken: string, expectedNonce?: string): Promise<AppleTokenClaims>;
}

interface AppleJwk extends JsonWebKey {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
}

interface AppleJwksResponse {
  keys: AppleJwk[];
}

export class AppleTokenVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppleTokenVerificationError";
  }
}

export function resolveAppleClientIds(): string[] {
  const raw = process.env.APPLE_CLIENT_ID ?? "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/**
 * Verifies Apple Sign-In identity tokens against Apple's public JWKS keys.
 */
export class JwksAppleTokenVerifier implements AppleTokenVerifier {
  private cachedKeys: AppleJwk[] = [];
  private cacheExpiresAt = 0;

  constructor(
    private readonly clientIds: string[],
    private readonly jwksUrl = APPLE_JWKS_URL
  ) {
    if (clientIds.length === 0) {
      throw new Error("At least one Apple client ID is required");
    }
  }

  private async fetchJwks(forceRefresh = false): Promise<AppleJwk[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedKeys.length > 0 && now < this.cacheExpiresAt) {
      return this.cachedKeys;
    }

    const response = await fetch(this.jwksUrl);
    if (!response.ok) {
      throw new AppleTokenVerificationError(
        `Failed to fetch Apple JWKS (${response.status})`
      );
    }

    const data = (await response.json()) as Partial<AppleJwksResponse>;
    if (!Array.isArray(data.keys)) {
      throw new AppleTokenVerificationError("Invalid Apple JWKS response");
    }

    this.cachedKeys = data.keys.filter(
      (key): key is AppleJwk =>
        typeof key === "object" &&
        key !== null &&
        typeof key.kid === "string" &&
        typeof key.kty === "string"
    );
    this.cacheExpiresAt = now + JWKS_CACHE_TTL_MS;
    return this.cachedKeys;
  }

  private async findSigningKey(kid: string): Promise<AppleJwk> {
    const keys = await this.fetchJwks(false);
    const match = keys.find((key) => key.kid === kid);
    if (match) {
      return match;
    }

    // Apple may have rotated keys; refresh cache once before failing.
    const refreshedKeys = await this.fetchJwks(true);
    const refreshedMatch = refreshedKeys.find((key) => key.kid === kid);
    if (!refreshedMatch) {
      throw new AppleTokenVerificationError("Matching Apple signing key not found");
    }
    return refreshedMatch;
  }

  async verifyIdToken(idToken: string, expectedNonce?: string): Promise<AppleTokenClaims> {
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      throw new AppleTokenVerificationError("Malformed Apple identity token");
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new AppleTokenVerificationError("Malformed Apple identity token");
    }

    let header: { alg?: unknown; kid?: unknown };
    let payload: Record<string, unknown>;
    try {
      header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as {
        alg?: unknown;
        kid?: unknown;
      };
      payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Record<
        string,
        unknown
      >;
    } catch {
      throw new AppleTokenVerificationError("Invalid Apple identity token encoding");
    }

    if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) {
      throw new AppleTokenVerificationError("Unsupported Apple token algorithm or key ID");
    }

    const jwk = await this.findSigningKey(header.kid);
    const publicKey = createPublicKey({ key: jwk, format: "jwk" });
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();

    let signature: Buffer;
    try {
      signature = Buffer.from(encodedSignature, "base64url");
    } catch {
      throw new AppleTokenVerificationError("Invalid Apple token signature encoding");
    }

    if (!verifier.verify(publicKey, signature)) {
      throw new AppleTokenVerificationError("Invalid Apple identity token signature");
    }

    if (payload.iss !== APPLE_ISSUER) {
      throw new AppleTokenVerificationError("Invalid Apple token issuer");
    }

    const audValid =
      typeof payload.aud === "string"
        ? this.clientIds.includes(payload.aud)
        : Array.isArray(payload.aud) &&
          payload.aud.some((aud) => typeof aud === "string" && this.clientIds.includes(aud));

    if (!audValid) {
      throw new AppleTokenVerificationError("Invalid Apple token audience");
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp <= nowSec) {
      throw new AppleTokenVerificationError("Expired Apple identity token");
    }

    if (typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
      throw new AppleTokenVerificationError("Missing Apple subject identifier");
    }

    if (expectedNonce !== undefined && payload.nonce !== expectedNonce) {
      throw new AppleTokenVerificationError("Invalid Apple token nonce");
    }

    const email =
      typeof payload.email === "string" && payload.email.trim().length > 0
        ? payload.email.trim().toLowerCase()
        : undefined;
    const emailVerified =
      payload.email_verified === true || payload.email_verified === "true";

    return {
      sub: payload.sub,
      email,
      emailVerified,
    };
  }
}
