import { describe, expect, it } from "vitest";
import { buildMinimapTerrain, resolveTileColor, worldToMinimap } from "./minimapData";

describe("minimapData", () => {
  it("prioritizes obstacles over decor and ground colors", () => {
    expect(resolveTileColor(1, 0, 0)).toBe("#3f7d44");
    expect(resolveTileColor(1, 12, 0)).toBe("#f59e0b");
    expect(resolveTileColor(1, 12, 6)).toBe("#1e4625");
    expect(resolveTileColor(0, 0, 0)).toBe("#334155");
  });

  it("builds flat color grid and pixel dimensions from tile layers", () => {
    const terrain = buildMinimapTerrain({
      zoneId: "oakpaw_village",
      tilesWidth: 2,
      tilesHeight: 2,
      tileWidth: 32,
      tileHeight: 32,
      ground: [1, 3, 11, 4],
      decor: [0, 12, 0, 0],
      obstacles: [0, 0, 0, 5],
      markers: [
        {
          id: "portal-1",
          label: "whispering_woods_portal",
          kind: "portal",
          x: 48,
          y: 32,
          width: 32,
          height: 64,
        },
      ],
    });

    expect(terrain.widthInPixels).toBe(64);
    expect(terrain.heightInPixels).toBe(64);
    expect(terrain.colors).toEqual(["#3f7d44", "#f59e0b", "#3b82c4", "#3b4252"]);
    expect(terrain.markers).toHaveLength(1);
  });

  it("projects and clamps world coordinates into minimap canvas coordinates", () => {
    expect(worldToMinimap(640, 480, 1280, 960, 160, 120)).toEqual({ x: 80, y: 60 });
    expect(worldToMinimap(-50, 2000, 1280, 960, 160, 120)).toEqual({ x: 0, y: 120 });
    expect(worldToMinimap(10, 10, 0, 0, 160, 120)).toEqual({ x: 0, y: 0 });
  });
});
