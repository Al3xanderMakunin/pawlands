import type { EquipmentSlotType, ItemCategory } from "@pawlands/shared";

export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  weightKg: number;
  maxStack: number;
  valueCoins: number;
  slot?: EquipmentSlotType;
  satietyRestore?: number;
  attackPower?: number;
  defense?: number;
}

export const STARTER_ITEMS: ItemDefinition[] = [
  {
    id: "dried_minnow",
    name: "Dried Minnow",
    category: "consumable",
    weightKg: 0.3,
    maxStack: 20,
    valueCoins: 8,
    satietyRestore: 25,
  },
  {
    id: "iron_claws",
    name: "Iron Claws",
    category: "weapon",
    slot: "weapon",
    weightKg: 1.5,
    maxStack: 1,
    valueCoins: 45,
    attackPower: 12,
  },
  {
    id: "leather_jerkin",
    name: "Leather Jerkin",
    category: "armor",
    slot: "body",
    weightKg: 3.2,
    maxStack: 1,
    valueCoins: 60,
    defense: 8,
  },
];
