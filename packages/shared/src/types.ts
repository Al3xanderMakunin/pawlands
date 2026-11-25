export type CharacterArchetype = "tomcat" | "cat" | "kitten";

export type ZoneType = "settlement" | "forest" | "mountains" | "dungeon" | "pvp_wilds";

export type ZoneId =
  | "oakpaw_village"
  | "whispering_woods"
  | "clawpeak_ridge"
  | "sunken_crypt"
  | "bloodclaw_wilds";

export interface CharacterStats {
  maxHp: number;
  maxEnergy: number;
  maxSatiety: number;
  strength: number;
  agility: number;
  speedMultiplier: number;
  maxCarryWeightKg: number;
}

export interface SurvivalState {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  satiety: number;
  maxSatiety: number;
  currentWeightKg: number;
  maxCarryWeightKg: number;
}

export type SurvivalStatus = "well_fed" | "hungry" | "famished" | "starving";

export interface SurvivalModifiers {
  status: SurvivalStatus;
  energyRegenMultiplier: number;
  moveSpeedMultiplier: number;
  healthDrainPerSecond: number;
}

export type EncumbranceTier = "light" | "heavy" | "overloaded";

export interface EncumbranceState {
  tier: EncumbranceTier;
  loadRatio: number;
  moveSpeedMultiplier: number;
  energyCostMultiplier: number;
  canSprint: boolean;
}

export type ItemCategory = "weapon" | "armor" | "accessory" | "consumable" | "material" | "quest";

export type EquipmentSlotType = "weapon" | "head" | "body" | "paws" | "accessory";

export const BACKPACK_SLOTS = 12;
