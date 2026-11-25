import type { ZoneId, ZoneType } from "@pawlands/shared";

export interface WorldZoneDefinition {
  id: ZoneId;
  name: string;
  type: ZoneType;
  isPvpEnabled: boolean;
  spawnX: number;
  spawnY: number;
  description: string;
}

export const WORLD_ZONES: WorldZoneDefinition[] = [
  {
    id: "oakpaw_village",
    name: "Oakpaw Village",
    type: "settlement",
    isPvpEnabled: false,
    spawnX: 400,
    spawnY: 300,
    description: "Safe feline settlement with quest givers, merchants, and crafting stations.",
  },
  {
    id: "whispering_woods",
    name: "Whispering Woods",
    type: "forest",
    isPvpEnabled: false,
    spawnX: 200,
    spawnY: 300,
    description: "Sunlit forest rich with herbs, small prey, and introductory hunting quests.",
  },
  {
    id: "clawpeak_ridge",
    name: "Clawpeak Ridge",
    type: "mountains",
    isPvpEnabled: true,
    spawnX: 300,
    spawnY: 200,
    description: "Rocky highland trails with ore veins, mountain predators, and skirmishes.",
  },
  {
    id: "sunken_crypt",
    name: "Sunken Crypt",
    type: "dungeon",
    isPvpEnabled: true,
    spawnX: 160,
    spawnY: 160,
    description: "Ancient underground ruin housing elite enemies and rare gear.",
  },
  {
    id: "bloodclaw_wilds",
    name: "Bloodclaw Wilds",
    type: "pvp_wilds",
    isPvpEnabled: true,
    spawnX: 500,
    spawnY: 500,
    description: "Contested open PvP frontier with high-tier loot and clan territory.",
  },
];
