import { describe, expect, it } from "vitest";
import { createPlayerCollision, movementSpeed, stepMovement } from "./movement.js";

describe("online movement", () => {
  it("normalizes diagonals and preserves partial joystick input", () => {
    const origin = { x: 0, y: 0 };
    const open = () => true;
    const diagonal = stepMovement(origin, { dx: 1, dy: 1, sprint: false }, 160, 50, open);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(8);
    expect(stepMovement(origin, { dx: 0.5, dy: 0, sprint: false }, 160, 50, open).x).toBe(4);
  });

  it("uses the foot hitbox and slides along blocked tiles", () => {
    const canOccupy = createPlayerCollision({
      width: 3, height: 3, tileWidth: 32, tileHeight: 32,
      isBlocked: (column) => column === 1,
    });
    expect(canOccupy(7, 16)).toBe(false);
    expect(canOccupy(24, 16)).toBe(true);
    const next = stepMovement({ x: 24, y: 16 }, { dx: 1, dy: 1, sprint: false }, 160, 50, canOccupy);
    expect(next.x).toBe(24);
    expect(next.y).toBeGreaterThan(16);
  });

  it("requires energy for sprint and applies hunger modifiers", () => {
    expect(movementSpeed(1, 100, 0, true)).toBe(160);
    expect(movementSpeed(1, 100, 1, true)).toBe(200);
    expect(movementSpeed(1, 0, 1, false)).toBeLessThan(160);
  });
});
