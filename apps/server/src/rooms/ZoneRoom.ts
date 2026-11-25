import { Room, ServerError, type Client } from "@colyseus/core";
import { MapSchema, Schema, type } from "@colyseus/schema";
import {
  BASE_MOVEMENT_SPEED_PX_PER_SEC,
  DEFAULT_WORLD_ZONE_ID,
  MAX_PLAYERS_PER_ZONE,
  SERVER_TICK_INTERVAL_MS,
} from "@pawlands/config";
import { ARCHETYPES, WORLD_ZONES } from "@pawlands/game-data";
import {
  ClientMessage,
  JoinZoneOptionsSchema,
  MoveInputSchema,
  type MoveInput,
} from "@pawlands/protocol";
import { calculateSurvivalModifiers, clamp } from "@pawlands/shared";
import { resolveJwtSecret, verifyAuthToken, type AuthTokenPayload } from "../auth/jwt.js";

export class PlayerState extends Schema {
  @type("string") id = "";
  @type("string") name = "Whisker";
  @type("string") archetype = "cat";
  @type("number") x = 400;
  @type("number") y = 300;
  @type("number") hp = 100;
  @type("number") maxHp = 100;
  @type("number") energy = 120;
  @type("number") maxEnergy = 120;
  @type("number") satiety = 100;
}

export class ZoneState extends Schema {
  @type("string") zoneId = DEFAULT_WORLD_ZONE_ID;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

interface PendingInput {
  dx: number;
  dy: number;
  sprint: boolean;
}

export class ZoneRoom extends Room {
  override maxClients = MAX_PLAYERS_PER_ZONE;
  override state = new ZoneState();
  private pendingInputs = new Map<string, PendingInput>();

  override onCreate(options: unknown): void {
    const parsed = JoinZoneOptionsSchema.safeParse(options ?? {});
    const zoneId = parsed.success ? parsed.data.zoneId : DEFAULT_WORLD_ZONE_ID;
    this.state.zoneId = zoneId;

    this.onMessage(ClientMessage.MOVE, (client, payload) => {
      const result = MoveInputSchema.safeParse(payload);
      if (!result.success) return;
      this.handleMoveInput(client.sessionId, result.data);
    });

    this.setSimulationInterval((deltaMs) => {
      this.stepSimulation(deltaMs);
    }, SERVER_TICK_INTERVAL_MS);
  }

  override onAuth(_client: Client, options: unknown): AuthTokenPayload | null {
    const parsed = JoinZoneOptionsSchema.safeParse(options ?? {});
    if (!parsed.success || !parsed.data.token) {
      return null;
    }

    const payload = verifyAuthToken(parsed.data.token, resolveJwtSecret());
    if (!payload) {
      throw new ServerError(401, "Invalid or expired session token");
    }

    return payload;
  }

  override onJoin(client: Client, options: unknown, auth?: AuthTokenPayload | null): void {
    const parsed = JoinZoneOptionsSchema.safeParse(options ?? {});
    const joinData = parsed.success
      ? parsed.data
      : { zoneId: DEFAULT_WORLD_ZONE_ID, name: "Whisker", archetype: "cat" as const };

    const archetypeDef = ARCHETYPES[joinData.archetype];
    const zoneDef = WORLD_ZONES.find((zone) => zone.id === this.state.zoneId) ?? WORLD_ZONES[0];

    const player = new PlayerState();
    player.id = client.sessionId;
    player.name = auth?.username ?? joinData.name;
    player.archetype = archetypeDef.id;
    player.x = zoneDef?.spawnX ?? 400;
    player.y = zoneDef?.spawnY ?? 300;
    player.hp = archetypeDef.stats.maxHp;
    player.maxHp = archetypeDef.stats.maxHp;
    player.energy = archetypeDef.stats.maxEnergy;
    player.maxEnergy = archetypeDef.stats.maxEnergy;
    player.satiety = archetypeDef.stats.maxSatiety;

    this.state.players.set(client.sessionId, player);
    this.pendingInputs.set(client.sessionId, { dx: 0, dy: 0, sprint: false });
  }

  override onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
    this.pendingInputs.delete(client.sessionId);
  }

  private handleMoveInput(sessionId: string, input: MoveInput): void {
    const magnitude = Math.hypot(input.dx, input.dy);
    const dx = magnitude > 1 ? input.dx / magnitude : input.dx;
    const dy = magnitude > 1 ? input.dy / magnitude : input.dy;
    this.pendingInputs.set(sessionId, { dx, dy, sprint: input.sprint });
  }

  private stepSimulation(deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.state.players.forEach((player, sessionId) => {
      const input = this.pendingInputs.get(sessionId);
      if (!input) return;

      const archetypeKey =
        player.archetype === "tomcat" || player.archetype === "kitten"
          ? player.archetype
          : "cat";
      const archetypeSpeed = ARCHETYPES[archetypeKey].stats.speedMultiplier;
      const survival = calculateSurvivalModifiers(player.satiety);
      const sprintBonus = input.sprint && player.energy > 0 ? 1.25 : 1.0;

      const speed =
        BASE_MOVEMENT_SPEED_PX_PER_SEC *
        archetypeSpeed *
        survival.moveSpeedMultiplier *
        sprintBonus;

      player.x = clamp(player.x + input.dx * speed * dt, 0, 2000);
      player.y = clamp(player.y + input.dy * speed * dt, 0, 2000);
    });
  }
}
