import { create } from "zustand";
import { ARCHETYPES } from "@pawlands/game-data";
import type { CharacterSheet } from "@pawlands/protocol";
import type { CharacterArchetype, SurvivalState, ZoneId } from "@pawlands/shared";
import type { MinimapPlayerState, MinimapTerrainData } from "../game/minimap/minimapData";

export type ConnectionStatus = "offline" | "connecting" | "connected";
export type TouchControlsMode = "auto" | "on" | "off";

interface GameStoreState {
  online: boolean;
  worldEntry: number;
  selectedArchetype: CharacterArchetype;
  hasEnteredWorld: boolean;
  isArchetypeModalOpen: boolean;
  currentZoneId: ZoneId;
  connectionStatus: ConnectionStatus;
  touchControlsMode: TouchControlsMode;
  lastActionLabel: string | null;
  survival: SurvivalState;
  characterSheet: CharacterSheet | null;
  backpackAction: ((slot: number, equip: boolean) => void) | null;
  isMinimapOpen: boolean;
  minimapTerrain: MinimapTerrainData | null;
  minimapPlayer: MinimapPlayerState | null;
  setArchetype: (archetype: CharacterArchetype) => void;
  setZoneId: (zoneId: ZoneId) => void;
  enterWorld: (online?: boolean) => void;
  setArchetypeModalOpen: (open: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  syncSurvival: (snapshot: Pick<SurvivalState, "hp" | "maxHp" | "energy" | "maxEnergy" | "satiety" | "maxCarryWeightKg" | "currentWeightKg">) => void;
  setTouchControlsMode: (mode: TouchControlsMode) => void;
  setLastActionLabel: (label: string | null) => void;
  toggleMinimap: () => void;
  setMinimapTerrain: (terrain: MinimapTerrainData | null) => void;
  setMinimapPlayer: (player: MinimapPlayerState | null) => void;
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
  online: false,
  worldEntry: 0,
  selectedArchetype: "cat",
  hasEnteredWorld: false,
  isArchetypeModalOpen: true,
  currentZoneId: "oakpaw_village",
  connectionStatus: "offline",
  touchControlsMode: "auto",
  lastActionLabel: null,
  survival: createInitialSurvival("cat"),
  characterSheet: null,
  backpackAction: null,
  isMinimapOpen: true,
  minimapTerrain: null,
  minimapPlayer: null,
  setArchetype: (archetype) =>
    set({
      selectedArchetype: archetype,
      survival: createInitialSurvival(archetype),
    }),
  setZoneId: (currentZoneId) => set({ currentZoneId }),
  enterWorld: (online = false) =>
    set((state) => ({
      online,
      characterSheet: null,
      backpackAction: null,
      survival: createInitialSurvival(state.selectedArchetype),
      worldEntry: state.worldEntry + 1,
      hasEnteredWorld: true,
      isArchetypeModalOpen: false,
    })),
  setArchetypeModalOpen: (isArchetypeModalOpen) => set({ isArchetypeModalOpen }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  syncSurvival: ({ hp, maxHp, energy, maxEnergy, satiety, maxCarryWeightKg, currentWeightKg }) =>
    set((state) => {
      const { survival } = state;
      if (survival.hp === hp && survival.maxHp === maxHp && survival.energy === energy &&
        survival.maxEnergy === maxEnergy && survival.satiety === satiety &&
        survival.maxCarryWeightKg === maxCarryWeightKg && survival.currentWeightKg === currentWeightKg) return state;
      return { survival: { ...survival, hp, maxHp, energy, maxEnergy, satiety, maxCarryWeightKg, currentWeightKg } };
    }),
  setTouchControlsMode: (touchControlsMode) => set({ touchControlsMode }),
  setLastActionLabel: (lastActionLabel) => set({ lastActionLabel }),
  toggleMinimap: () => set((state) => ({ isMinimapOpen: !state.isMinimapOpen })),
  setMinimapTerrain: (minimapTerrain) => set({ minimapTerrain }),
  setMinimapPlayer: (minimapPlayer) => set({ minimapPlayer }),
}));
