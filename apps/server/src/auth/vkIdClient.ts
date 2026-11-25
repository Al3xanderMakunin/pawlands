import type { VkAuthRequest } from "@pawlands/protocol";
import { AuthError } from "./authError.js";

export interface VkUserProfile {
  vkId: string;
  email: string | null;
  firstName?: string;
  lastName?: string;
}

export interface VkIdProvider {
  exchangeCodeAndGetProfile(input: VkAuthRequest): Promise<VkUserProfile>;
}

interface VkTokenResponse {
  access_token?: unknown;
  user_id?: unknown;
  error?: unknown;
  error_description?: unknown;
}

interface VkUserInfoResponse {
  user?: {
    user_id?: unknown;
    first_name?: unknown;
    last_name?: unknown;
    email?: unknown;
  };
  error?: unknown;
  error_description?: unknown;
}

const VK_TOKEN_ENDPOINT = "https://id.vk.ru/oauth2/auth";
const VK_USER_INFO_ENDPOINT = "https://id.vk.ru/oauth2/user_info";

export class HttpVkIdProvider implements VkIdProvider {
  constructor(
    private readonly clientId: string | undefined = process.env.VK_CLIENT_ID,
    private readonly clientSecret: string | undefined = process.env.VK_CLIENT_SECRET
  ) {}

  async exchangeCodeAndGetProfile(input: VkAuthRequest): Promise<VkUserProfile> {
    const clientId = this.clientId?.trim();
    if (!clientId) {
      throw new AuthError(
        "VK_AUTH_NOT_CONFIGURED",
        "VK ID authentication is not configured on the server",
        503
      );
    }

    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code: input.code,
      code_verifier: input.codeVerifier,
      device_id: input.deviceId,
      redirect_uri: input.redirectUri,
    });

    if (this.clientSecret?.trim()) {
      tokenBody.set("client_secret", this.clientSecret.trim());
    }

    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(VK_TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenBody.toString(),
      });
    } catch {
      throw new AuthError("VK_AUTH_FAILED", "Failed to reach VK ID token endpoint", 502);
    }

    let tokenData: VkTokenResponse;
    try {
      tokenData = (await tokenResponse.json()) as VkTokenResponse;
    } catch {
      throw new AuthError("VK_AUTH_FAILED", "Invalid response from VK ID token endpoint", 502);
    }

    if (!tokenResponse.ok || tokenData.error || typeof tokenData.access_token !== "string") {
      const description =
        typeof tokenData.error_description === "string"
          ? tokenData.error_description
          : "VK ID authorization code exchange failed";
      throw new AuthError("VK_AUTH_FAILED", description, 401);
    }

    const userInfoBody = new URLSearchParams({
      access_token: tokenData.access_token,
      client_id: clientId,
    });

    let userInfoResponse: Response;
    try {
      userInfoResponse = await fetch(VK_USER_INFO_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: userInfoBody.toString(),
      });
    } catch {
      throw new AuthError("VK_AUTH_FAILED", "Failed to reach VK ID user info endpoint", 502);
    }

    let userInfoData: VkUserInfoResponse;
    try {
      userInfoData = (await userInfoResponse.json()) as VkUserInfoResponse;
    } catch {
      throw new AuthError("VK_AUTH_FAILED", "Invalid response from VK ID user info endpoint", 502);
    }

    if (!userInfoResponse.ok || userInfoData.error || !userInfoData.user) {
      throw new AuthError("VK_AUTH_FAILED", "Failed to fetch VK ID user profile", 401);
    }

    const rawVkId = userInfoData.user.user_id ?? tokenData.user_id;
    const vkId =
      typeof rawVkId === "string" || typeof rawVkId === "number" ? String(rawVkId).trim() : "";

    if (!vkId) {
      throw new AuthError("VK_AUTH_FAILED", "VK ID user profile is missing user_id", 401);
    }

    const rawEmail =
      typeof userInfoData.user.email === "string" ? userInfoData.user.email.trim().toLowerCase() : "";

    return {
      vkId,
      email: rawEmail || null,
      firstName:
        typeof userInfoData.user.first_name === "string"
          ? userInfoData.user.first_name.trim()
          : undefined,
      lastName:
        typeof userInfoData.user.last_name === "string"
          ? userInfoData.user.last_name.trim()
          : undefined,
    };
  }
}
