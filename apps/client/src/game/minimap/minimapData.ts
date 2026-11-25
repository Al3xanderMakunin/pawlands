import type { ZoneId } from "@pawlands/shared";
import type { FacingDirection } from "../scenes/BootScene";

export type MinimapMarkerKind = "portal" | "spawn";

export interface MinimapMarker {
  id: string;
  label: string;
  kind: MinimapMarkerKind;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MinimapTerrainData {
  zoneId: ZoneId;
  tilesWidth: number;
  tilesHeight: number;
  tileWidth: number;
  tileHeight: number;
  widthInPixels: number;
  heightInPixels: number;
  colors: string[];
  markers: MinimapMarker[];
}

export interface MinimapPlayerState {
  x: number;
  y: number;
  facing: FacingDirection;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface BuildMinimapTerrainInput {
  zoneId: ZoneId;
  tilesWidth: number;
  tilesHeight: number;
  tileWidth: number;
  tileHeight: number;
  ground: number[];
  decor: number[];
  obstacles: number[];
  markers: MinimapMarker[];
}

const GROUND_TILE_COLORS: Record<number, string> = {
  1: "#3f7d44", // grass
  2: "#2f6838", // meadow / tall grass
  3: "#8d6e4e", // dirt / path
  4: "#5a6372", // stone / floor
  11: "#3b82c4", // water
};

const DECOR_TILE_COLORS: Record<number, string> = {
  12: "#f59e0b", // landmark / campfire
};

const OBSTACLE_TILE_COLORS: Record<number, string> = {
  5: "#3b4252", // wall / fence
  6: "#1e4625", // tree
  7: "#4b5563", // rock / boulder
  8: "#7f3f3f", // dark ruin / spikes
  9: "#9a5b3c", // building
  10: "#b45309", // roof / structure
};

const DEFAULT_GROUND_COLOR = "#334155";
const DEFAULT_OBSTACLE_COLOR = "#475569";

export function resolveTileColor(groundId: number, decorId: number, obstacleId: number): string {
  if (obstacleId > 0) {
    return OBSTACLE_TILE_COLORS[obstacleId] ?? DEFAULT_OBSTACLE_COLOR;
  }
  if (decorId > 0) {
    return DECOR_TILE_COLORS[decorId] ?? GROUND_TILE_COLORS[groundId] ?? DEFAULT_GROUND_COLOR;
  }
  if (groundId > 0) {
    return GROUND_TILE_COLORS[groundId] ?? DEFAULT_GROUND_COLOR;
  }
  return DEFAULT_GROUND_COLOR;
}

export function buildMinimapTerrain(input: BuildMinimapTerrainInput): MinimapTerrainData {
  const totalTiles = input.tilesWidth * input.tilesHeight;
  const colors = new Array<string>(totalTiles);

  for (let i = 0; i < totalTiles; i++) {
    const groundId = input.ground[i] ?? 0;
    const decorId = input.decor[i] ?? 0;
    const obstacleId = input.obstacles[i] ?? 0;
    colors[i] = resolveTileColor(groundId, decorId, obstacleId);
  }

  return {
    zoneId: input.zoneId,
    tilesWidth: input.tilesWidth,
    tilesHeight: input.tilesHeight,
    tileWidth: input.tileWidth,
    tileHeight: input.tileHeight,
    widthInPixels: input.tilesWidth * input.tileWidth,
    heightInPixels: input.tilesHeight * input.tileHeight,
    colors,
    markers: input.markers,
  };
}

export function worldToMinimap(
  worldX: number,
  worldY: number,
  worldWidth: number,
  worldHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  if (worldWidth <= 0 || worldHeight <= 0) {
    return { x: 0, y: 0 };
  }
  const clampedX = Math.max(0, Math.min(worldWidth, worldX));
  const clampedY = Math.max(0, Math.min(worldHeight, worldY));
  return {
    x: (clampedX / worldWidth) * canvasWidth,
    y: (clampedY / worldHeight) * canvasHeight,
  };
}
