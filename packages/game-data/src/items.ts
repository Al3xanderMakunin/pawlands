import { BACKPACK_SLOTS, type EquipmentSlotType, type ItemCategory } from "@pawlands/shared";

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
  carryBonusKg?: number;
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
  {
    id: "travel_pouch",
    name: "Travel Pouch",
    category: "accessory",
    slot: "accessory",
    weightKg: 0.5,
    maxStack: 1,
    valueCoins: 25,
    carryBonusKg: 3,
  },
];

export const ITEMS_BY_ID = new Map(STARTER_ITEMS.map((item) => [item.id, item]));

export interface BackpackStack {
  itemId: string;
  quantity: number;
  equipped: boolean;
}

export type Backpack = (BackpackStack | null)[];

export function createStarterBackpack(): Backpack {
  return Array.from({ length: BACKPACK_SLOTS }, (_, index) => {
    const item = STARTER_ITEMS[index];
    return item ? { itemId: item.id, quantity: item.category === "consumable" ? 4 : 1, equipped: false } : null;
  });
}

export function backpackStats(backpack: Backpack) {
  let currentWeightKg = 0;
  let attackPower = 0;
  let defense = 0;
  let carryBonusKg = 0;
  for (const stack of backpack) {
    if (!stack) continue;
    const item = ITEMS_BY_ID.get(stack.itemId);
    if (!item) continue;
    currentWeightKg += item.weightKg * stack.quantity;
    if (!stack.equipped) continue;
    attackPower += item.attackPower ?? 0;
    defense += item.defense ?? 0;
    carryBonusKg += item.carryBonusKg ?? 0;
  }
  return { currentWeightKg, attackPower, defense, carryBonusKg };
}
