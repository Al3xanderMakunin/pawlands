import type { CharacterArchetype, CharacterStats } from "@pawlands/shared";

export interface ArchetypeDefinition {
  id: CharacterArchetype;
  label: string;
  tagline: string;
  stats: CharacterStats;
}

export const ARCHETYPES: Record<CharacterArchetype, ArchetypeDefinition> = {
  tomcat: {
    id: "tomcat",
    label: "Tomcat",
    tagline: "Strength, endurance, and heavy carry capacity",
    stats: {
      maxHp: 120,
      maxEnergy: 100,
      maxSatiety: 100,
      strength: 12,
      agility: 8,
      speedMultiplier: 1.0,
      maxCarryWeightKg: 25,
    },
  },
  cat: {
    id: "cat",
    label: "Cat",
    tagline: "Agility, balanced speed, and sharp evasion",
    stats: {
      maxHp: 100,
      maxEnergy: 120,
      maxSatiety: 100,
      strength: 10,
      agility: 12,
      speedMultiplier: 1.1,
      maxCarryWeightKg: 20,
    },
  },
  kitten: {
    id: "kitten",
    label: "Kitten",
    tagline: "High mobility, stealth, and deep stamina reserves",
    stats: {
      maxHp: 80,
      maxEnergy: 140,
      maxSatiety: 100,
      strength: 7,
      agility: 15,
      speedMultiplier: 1.2,
      maxCarryWeightKg: 12,
    },
  },
};

export const ARCHETYPE_LIST: ArchetypeDefinition[] = [
  ARCHETYPES.tomcat,
  ARCHETYPES.cat,
  ARCHETYPES.kitten,
];
