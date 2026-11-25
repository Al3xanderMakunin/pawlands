import { describe, expect, it } from "vitest";
import { computeTouchControlsLayout } from "./touchControlsLayout.js";

describe("computeTouchControlsLayout", () => {
  it("keeps joystick and all action buttons inside portrait mobile bounds", () => {
    const width = 390;
    const height = 844;
    const layout = computeTouchControlsLayout(width, height, {
      left: 0,
      right: 0,
      bottom: 34,
    });

    // Joystick (radius 44) stays inside viewport and above home indicator
    expect(layout.stickX - 44).toBeGreaterThanOrEqual(0);
    expect(layout.stickY + 44).toBeLessThanOrEqual(height - 34);

    // Attack (r=30), Interact (r=24), Sprint (r=22) stay inside viewport and above home indicator
    expect(layout.attackX + 30).toBeLessThanOrEqual(width);
    expect(layout.attackY + 30).toBeLessThanOrEqual(height - 34);
    expect(layout.interactY + 24).toBeLessThanOrEqual(height - 34);
    expect(layout.sprintY - 22).toBeGreaterThanOrEqual(0);
  });

  it("respects left and right safe area insets in landscape", () => {
    const width = 844;
    const height = 390;
    const layout = computeTouchControlsLayout(width, height, {
      left: 47,
      right: 47,
      bottom: 21,
    });

    expect(layout.stickX - 44).toBeGreaterThanOrEqual(47);
    expect(layout.attackX + 30).toBeLessThanOrEqual(width - 47);
    expect(layout.interactY + 24).toBeLessThanOrEqual(height - 21);
  });
});
