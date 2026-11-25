import { Client } from "@colyseus/sdk";
import { ZONE_ROOM_NAME } from "@pawlands/config";
import type { JoinZoneOptions } from "@pawlands/protocol";
import type { CharacterArchetype } from "@pawlands/shared";
import { getEnv } from "../config/env";

const wsUrl = getEnv("VITE_WS_URL") ?? "ws://localhost:2567";

export const colyseusClient = new Client(wsUrl);

export interface WorldPlayer {
  archetype: CharacterArchetype;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  maxCarryWeightKg: number;
  speedMultiplier: number;
  satiety: number;
  lastMoveSeq: number;
}

interface WorldState {
  players: Map<string, WorldPlayer>;
}

export async function joinWorldZone(options: JoinZoneOptions) {
  return colyseusClient.joinOrCreate<WorldState>(ZONE_ROOM_NAME, options);
}
