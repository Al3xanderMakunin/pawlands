import { ClientState, CloseCode, Room, ServerError, type Client } from "@colyseus/core";
import { MapSchema, Schema, type } from "@colyseus/schema";
import {
  DEFAULT_WORLD_ZONE_ID,
  MAX_PLAYERS_PER_ZONE,
  SERVER_TICK_INTERVAL_MS,
} from "@pawlands/config";
import { ARCHETYPES, WORLD_ZONES, type WorldZoneDefinition } from "@pawlands/game-data";
import {
  ClientMessage,
  JoinZoneOptionsSchema,
  MoveInputSchema,
  type MoveInput,
} from "@pawlands/protocol";
import { movementSpeed, stepMovement } from "@pawlands/shared";
import { loadCharacter, saveCharacter, type SavedStats } from "../characters/characterRepository.js";
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
  @type("number") speedMultiplier = 1;
  @type("number") maxCarryWeightKg = 20;
  @type("number") lastMoveSeq = -1;
}

export class ZoneState extends Schema {
  @type("string") zoneId = DEFAULT_WORLD_ZONE_ID;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

type ZoneAuth = { userId: string; username: string } | { userId?: undefined };

interface CharacterSession {
  key: string;
  characterId?: string;
  strength: number;
  agility: number;
  saving?: Promise<void>;
}

const CHECKPOINT_INTERVAL_MS = 10_000;
const activeCharacters = new Set<string>();

interface PendingInput extends MoveInput {
  expiresAt: number;
}

const authRepository = new DrizzleAuthRepository();

export class ZoneRoom extends Room {
  override maxClients = MAX_PLAYERS_PER_ZONE;
  override state = new ZoneState();
  private zone!: WorldZoneDefinition;
  private characters = new Map<string, CharacterSession>();
  private terrain!: ReturnType<typeof getZoneTerrain>;
  private pendingInputs = new Map<string, PendingInput>();

  override onCreate(options: unknown): void {
    const { zoneId } = JoinZoneOptionsSchema.parse(options ?? {});
    const zone = WORLD_ZONES.find((definition) => definition.id === zoneId);
    if (!zone) throw new ServerError(400, "Unknown zone");
    this.zone = zone;
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

    this.clock.setInterval(() => {
      for (const [sessionId, character] of this.characters) {
        const player = this.state.players.get(sessionId);
        if (player && !character.saving) {
          character.saving = this.persist(character, player).finally(() => {
            character.saving = undefined;
          });
        }
      }
    }, CHECKPOINT_INTERVAL_MS);
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
    return { userId: user.id, username: user.username };
  }

  override async onJoin(client: Client, options: unknown, auth?: ZoneAuth): Promise<void> {
    const joinData = JoinZoneOptionsSchema.parse(options ?? {});
    const archetypeDef = ARCHETYPES[joinData.archetype];
    const { spawn } = this.terrain;

    const player = new PlayerState();
    player.id = client.sessionId;
    player.name = auth?.userId ? auth.username : joinData.name;
    player.archetype = archetypeDef.id;
    player.x = spawn.x;
    player.y = spawn.y;
    player.hp = archetypeDef.stats.maxHp;
    player.maxHp = archetypeDef.stats.maxHp;
    player.energy = archetypeDef.stats.maxEnergy;
    player.maxEnergy = archetypeDef.stats.maxEnergy;
    player.satiety = archetypeDef.stats.maxSatiety;
    player.speedMultiplier = archetypeDef.stats.speedMultiplier;
    player.maxCarryWeightKg = archetypeDef.stats.maxCarryWeightKg;

    if (auth?.userId) {
      const key = `${auth.userId}:${joinData.archetype}`;
      if (activeCharacters.has(key)) throw new ServerError(409, "Character is already online");
      activeCharacters.add(key);
      const character: CharacterSession = {
        key, strength: archetypeDef.stats.strength, agility: archetypeDef.stats.agility,
      };
      this.characters.set(client.sessionId, character);
      try {
        const saved = await loadCharacter(auth.userId, joinData.archetype, this.zone, spawn);
        if (client.state === ClientState.LEAVING) throw new Error("Client left while loading character");
        character.characterId = saved.id;
        character.strength = saved.stats.strength;
        character.agility = saved.stats.agility;
        const { hp, maxHp, energy, maxEnergy, satiety, speedMultiplier, maxCarryWeightKg } = saved.stats;
        Object.assign(player, { hp, maxHp, energy, maxEnergy, satiety, speedMultiplier, maxCarryWeightKg });
        if (saved.position.zoneId === this.zone.id && this.terrain.canOccupy(saved.position.x, saved.position.y)) {
          player.x = saved.position.x;
          player.y = saved.position.y;
        }
      } catch (error) {
        if (this.characters.delete(client.sessionId)) activeCharacters.delete(key);
        throw error;
      }
    }

    this.state.players.set(client.sessionId, player);
  }

  override onDrop(client: Client, code?: number): void {
    this.pendingInputs.delete(client.sessionId);
    if (code === CloseCode.SERVER_SHUTDOWN || !this.state.players.has(client.sessionId)) return;
    void this.allowReconnection(client, 15).catch(() => {});
  }

  override async onLeave(client: Client): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    const character = this.characters.get(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.pendingInputs.delete(client.sessionId);
    this.characters.delete(client.sessionId);
    if (!character) return;

    try {
      await character.saving;
      if (player) await this.persist(character, player);
    } finally {
      activeCharacters.delete(character.key);
    }
  }

  private async persist(character: CharacterSession, player: PlayerState): Promise<void> {
    if (!character.characterId) return;
    const { x, y, hp, maxHp, energy, maxEnergy, satiety, speedMultiplier, maxCarryWeightKg } = player;
    const stats: SavedStats = {
      hp, maxHp, energy, maxEnergy, satiety, speedMultiplier, maxCarryWeightKg,
      strength: character.strength, agility: character.agility,
    };
    try {
      await saveCharacter(character.characterId, this.zone.id, { x, y }, stats);
    } catch (error) {
      console.error("Failed to save character checkpoint", character.characterId, error);
    }
  }

  private handleMoveInput(sessionId: string, input: MoveInput): void {
    const player = this.state.players.get(sessionId);
    if (!player || input.seq <= (this.pendingInputs.get(sessionId)?.seq ?? player.lastMoveSeq)) return;
    this.pendingInputs.set(sessionId, { ...input, expiresAt: Date.now() + 250 });
  }

  private stepSimulation(deltaMs: number): void {
    const dt = Math.min(deltaMs, SERVER_TICK_INTERVAL_MS);
    const now = Date.now();
    this.state.players.forEach((player, sessionId) => {
      const input = this.pendingInputs.get(sessionId);
      if (!input || input.expiresAt <= now) return;

      const speed = movementSpeed(player.speedMultiplier, player.satiety, player.energy, input.sprint);
      const next = stepMovement(player, input, speed, dt, this.terrain.canOccupy);
      player.x = next.x;
      player.y = next.y;
      player.lastMoveSeq = input.seq;
    });
  }
}
