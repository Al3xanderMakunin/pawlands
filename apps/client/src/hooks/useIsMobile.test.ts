import { afterEach, describe, expect, it, vi } from "vitest";
import { detectIsMobile } from "./useIsMobile.js";

describe("detectIsMobile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(detectIsMobile()).toBe(false);
  });

  it("returns true for narrow viewports even with fine pointer", () => {
    vi.stubGlobal("window", {
      innerWidth: 390,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
    expect(detectIsMobile()).toBe(true);
  });

  it("returns true for coarse-pointer devices even in wide landscape viewports", () => {
    vi.stubGlobal("window", {
      innerWidth: 844,
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    });
    expect(detectIsMobile()).toBe(true);
  });

  it("returns false for wide desktop viewports with fine pointer", () => {
    vi.stubGlobal("window", {
      innerWidth: 1280,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
    expect(detectIsMobile()).toBe(false);
  });
});
