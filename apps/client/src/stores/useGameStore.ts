import { create } from "zustand";
import { ARCHETYPES } from "@pawlands/game-data";
import type { CharacterArchetype, SurvivalState, ZoneId } from "@pawlands/shared";

export type ConnectionStatus = "offline" | "connecting" | "connected";
export type TouchControlsMode = "auto" | "on" | "off";

interface GameStoreState {
  selectedArchetype: CharacterArchetype;
  hasEnteredWorld: boolean;
  isArchetypeModalOpen: boolean;
  currentZoneId: ZoneId;
  connectionStatus: ConnectionStatus;
  touchControlsMode: TouchControlsMode;
  lastActionLabel: string | null;
  survival: SurvivalState;
  setArchetype: (archetype: CharacterArchetype) => void;
  enterWorld: () => void;
  setArchetypeModalOpen: (open: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setTouchControlsMode: (mode: TouchControlsMode) => void;
  setLastActionLabel: (label: string | null) => void;
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
  hasEnteredWorld: false,
  isArchetypeModalOpen: true,
  currentZoneId: "oakpaw_village",
  connectionStatus: "offline",
  touchControlsMode: "auto",
  lastActionLabel: null,
  survival: createInitialSurvival("cat"),
  setArchetype: (archetype) =>
    set({
      selectedArchetype: archetype,
      survival: createInitialSurvival(archetype),
    }),
  enterWorld: () =>
    set({
      hasEnteredWorld: true,
      isArchetypeModalOpen: false,
    }),
  setArchetypeModalOpen: (isArchetypeModalOpen) => set({ isArchetypeModalOpen }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setTouchControlsMode: (touchControlsMode) => set({ touchControlsMode }),
  setLastActionLabel: (lastActionLabel) => set({ lastActionLabel }),
}));
