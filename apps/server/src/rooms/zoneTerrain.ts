import { readFileSync } from "node:fs";
import { z } from "zod";
import { createPlayerCollision, type ZoneId } from "@pawlands/shared";

const tiledMapSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tilewidth: z.number().int().positive(),
  tileheight: z.number().int().positive(),
  layers: z.array(z.object({
    name: z.string(),
    data: z.array(z.number()).optional(),
    objects: z.array(z.object({ name: z.string(), x: z.number(), y: z.number() })).optional(),
  })),
});

const terrainCache = new Map<ZoneId, ReturnType<typeof loadTerrain>>();

function loadTerrain(zoneId: ZoneId) {
  const file = new URL(`../../../client/public/assets/maps/${zoneId}.tmj`, import.meta.url);
  const map = tiledMapSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  const obstacleLayer = map.layers.find((layer) => layer.name === "obstacles");
  const obstacles = obstacleLayer?.data ?? [];
  const spawn = map.layers.find((layer) => layer.name === "spawns")
    ?.objects?.find((object) => object.name === "player_spawn");
  if (obstacles.length !== map.width * map.height || !spawn) {
    throw new Error(`Invalid collision map for ${zoneId}`);
  }

  const canOccupy = createPlayerCollision({
    width: map.width,
    height: map.height,
    tileWidth: map.tilewidth,
    tileHeight: map.tileheight,
    isBlocked: (column, row) => obstacles[row * map.width + column] !== 0,
  });

  if (!canOccupy(spawn.x, spawn.y)) throw new Error(`Blocked spawn for ${zoneId}`);
  return { spawn, canOccupy };
}

export function getZoneTerrain(zoneId: ZoneId) {
  let terrain = terrainCache.get(zoneId);
  if (!terrain) {
    terrain = loadTerrain(zoneId);
    terrainCache.set(zoneId, terrain);
  }
  return terrain;
}
