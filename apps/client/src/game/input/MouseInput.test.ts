import { describe, expect, it } from "vitest";
import { ClickMoveTracker } from "./MouseInput";

describe("ClickMoveTracker", () => {
  it("moves toward target with a unit vector and stops upon arrival", () => {
    const tracker = new ClickMoveTracker({ arrivalThresholdPx: 6 });
    tracker.setTarget(100, 0);

    const step1 = tracker.sample(0, 0, 16);
    expect(step1.moveX).toBeCloseTo(1);
    expect(step1.moveY).toBeCloseTo(0);
    expect(step1.arrived).toBe(false);
    expect(step1.blocked).toBe(false);

    const step2 = tracker.sample(60, 0, 16);
    expect(step2.moveX).toBeCloseTo(1);
    expect(step2.moveY).toBeCloseTo(0);
    expect(tracker.hasTarget()).toBe(true);

    // Within arrivalThresholdPx (distance = 5 <= 6)
    const arrived = tracker.sample(95, 0, 16);
    expect(arrived).toEqual({
      moveX: 0,
      moveY: 0,
      arrived: true,
      blocked: false,
    });
    expect(tracker.hasTarget()).toBe(false);
  });

  it("normalizes diagonal movement and clamps target to world bounds", () => {
    const tracker = new ClickMoveTracker({
      bounds: { width: 320, height: 240 },
    });
    tracker.setTarget(500, -50);

    expect(tracker.getTarget()).toEqual({ x: 320, y: 0 });

    const step = tracker.sample(290, 40, 16);
    // dx = 30, dy = -40, dist = 50 -> (0.6, -0.8)
    expect(step.moveX).toBeCloseTo(0.6);
    expect(step.moveY).toBeCloseTo(-0.8);
  });

  it("cancels target when stuck against an obstacle past stuckTimeoutMs", () => {
    const tracker = new ClickMoveTracker({ stuckTimeoutMs: 250 });
    tracker.setTarget(200, 200);

    // First sample establishes baseline position
    expect(tracker.sample(10, 10, 100).blocked).toBe(false);
    // Player does not move for 150ms -> still trying
    expect(tracker.sample(10, 10, 150).blocked).toBe(false);
    // Player still stuck at 260ms total -> cancelled as blocked
    const blocked = tracker.sample(10.2, 10, 110);
    expect(blocked).toEqual({
      moveX: 0,
      moveY: 0,
      arrived: false,
      blocked: true,
    });
    expect(tracker.hasTarget()).toBe(false);
  });

  it("resets stuck timer when progress resumes and supports manual clear", () => {
    const tracker = new ClickMoveTracker({ stuckTimeoutMs: 200 });
    tracker.setTarget(100, 0);

    tracker.sample(0, 0, 16);
    tracker.sample(0, 0, 150);
    // Player moves 5px -> resets stuck timer
    expect(tracker.sample(5, 0, 16).blocked).toBe(false);
    expect(tracker.sample(5, 0, 150).blocked).toBe(false);

    tracker.clear();
    expect(tracker.hasTarget()).toBe(false);
    expect(tracker.sample(5, 0, 16)).toEqual({
      moveX: 0,
      moveY: 0,
      arrived: false,
      blocked: false,
    });
  });
});
