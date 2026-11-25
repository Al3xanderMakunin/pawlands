export interface PawlandsRuntimeEnv {
  VITE_API_URL?: string;
  VITE_WS_URL?: string;
  VITE_TELEGRAM_BOT_USERNAME?: string;
  VITE_APPLE_CLIENT_ID?: string;
  VITE_APPLE_REDIRECT_URI?: string;
  VITE_VK_CLIENT_ID?: string;
  VITE_VK_REDIRECT_URI?: string;
}

export type PawlandsEnvKey = keyof PawlandsRuntimeEnv;

declare global {
  interface Window {
    __PAWLANDS_ENV__?: PawlandsRuntimeEnv;
  }
}

/**
 * Resolves a client environment variable, preferring runtime injection
 * (`window.__PAWLANDS_ENV__`) over Vite's build-time `import.meta.env`.
 * Empty or whitespace-only values are treated as unset.
 */
export function getEnv(key: PawlandsEnvKey): string | undefined {
  const runtimeRaw =
    typeof window !== "undefined" ? window.__PAWLANDS_ENV__?.[key] : undefined;
  const runtimeTrimmed = typeof runtimeRaw === "string" ? runtimeRaw.trim() : "";
  if (runtimeTrimmed) {
    return runtimeTrimmed;
  }

  const buildRaw = import.meta.env[key];
  const buildTrimmed = typeof buildRaw === "string" ? buildRaw.trim() : "";
  return buildTrimmed || undefined;
}
