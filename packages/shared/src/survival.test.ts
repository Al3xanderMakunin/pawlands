import { describe, expect, it } from "vitest";
import { calculateEncumbrance, calculateSurvivalModifiers, canSprint, stepSurvival } from "./survival.js";

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

describe("stepSurvival", () => {
  const vitals = { hp: 100, energy: 20, maxEnergy: 25, satiety: 80 };

  it("regenerates energy up to the cap and slows hunger while resting in a settlement", () => {
    expect(stepSurvival(vitals, 1, false, true, 1)).toEqual({ hp: 100, energy: 25, satiety: 79.95 });
    expect(stepSurvival(vitals, 1, false, false, 1).satiety).toBe(79.9);
    expect(stepSurvival({ ...vitals, satiety: 40 }, 1, false, false, 1).energy).toBe(24);
  });

  it("charges energy based on carry weight and clamps exhausted energy", () => {
    expect(stepSurvival(vitals, 1, true, false, 1.25)).toEqual({ hp: 100, energy: 5, satiety: 79.7 });
    expect(stepSurvival(vitals, 2, true, false, 1).energy).toBe(0);
    expect(canSprint(0, 0, 20)).toBe(false);
    expect(canSprint(20, 20, 20)).toBe(false);
    expect(canSprint(20, 15, 20)).toBe(true);
  });

  it("drains health only for elapsed time spent starving and stops at zero", () => {
    expect(stepSurvival({ ...vitals, satiety: 0.1 }, 2, false, false, 1).hp).toBe(98);
    expect(stepSurvival({ ...vitals, hp: 1, satiety: 0 }, 1, false, false, 1))
      .toEqual({ hp: 0, energy: 20, satiety: 0 });
  });
});
