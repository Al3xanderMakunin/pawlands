import { Client } from "@colyseus/sdk";
import { ZONE_ROOM_NAME } from "@pawlands/config";
import type { JoinZoneOptions } from "@pawlands/protocol";

const wsUrl = import.meta.env.VITE_WS_URL ?? "ws://localhost:2567";

export const colyseusClient = new Client(wsUrl);

export async function joinWorldZone(options: JoinZoneOptions) {
  return colyseusClient.joinOrCreate(ZONE_ROOM_NAME, options);
}
