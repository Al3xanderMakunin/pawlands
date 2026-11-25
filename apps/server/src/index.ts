import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import {
  DEFAULT_SERVER_HOST,
  DEFAULT_SERVER_PORT,
  ZONE_ROOM_NAME,
} from "@pawlands/config";
import { createApp } from "./app.js";
import { ZoneRoom } from "./rooms/ZoneRoom.js";

const port = Number(process.env.PORT ?? DEFAULT_SERVER_PORT);
const host = process.env.HOST ?? DEFAULT_SERVER_HOST;

async function bootstrap(): Promise<void> {
  const fastify = await createApp();

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
