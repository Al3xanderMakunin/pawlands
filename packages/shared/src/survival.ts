import { STARVATION_HP_DRAIN_PER_SEC } from "@pawlands/config";
import type { EncumbranceState, SurvivalModifiers, SurvivalState } from "./types.js";

/**
 * Clamp a numeric value to [min, max].
 */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Derive energy regeneration, movement speed, and starvation health drain
 * from a character's current satiety percentage (0..100).
 */
export function calculateSurvivalModifiers(satietyPercent: number): SurvivalModifiers {
  const satiety = clamp(satietyPercent, 0, 100);

  if (satiety >= 60) {
    return {
      status: "well_fed",
      energyRegenMultiplier: 1.0,
      moveSpeedMultiplier: 1.0,
      healthDrainPerSecond: 0,
    };
  }

  if (satiety >= 25) {
    return {
      status: "hungry",
      energyRegenMultiplier: 0.5,
      moveSpeedMultiplier: 1.0,
      healthDrainPerSecond: 0,
    };
  }

  if (satiety > 0) {
    return {
      status: "famished",
      energyRegenMultiplier: 0.2,
      moveSpeedMultiplier: 0.85,
      healthDrainPerSecond: 0,
    };
  }

  return {
    status: "starving",
    energyRegenMultiplier: 0,
    moveSpeedMultiplier: 0.7,
    healthDrainPerSecond: STARVATION_HP_DRAIN_PER_SEC,
  };
}

/**
 * Compute encumbrance penalties from carried item weight vs. max carry capacity.
 */
export function calculateEncumbrance(
  currentWeightKg: number,
  maxWeightKg: number
): EncumbranceState {
  const safeCurrent = Math.max(0, currentWeightKg);
  if (maxWeightKg <= 0) {
    return {
      tier: "overloaded",
      loadRatio: 1,
      moveSpeedMultiplier: 0.5,
      energyCostMultiplier: 1.6,
      canSprint: false,
    };
  }

  const loadRatio = safeCurrent / maxWeightKg;

  if (loadRatio < 0.75) {
    return {
      tier: "light",
      loadRatio,
      moveSpeedMultiplier: 1.0,
      energyCostMultiplier: 1.0,
      canSprint: true,
    };
  }

  if (loadRatio < 1.0) {
    return {
      tier: "heavy",
      loadRatio,
      moveSpeedMultiplier: 0.85,
      energyCostMultiplier: 1.25,
      canSprint: true,
    };
  }

  return {
    tier: "overloaded",
    loadRatio,
    moveSpeedMultiplier: 0.5,
    energyCostMultiplier: 1.6,
    canSprint: false,
  };
}

export function canSprint(energy: number, weightKg: number, maxWeightKg: number): boolean {
  return energy >= 1 && calculateEncumbrance(weightKg, maxWeightKg).canSprint;
}

export function stepSurvival(
  state: Pick<SurvivalState, "hp" | "energy" | "maxEnergy" | "satiety">,
  seconds: number,
  sprinting: boolean,
  restingInSettlement: boolean,
  energyCostMultiplier: number,
) {
  if (state.hp <= 0) return { hp: 0, energy: state.energy, satiety: state.satiety };

  const modifiers = calculateSurvivalModifiers(state.satiety);
  const decay = sprinting ? 0.3 : restingInSettlement ? 0.05 : 0.1;
  const energyRate = sprinting ? -12 * energyCostMultiplier : 8 * modifiers.energyRegenMultiplier;
  const starvationSeconds = Math.max(0, seconds - state.satiety / decay);
  return {
    hp: Math.max(0, state.hp - starvationSeconds * STARVATION_HP_DRAIN_PER_SEC),
    energy: clamp(state.energy + energyRate * seconds, 0, state.maxEnergy),
    satiety: Math.max(0, state.satiety - decay * seconds),
  };
}
