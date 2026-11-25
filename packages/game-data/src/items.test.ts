import { describe, expect, it } from "vitest";
import { BACKPACK_SLOTS } from "@pawlands/shared";
import { backpackStats, createStarterBackpack } from "./items.js";

describe("starter backpack", () => {
  it("includes carried gear weight and applies bonuses only when equipped", () => {
    const backpack = createStarterBackpack();
    expect(backpack).toHaveLength(BACKPACK_SLOTS);
    expect(backpackStats(backpack)).toEqual({
      currentWeightKg: 6.4, attackPower: 0, defense: 0, carryBonusKg: 0,
    });

    for (const stack of backpack) {
      if (stack && stack.itemId !== "dried_minnow") stack.equipped = true;
    }
    expect(backpackStats(backpack)).toEqual({
      currentWeightKg: 6.4, attackPower: 12, defense: 8, carryBonusKg: 3,
    });
    expect(createStarterBackpack().every((stack) => !stack?.equipped)).toBe(true);
  });
});
