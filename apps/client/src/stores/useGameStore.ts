import { create } from "zustand";
import { ARCHETYPES } from "@pawlands/game-data";
import type { CharacterArchetype, SurvivalState, ZoneId } from "@pawlands/shared";

export type ConnectionStatus = "offline" | "connecting" | "connected";

interface GameStoreState {
  selectedArchetype: CharacterArchetype;
  currentZoneId: ZoneId;
  connectionStatus: ConnectionStatus;
  survival: SurvivalState;
  setArchetype: (archetype: CharacterArchetype) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

function createInitialSurvival(archetype: CharacterArchetype): SurvivalState {
  const stats = ARCHETYPES[archetype].stats;
  return {
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    energy: stats.maxEnergy,
    maxEnergy: stats.maxEnergy,
    satiety: stats.maxSatiety,
    maxSatiety: stats.maxSatiety,
    currentWeightKg: 2.5,
    maxCarryWeightKg: stats.maxCarryWeightKg,
  };
}

export const useGameStore = create<GameStoreState>((set) => ({
  selectedArchetype: "cat",
  currentZoneId: "oakpaw_village",
  connectionStatus: "offline",
  survival: createInitialSurvival("cat"),
  setArchetype: (archetype) =>
    set({
      selectedArchetype: archetype,
      survival: createInitialSurvival(archetype),
    }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
}));
