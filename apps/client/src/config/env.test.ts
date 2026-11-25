import { afterEach, describe, expect, it, vi } from "vitest";
import { getEnv, type PawlandsRuntimeEnv } from "./env";

describe("getEnv", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("prefers non-empty runtime values from window.__PAWLANDS_ENV__ over import.meta.env", () => {
    vi.stubEnv("VITE_API_URL", "http://build-time:2567");
    vi.stubGlobal("window", {
      __PAWLANDS_ENV__: {
        VITE_API_URL: "  https://runtime.example.com  ",
      } satisfies PawlandsRuntimeEnv,
    });

    expect(getEnv("VITE_API_URL")).toBe("https://runtime.example.com");
  });

  it("falls back to import.meta.env when runtime value is empty or whitespace", () => {
    vi.stubEnv("VITE_WS_URL", "wss://build.example.com");
    vi.stubGlobal("window", {
      __PAWLANDS_ENV__: {
        VITE_WS_URL: "   ",
      } satisfies PawlandsRuntimeEnv,
    });

    expect(getEnv("VITE_WS_URL")).toBe("wss://build.example.com");
  });

  it("returns undefined when neither runtime nor build-time value is set", () => {
    vi.stubGlobal("window", {
      __PAWLANDS_ENV__: {
        VITE_TELEGRAM_BOT_USERNAME: "",
        VITE_APPLE_CLIENT_ID: "",
        VITE_APPLE_REDIRECT_URI: "",
        VITE_VK_CLIENT_ID: "",
        VITE_VK_REDIRECT_URI: "",
      } satisfies PawlandsRuntimeEnv,
    });

    expect(getEnv("VITE_TELEGRAM_BOT_USERNAME")).toBeUndefined();
    expect(getEnv("VITE_APPLE_CLIENT_ID")).toBeUndefined();
    expect(getEnv("VITE_APPLE_REDIRECT_URI")).toBeUndefined();
    expect(getEnv("VITE_VK_CLIENT_ID")).toBeUndefined();
    expect(getEnv("VITE_VK_REDIRECT_URI")).toBeUndefined();
  });

  it("reads runtime values for all supported OAuth and network keys", () => {
    vi.stubGlobal("window", {
      __PAWLANDS_ENV__: {
        VITE_API_URL: "https://api.pawlands.test",
        VITE_WS_URL: "wss://ws.pawlands.test",
        VITE_TELEGRAM_BOT_USERNAME: "pawlands_bot",
        VITE_APPLE_CLIENT_ID: "com.pawlands.web",
        VITE_APPLE_REDIRECT_URI: "https://pawlands.test/apple",
        VITE_VK_CLIENT_ID: "123456",
        VITE_VK_REDIRECT_URI: "https://pawlands.test/vk",
      } satisfies PawlandsRuntimeEnv,
    });

    expect(getEnv("VITE_API_URL")).toBe("https://api.pawlands.test");
    expect(getEnv("VITE_WS_URL")).toBe("wss://ws.pawlands.test");
    expect(getEnv("VITE_TELEGRAM_BOT_USERNAME")).toBe("pawlands_bot");
    expect(getEnv("VITE_APPLE_CLIENT_ID")).toBe("com.pawlands.web");
    expect(getEnv("VITE_APPLE_REDIRECT_URI")).toBe("https://pawlands.test/apple");
    expect(getEnv("VITE_VK_CLIENT_ID")).toBe("123456");
    expect(getEnv("VITE_VK_REDIRECT_URI")).toBe("https://pawlands.test/vk");
  });
});
