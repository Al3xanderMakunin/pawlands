import { describe, expect, it } from "vitest";
import { JoinZoneOptionsSchema, MoveInputSchema } from "./messages.js";

describe("protocol schemas", () => {
  it("parses valid movement input", () => {
    const parsed = MoveInputSchema.safeParse({
      dx: 1,
      dy: -0.5,
      sprint: true,
      seq: 12,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects out-of-bounds movement vectors", () => {
    const parsed = MoveInputSchema.safeParse({
      dx: 2.5,
      dy: 0,
      seq: 1,
    });
    expect(parsed.success).toBe(false);
  });

  it("applies defaults for join zone options", () => {
    const parsed = JoinZoneOptionsSchema.parse({});
    expect(parsed).toEqual({
      zoneId: "oakpaw_village",
      name: "Whisker",
      archetype: "cat",
    });
  });
});
