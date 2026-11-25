import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeVkIdCallbackFromUrl } from "./vkIdAuth";

describe("vkIdAuth callback parsing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    const storage = new Map<string, string>();
    const url = new URL("http://localhost:5173/");

    vi.stubGlobal("window", {
      location: {
        href: url.toString(),
        origin: url.origin,
      },
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
      history: {
        replaceState: vi.fn(),
      },
    });
    vi.stubGlobal("document", { title: "Pawlands" });
  });

  it("returns none when URL has no VK callback parameters", () => {
    expect(consumeVkIdCallbackFromUrl()).toEqual({ status: "none" });
  });

  it("extracts valid PKCE callback parameters when state matches", () => {
    window.sessionStorage.setItem(
      "pawlands.vk_pkce",
      JSON.stringify({
        state: "state-123",
        codeVerifier: "v".repeat(64),
        redirectUri: "http://localhost:5173/",
      })
    );
    window.location.href =
      "http://localhost:5173/?code=vk2.a.abc&device_id=dev-9&state=state-123";

    const result = consumeVkIdCallbackFromUrl();
    expect(result).toEqual({
      status: "ready",
      payload: {
        code: "vk2.a.abc",
        deviceId: "dev-9",
        codeVerifier: "v".repeat(64),
        redirectUri: "http://localhost:5173/",
      },
    });
    expect(window.sessionStorage.getItem("pawlands.vk_pkce")).toBeNull();
  });

  it("rejects callback when state does not match stored PKCE state", () => {
    window.sessionStorage.setItem(
      "pawlands.vk_pkce",
      JSON.stringify({
        state: "expected-state",
        codeVerifier: "v".repeat(64),
        redirectUri: "http://localhost:5173/",
      })
    );
    window.location.href =
      "http://localhost:5173/?code=vk2.a.abc&device_id=dev-9&state=wrong-state";

    expect(consumeVkIdCallbackFromUrl()).toEqual({
      status: "error",
      errorCode: "VK_STATE_MISMATCH",
    });
  });
});
