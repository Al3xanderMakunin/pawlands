import type { VkAuthRequest } from "@pawlands/protocol";

const VK_AUTH_URL = "https://id.vk.ru/oauth2/auth";
const VK_PKCE_STORAGE_KEY = "pawlands.vk_pkce";
const PKCE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

interface StoredVkPkce {
  state: string;
  codeVerifier: string;
  redirectUri: string;
}

export type VkCallbackResult =
  | { status: "none" }
  | { status: "ready"; payload: VkAuthRequest }
  | { status: "error"; errorCode: "VK_AUTH_FAILED" | "VK_STATE_MISMATCH" };

function randomUrlSafeString(length: number): string {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += PKCE_CHARSET[bytes[i]! % PKCE_CHARSET.length];
  }
  return result;
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  return toBase64Url(digest);
}

export function resolveVkRedirectUri(): string {
  const configured = import.meta.env.VITE_VK_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }
  return `${window.location.origin}/`;
}

export function getVkClientId(): string | null {
  const clientId = import.meta.env.VITE_VK_CLIENT_ID?.trim();
  return clientId || null;
}

export async function startVkIdAuth(): Promise<"redirecting" | "not_configured"> {
  const clientId = getVkClientId();
  if (!clientId || typeof window === "undefined") {
    return "not_configured";
  }

  const codeVerifier = randomUrlSafeString(64);
  const state = randomUrlSafeString(32);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const redirectUri = resolveVkRedirectUri();

  const stored: StoredVkPkce = {
    state,
    codeVerifier,
    redirectUri,
  };

  try {
    window.sessionStorage.setItem(VK_PKCE_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    return "not_configured";
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    scope: "email",
  });

  window.location.assign(`${VK_AUTH_URL}?${params.toString()}`);
  return "redirecting";
}

export function consumeVkIdCallbackFromUrl(): VkCallbackResult {
  if (typeof window === "undefined") {
    return { status: "none" };
  }

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const deviceId = url.searchParams.get("device_id");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  let storedRaw: string | null = null;
  try {
    storedRaw = window.sessionStorage.getItem(VK_PKCE_STORAGE_KEY);
  } catch {
    storedRaw = null;
  }

  if (!code && !oauthError) {
    return { status: "none" };
  }

  if (!storedRaw && !deviceId && !state) {
    // Query parameters are unrelated to a Pawlands VK ID PKCE flow
    return { status: "none" };
  }

  // Clean OAuth parameters from the browser address bar
  for (const param of ["code", "device_id", "state", "error", "error_description", "type"]) {
    url.searchParams.delete(param);
  }
  window.history.replaceState({}, document.title, url.toString());

  try {
    window.sessionStorage.removeItem(VK_PKCE_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }

  if (oauthError) {
    return { status: "error", errorCode: "VK_AUTH_FAILED" };
  }

  if (!storedRaw || !code || !deviceId || !state) {
    return { status: "error", errorCode: "VK_STATE_MISMATCH" };
  }

  let stored: Partial<StoredVkPkce>;
  try {
    stored = JSON.parse(storedRaw) as Partial<StoredVkPkce>;
  } catch {
    return { status: "error", errorCode: "VK_STATE_MISMATCH" };
  }

  if (
    typeof stored.state !== "string" ||
    typeof stored.codeVerifier !== "string" ||
    typeof stored.redirectUri !== "string" ||
    stored.state !== state
  ) {
    return { status: "error", errorCode: "VK_STATE_MISMATCH" };
  }

  return {
    status: "ready",
    payload: {
      code,
      deviceId,
      codeVerifier: stored.codeVerifier,
      redirectUri: stored.redirectUri,
    },
  };
}
