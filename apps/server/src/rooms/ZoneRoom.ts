import { Room, ServerError, type Client } from "@colyseus/core";
import { MapSchema, Schema, type } from "@colyseus/schema";
import {
  BASE_MOVEMENT_SPEED_PX_PER_SEC,
  DEFAULT_WORLD_ZONE_ID,
  MAX_PLAYERS_PER_ZONE,
  SERVER_TICK_INTERVAL_MS,
} from "@pawlands/config";
import { ARCHETYPES } from "@pawlands/game-data";
import {
  ClientMessage,
  JoinZoneOptionsSchema,
  MoveInputSchema,
  type MoveInput,
} from "@pawlands/protocol";
import { calculateSurvivalModifiers } from "@pawlands/shared";
import { DrizzleAuthRepository } from "../auth/authRepository.js";
import { getZoneTerrain } from "./zoneTerrain.js";
import { resolveJwtSecret, verifyAuthToken } from "../auth/jwt.js";

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

interface ZoneAuth {
  username?: string;
}

interface PendingInput {
  dx: number;
  dy: number;
  sprint: boolean;
  seq: number;
  expiresAt: number;
}

const authRepository = new DrizzleAuthRepository();

export class ZoneRoom extends Room {
  override maxClients = MAX_PLAYERS_PER_ZONE;
  override state = new ZoneState();
  private terrain!: ReturnType<typeof getZoneTerrain>;
  private pendingInputs = new Map<string, PendingInput>();

  override onCreate(options: unknown): void {
    const { zoneId } = JoinZoneOptionsSchema.parse(options ?? {});
    this.terrain = getZoneTerrain(zoneId);
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

  override async onAuth(_client: Client, options: unknown): Promise<ZoneAuth> {
    const parsed = JoinZoneOptionsSchema.safeParse(options ?? {});
    if (!parsed.success || parsed.data.zoneId !== this.state.zoneId) {
      throw new ServerError(400, "Invalid zone options");
    }
    if (!parsed.data.token) {
      return {};
    }

    const payload = verifyAuthToken(parsed.data.token, resolveJwtSecret());
    if (!payload) {
      throw new ServerError(401, "Invalid or expired session token");
    }

    const user = await authRepository.findById(payload.sub);
    if (!user || user.isBanned) throw new ServerError(403, "Account cannot join the zone");
    return { username: user.username };
  }

  override onJoin(client: Client, options: unknown, auth?: ZoneAuth): void {
    const joinData = JoinZoneOptionsSchema.parse(options ?? {});
    const archetypeDef = ARCHETYPES[joinData.archetype];
    const { spawn } = this.terrain;

    const player = new PlayerState();
    player.id = client.sessionId;
    player.name = auth?.username ?? joinData.name;
    player.archetype = archetypeDef.id;
    player.x = spawn.x;
    player.y = spawn.y;
    player.hp = archetypeDef.stats.maxHp;
    player.maxHp = archetypeDef.stats.maxHp;
    player.energy = archetypeDef.stats.maxEnergy;
    player.maxEnergy = archetypeDef.stats.maxEnergy;
    player.satiety = archetypeDef.stats.maxSatiety;

    this.state.players.set(client.sessionId, player);
  }

  override onDrop(client: Client): void {
    this.pendingInputs.delete(client.sessionId);
    this.allowReconnection(client, 15);
  }

  override onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
    this.pendingInputs.delete(client.sessionId);
  }

  private handleMoveInput(sessionId: string, input: MoveInput): void {
    const previous = this.pendingInputs.get(sessionId);
    if (previous && input.seq <= previous.seq) return;
    const magnitude = Math.hypot(input.dx, input.dy);
    const dx = magnitude > 1 ? input.dx / magnitude : input.dx;
    const dy = magnitude > 1 ? input.dy / magnitude : input.dy;
    this.pendingInputs.set(sessionId, { dx, dy, sprint: input.sprint, seq: input.seq, expiresAt: Date.now() + 250 });
  }

  private stepSimulation(deltaMs: number): void {
    const dt = Math.min(deltaMs, SERVER_TICK_INTERVAL_MS) / 1000;
    const now = Date.now();
    this.state.players.forEach((player, sessionId) => {
      const input = this.pendingInputs.get(sessionId);
      if (!input || input.expiresAt <= now) return;

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

      const x = player.x + input.dx * speed * dt;
      const y = player.y + input.dy * speed * dt;
      if (this.terrain.canOccupy(x, player.y)) player.x = x;
      if (this.terrain.canOccupy(player.x, y)) player.y = y;
    });
  }
}
