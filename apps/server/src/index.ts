import cors from "@fastify/cors";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import Fastify from "fastify";
import {
  DEFAULT_SERVER_HOST,
  DEFAULT_SERVER_PORT,
  ZONE_ROOM_NAME,
} from "@pawlands/config";
import { WORLD_ZONES } from "@pawlands/game-data";
import { ZoneRoom } from "./rooms/ZoneRoom.js";

const port = Number(process.env.PORT ?? DEFAULT_SERVER_PORT);
const host = process.env.HOST ?? DEFAULT_SERVER_HOST;
const corsOrigin = process.env.CORS_ORIGIN ?? true;

async function bootstrap(): Promise<void> {
  const fastify = Fastify({ logger: true });

  await fastify.register(cors, {
    origin: corsOrigin,
  });

  fastify.get("/health", async () => ({
    status: "ok",
    service: "pawlands-server",
    timestamp: new Date().toISOString(),
  }));

  fastify.get("/api/v1/zones", async () => ({
    zones: WORLD_ZONES,
  }));

  const gameServer = new Server({
    transport: new WebSocketTransport({
      server: fastify.server,
    }),
  });

  gameServer.define(ZONE_ROOM_NAME, ZoneRoom);

  await fastify.listen({ port, host });
  fastify.log.info(`Pawlands server listening on http://${host}:${port}`);
}

bootstrap().catch((err) => {
  console.error("Failed to start Pawlands server:", err);
  process.exit(1);
});
