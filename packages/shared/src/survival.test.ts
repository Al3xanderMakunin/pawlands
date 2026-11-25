import { describe, expect, it } from "vitest";
import { calculateEncumbrance, calculateSurvivalModifiers } from "./survival.js";

describe("calculateSurvivalModifiers", () => {
  it("returns full regeneration and speed when well fed", () => {
    expect(calculateSurvivalModifiers(100)).toEqual({
      status: "well_fed",
      energyRegenMultiplier: 1.0,
      moveSpeedMultiplier: 1.0,
      healthDrainPerSecond: 0,
    });
    expect(calculateSurvivalModifiers(60).status).toBe("well_fed");
  });

  it("halves energy regeneration when hungry", () => {
    expect(calculateSurvivalModifiers(59)).toEqual({
      status: "hungry",
      energyRegenMultiplier: 0.5,
      moveSpeedMultiplier: 1.0,
      healthDrainPerSecond: 0,
    });
    expect(calculateSurvivalModifiers(25).status).toBe("hungry");
  });

  it("reduces speed and energy regeneration when famished", () => {
    expect(calculateSurvivalModifiers(24)).toEqual({
      status: "famished",
      energyRegenMultiplier: 0.2,
      moveSpeedMultiplier: 0.85,
      healthDrainPerSecond: 0,
    });
    expect(calculateSurvivalModifiers(1).status).toBe("famished");
  });

  it("drains health and blocks energy regen when starving", () => {
    expect(calculateSurvivalModifiers(0)).toEqual({
      status: "starving",
      energyRegenMultiplier: 0,
      moveSpeedMultiplier: 0.7,
      healthDrainPerSecond: 2,
    });
    expect(calculateSurvivalModifiers(-10).status).toBe("starving");
  });
});

describe("calculateEncumbrance", () => {
  it("keeps full speed under 75% capacity", () => {
    const result = calculateEncumbrance(10, 20);
    expect(result.tier).toBe("light");
    expect(result.moveSpeedMultiplier).toBe(1.0);
    expect(result.canSprint).toBe(true);
  });

  it("applies heavy penalties between 75% and 99.9% capacity", () => {
    const result = calculateEncumbrance(15, 20);
    expect(result.tier).toBe("heavy");
    expect(result.moveSpeedMultiplier).toBe(0.85);
    expect(result.energyCostMultiplier).toBe(1.25);
    expect(result.canSprint).toBe(true);
  });

  it("disables sprinting and halves speed when overloaded", () => {
    const result = calculateEncumbrance(25, 25);
    expect(result.tier).toBe("overloaded");
    expect(result.moveSpeedMultiplier).toBe(0.5);
    expect(result.energyCostMultiplier).toBe(1.6);
    expect(result.canSprint).toBe(false);
  });
});
