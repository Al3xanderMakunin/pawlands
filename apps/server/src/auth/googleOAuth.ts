import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleUserProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export interface GoogleOAuthClient {
  exchangeCodeForProfile(code: string, config: GoogleOAuthConfig): Promise<GoogleUserProfile>;
}

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const STATE_TTL_SEC = 60 * 10; // 10 minutes

export function resolveGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  const port = process.env.PORT ?? "2567";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `http://localhost:${port}/api/v1/auth/google/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function resolveAppUrl(override?: string): string {
  const raw =
    override?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.CORS_ORIGIN?.trim() ||
    "http://localhost:5173";
  return raw.replace(/\/+$/, "");
}

/**
 * Creates a short-lived HMAC-signed OAuth state token to prevent CSRF.
 */
export function createGoogleStateToken(secret: string, ttlSec = STATE_TTL_SEC): string {
  const payload = {
    nonce: randomBytes(16).toString("hex"),
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(`google_state.${encoded}`).digest("base64url");
  return `${encoded}.${signature}`;
}

/**
 * Verifies an HMAC-signed OAuth state token and checks its expiration.
 */
export function verifyGoogleStateToken(state: string, secret: string): boolean {
  const parts = state.split(".");
  if (parts.length !== 2) return false;

  const [encoded, encodedSig] = parts;
  if (!encoded || !encodedSig) return false;

  const expectedSig = createHmac("sha256", secret)
    .update(`google_state.${encoded}`)
    .digest();

  let actualSig: Buffer;
  try {
    actualSig = Buffer.from(encodedSig, "base64url");
  } catch {
    return false;
  }

  if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      nonce?: unknown;
      exp?: unknown;
    };
    const nowSec = Math.floor(Date.now() / 1000);
    return typeof payload.nonce === "string" && typeof payload.exp === "number" && payload.exp > nowSec;
  } catch {
    return false;
  }
}

export function buildGoogleAuthUrl(config: GoogleOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export class FetchGoogleOAuthClient implements GoogleOAuthClient {
  async exchangeCodeForProfile(code: string, config: GoogleOAuthConfig): Promise<GoogleUserProfile> {
    const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Google token exchange failed with status ${tokenRes.status}`);
    }

    const tokenData = (await tokenRes.json()) as { access_token?: unknown };
    if (typeof tokenData.access_token !== "string" || !tokenData.access_token) {
      throw new Error("Google token response missing access_token");
    }

    const userInfoRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoRes.ok) {
      throw new Error(`Google userinfo request failed with status ${userInfoRes.status}`);
    }

    const profileData = (await userInfoRes.json()) as {
      sub?: unknown;
      email?: unknown;
      email_verified?: unknown;
      name?: unknown;
    };

    if (typeof profileData.sub !== "string" || typeof profileData.email !== "string") {
      throw new Error("Google userinfo response missing sub or email");
    }

    return {
      sub: profileData.sub,
      email: profileData.email,
      emailVerified: Boolean(profileData.email_verified),
      name: typeof profileData.name === "string" ? profileData.name : undefined,
    };
  }
}
