import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AuthError } from "./authService.js";

export interface YandexUserProfile {
  yandexId: string;
  email: string | null;
  login: string | null;
  displayName: string | null;
}

export interface YandexOAuthProvider {
  isConfigured(): boolean;
  createState(secret: string, ttlSec?: number): string;
  verifyState(state: string, secret: string): boolean;
  getAuthorizationUrl(state: string, redirectUri?: string): string;
  exchangeCodeForProfile(code: string, redirectUri?: string): Promise<YandexUserProfile>;
}

export interface YandexOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

const YandexTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
});

const YandexUserInfoSchema = z.object({
  id: z.string().min(1),
  login: z.string().optional(),
  default_email: z.string().email().optional(),
  emails: z.array(z.string().email()).optional(),
  display_name: z.string().optional(),
  real_name: z.string().optional(),
});

const DEFAULT_STATE_TTL_SEC = 600; // 10 minutes
const YANDEX_AUTHORIZE_URL = "https://oauth.yandex.ru/authorize";
const YANDEX_TOKEN_URL = "https://oauth.yandex.ru/token";
const YANDEX_USERINFO_URL = "https://login.yandex.ru/info?format=json";

export function resolveYandexOAuthConfig(): YandexOAuthConfig {
  return {
    clientId: (process.env.YANDEX_CLIENT_ID ?? "").trim(),
    clientSecret: (process.env.YANDEX_CLIENT_SECRET ?? "").trim(),
    redirectUri: process.env.YANDEX_REDIRECT_URI?.trim() || undefined,
  };
}

export class YandexOAuthClient implements YandexOAuthProvider {
  constructor(private readonly config: YandexOAuthConfig) {}

  isConfigured(): boolean {
    return this.config.clientId.length > 0 && this.config.clientSecret.length > 0;
  }

  createState(secret: string, ttlSec = DEFAULT_STATE_TTL_SEC): string {
    const nowSec = Math.floor(Date.now() / 1000);
    const payload = {
      nonce: randomBytes(16).toString("hex"),
      iat: nowSec,
      exp: nowSec + ttlSec,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
    return `${encoded}.${sig}`;
  }

  verifyState(state: string, secret: string): boolean {
    const parts = state.split(".");
    if (parts.length !== 2) return false;
    const [encoded, providedSig] = parts;
    if (!encoded || !providedSig) return false;

    const expectedSig = createHmac("sha256", secret).update(encoded).digest();
    let actualSig: Buffer;
    try {
      actualSig = Buffer.from(providedSig, "base64url");
    } catch {
      return false;
    }

    if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) {
      return false;
    }

    try {
      const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
        exp?: unknown;
      };
      if (typeof payload.exp !== "number") return false;
      const nowSec = Math.floor(Date.now() / 1000);
      return payload.exp > nowSec;
    } catch {
      return false;
    }
  }

  getAuthorizationUrl(state: string, redirectUri?: string): string {
    const url = new URL(YANDEX_AUTHORIZE_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("state", state);
    const resolvedRedirect = this.config.redirectUri ?? redirectUri;
    if (resolvedRedirect) {
      url.searchParams.set("redirect_uri", resolvedRedirect);
    }
    return url.toString();
  }

  async exchangeCodeForProfile(code: string, redirectUri?: string): Promise<YandexUserProfile> {
    if (!this.isConfigured()) {
      throw new AuthError("YANDEX_NOT_CONFIGURED", "Yandex ID OAuth is not configured", 503);
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });
    const resolvedRedirect = this.config.redirectUri ?? redirectUri;
    if (resolvedRedirect) {
      body.set("redirect_uri", resolvedRedirect);
    }

    let tokenRes: Response;
    try {
      tokenRes = await fetch(YANDEX_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
    } catch {
      throw new AuthError("YANDEX_AUTH_FAILED", "Failed to reach Yandex OAuth token endpoint", 502);
    }

    if (!tokenRes.ok) {
      throw new AuthError("YANDEX_AUTH_FAILED", "Yandex OAuth token exchange failed", 502);
    }

    const tokenJson = YandexTokenResponseSchema.safeParse(await tokenRes.json().catch(() => null));
    if (!tokenJson.success) {
      throw new AuthError("YANDEX_AUTH_FAILED", "Invalid Yandex OAuth token response", 502);
    }

    let userRes: Response;
    try {
      userRes = await fetch(YANDEX_USERINFO_URL, {
        method: "GET",
        headers: {
          Authorization: `OAuth ${tokenJson.data.access_token}`,
        },
      });
    } catch {
      throw new AuthError("YANDEX_AUTH_FAILED", "Failed to reach Yandex ID userinfo endpoint", 502);
    }

    if (!userRes.ok) {
      throw new AuthError("YANDEX_AUTH_FAILED", "Failed to fetch Yandex ID user profile", 502);
    }

    const userJson = YandexUserInfoSchema.safeParse(await userRes.json().catch(() => null));
    if (!userJson.success) {
      throw new AuthError("YANDEX_AUTH_FAILED", "Invalid Yandex ID user profile response", 502);
    }

    const email = userJson.data.default_email ?? userJson.data.emails?.[0] ?? null;
    const login = userJson.data.login ?? null;
    const displayName = userJson.data.display_name ?? userJson.data.real_name ?? null;

    return {
      yandexId: userJson.data.id,
      email,
      login,
      displayName,
    };
  }
}
