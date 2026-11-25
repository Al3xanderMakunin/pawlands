import { describe, expect, it } from "vitest";
import { advanceProgression, MAX_LEVEL, xpForNextLevel } from "./progression.js";

describe("advanceProgression", () => {
  it("preserves fractional progress and carries excess experience through levels", () => {
    expect(advanceProgression(1, 10, 0.5)).toEqual({ level: 1, xp: 10.5 });
    expect(advanceProgression(1, 99, 1)).toEqual({ level: 2, xp: 0 });
    expect(advanceProgression(1, 99, 205)).toEqual({ level: 3, xp: 4 });
  });

  it("caps level and removes excess XP at the cap", () => {
    const level = MAX_LEVEL - 1;
    expect(advanceProgression(level, xpForNextLevel(level) - 1, 2))
      .toEqual({ level: MAX_LEVEL, xp: 0 });
    expect(advanceProgression(MAX_LEVEL, 0, 100)).toEqual({ level: MAX_LEVEL, xp: 0 });
  });
});
