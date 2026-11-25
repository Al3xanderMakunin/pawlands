import type { IncomingMessage, ServerResponse } from "node:http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import {
  DEFAULT_SERVER_HOST,
  DEFAULT_SERVER_PORT,
  ZONE_ROOM_NAME,
} from "@pawlands/config";
import { createApp } from "./app.js";
import { runMigrations } from "./database/migrate.js";
import { ZoneRoom } from "./rooms/ZoneRoom.js";

const port = Number(process.env.PORT ?? DEFAULT_SERVER_PORT);
const host = process.env.HOST ?? DEFAULT_SERVER_HOST;

async function bootstrap(): Promise<void> {
  if (process.env.AUTO_MIGRATE !== "false") {
    await runMigrations();
  }

  const fastify = await createApp();

  await fastify.ready();
  // Install the Colyseus router without a competing Fastify request listener.
  fastify.server.removeAllListeners("request");
  const gameServer = new Server({
    greet: false,
    transport: new WebSocketTransport({
      server: fastify.server,
    }),
  });

  gameServer.define(ZONE_ROOM_NAME, ZoneRoom).filterBy(["zoneId"]);

  await gameServer.listen(port, host);
  const [matchmaking] = fastify.server.listeners("request") as Array<
    (req: IncomingMessage, res: ServerResponse) => void
  >;
  if (!matchmaking) throw new Error("Missing Colyseus matchmaking handler");

  fastify.server.removeListener("request", matchmaking);
  fastify.server.on("request", (req, res) => {
    if (req.url?.startsWith("/matchmake/")) {
      matchmaking(req, res);
    } else {
      fastify.routing(req, res);
    }
  });
  fastify.log.info(`Pawlands server listening on http://${host}:${port}`);
}

bootstrap().catch((err) => {
  console.error("Failed to start Pawlands server:", err);
  process.exit(1);
});
