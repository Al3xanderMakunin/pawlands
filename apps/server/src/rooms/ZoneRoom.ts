import { ClientState, CloseCode, Room, ServerError, type Client } from "@colyseus/core";
import { MapSchema, Schema, type } from "@colyseus/schema";
import {
  DEFAULT_WORLD_ZONE_ID,
  MAX_PLAYERS_PER_ZONE,
  SERVER_TICK_INTERVAL_MS,
} from "@pawlands/config";
import { ARCHETYPES, ITEMS_BY_ID, WORLD_ZONES, backpackStats, createStarterBackpack, type WorldZoneDefinition } from "@pawlands/game-data";
import {
  BackpackActionSchema,
  CharacterSheetRequestSchema,
  ClientMessage,
  ServerMessage,
  type CharacterSheet,
  type JoinZoneOptions,
  JoinZoneOptionsSchema,
  MoveInputSchema,
  type MoveInput,
} from "@pawlands/protocol";
import {
  COINS_PER_LEVEL, PIXELS_PER_XP, advanceProgression, calculateEncumbrance,
  canSprint, movementSpeed, stepMovement, stepSurvival,
} from "@pawlands/shared";
import { loadCharacter, saveCharacter, type SavedStats } from "../characters/characterRepository.js";
import { DrizzleAuthRepository } from "../auth/authRepository.js";
import { getZoneTerrain } from "./zoneTerrain.js";
import { resolveJwtSecret, verifyAuthToken } from "../auth/jwt.js";

export class PlayerState extends Schema {
  @type("string") id = "";
  @type("string") name = "Whisker";
  @type("string") archetype: JoinZoneOptions["archetype"] = "cat";
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
  @type("number") currentWeightKg = 0;

  sheet: CharacterSheet = {
    backpack: createStarterBackpack(),
    level: 1, xp: 0, coins: 0, strength: 0, agility: 0, attackPower: 0, defense: 0,
  };
  baseCarryWeightKg = 20;
  respawnAt = 0;
}

export class ZoneState extends Schema {
  @type("string") zoneId = DEFAULT_WORLD_ZONE_ID;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

type ZoneAuth = { userId: string; username: string } | { userId?: undefined };

interface CharacterSession {
  key: string;
  characterId?: string;
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

    this.onMessage(ClientMessage.CHARACTER_SHEET, (client, payload) => {
      if (!CharacterSheetRequestSchema.safeParse(payload).success) return;
      const player = this.state.players.get(client.sessionId);
      if (player) client.send(ServerMessage.CHARACTER_SHEET, player.sheet);
    });

    this.onMessage(ClientMessage.USE_ITEM, (client, payload) => this.handleBackpackAction(client, payload, false));
    this.onMessage(ClientMessage.EQUIP_ITEM, (client, payload) => this.handleBackpackAction(client, payload, true));

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
    player.baseCarryWeightKg = archetypeDef.stats.maxCarryWeightKg;

    player.sheet.strength = archetypeDef.stats.strength;
    player.sheet.agility = archetypeDef.stats.agility;

    if (auth?.userId) {
      const key = `${auth.userId}:${joinData.archetype}`;
      if (activeCharacters.has(key)) throw new ServerError(409, "Character is already online");
      activeCharacters.add(key);
      const character: CharacterSession = { key };
      this.characters.set(client.sessionId, character);
      try {
        const saved = await loadCharacter(auth.userId, joinData.archetype, this.zone, spawn);
        if (client.state === ClientState.LEAVING) throw new Error("Client left while loading character");
        character.characterId = saved.id;
        Object.assign(player.sheet, {
          level: saved.level, xp: saved.xp, coins: saved.coins, backpack: saved.backpack,
          strength: saved.stats.strength, agility: saved.stats.agility,
        });
        const { hp, maxHp, energy, maxEnergy, satiety, speedMultiplier, maxCarryWeightKg } = saved.stats;
        Object.assign(player, {
          hp, maxHp, energy, maxEnergy, satiety, speedMultiplier, baseCarryWeightKg: maxCarryWeightKg,
        });
        if (saved.position.zoneId === this.zone.id && this.terrain.canOccupy(saved.position.x, saved.position.y)) {
          player.x = saved.position.x;
          player.y = saved.position.y;
        }
      } catch (error) {
        if (this.characters.delete(client.sessionId)) activeCharacters.delete(key);
        throw error;
      }
    }

    this.refreshBackpackStats(player);
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
    const { x, y, hp, maxHp, energy, maxEnergy, satiety, speedMultiplier, baseCarryWeightKg } = player;
    const stats: SavedStats = {
      hp, maxHp, energy, maxEnergy, satiety, speedMultiplier, maxCarryWeightKg: baseCarryWeightKg,
      strength: player.sheet.strength, agility: player.sheet.agility,
    };
    try {
      const { level, xp, backpack } = player.sheet;
      const coins = await saveCharacter(character.characterId, this.zone.id, { x, y }, stats, { level, xp, backpack });
      if (coins !== undefined && coins !== player.sheet.coins) {
        player.sheet.coins = coins;
        this.sendSheet(player);
      }
    } catch (error) {
      console.error("Failed to save character checkpoint", character.characterId, error);
    }
  }

  private handleMoveInput(sessionId: string, input: MoveInput): void {
    const player = this.state.players.get(sessionId);
    if (!player || input.seq <= (this.pendingInputs.get(sessionId)?.seq ?? player.lastMoveSeq)) return;
    this.pendingInputs.set(sessionId, { ...input, expiresAt: Date.now() + 250 });
  }

  private refreshBackpackStats(player: PlayerState): void {
    const { currentWeightKg, attackPower, defense, carryBonusKg } = backpackStats(player.sheet.backpack);
    player.currentWeightKg = currentWeightKg;
    player.maxCarryWeightKg = player.baseCarryWeightKg + carryBonusKg;
    Object.assign(player.sheet, { attackPower, defense });
  }

  private handleBackpackAction(client: Client, payload: unknown, equip: boolean): void {
    const result = BackpackActionSchema.safeParse(payload);
    const player = this.state.players.get(client.sessionId);
    if (!result.success || !player || player.hp <= 0) return;

    const { slot } = result.data;
    const backpack = player.sheet.backpack;
    const stack = backpack[slot];
    const item = stack && ITEMS_BY_ID.get(stack.itemId);
    if (!stack || !item) return;

    if (equip) {
      if (!item.slot) return;
      const equipped = !stack.equipped;
      player.sheet.backpack = backpack.map((entry, index) => {
        if (index === slot) return { ...stack, equipped };
        if (equipped && entry?.equipped && ITEMS_BY_ID.get(entry.itemId)?.slot === item.slot) {
          return { ...entry, equipped: false };
        }
        return entry;
      });
    } else {
      const maxSatiety = ARCHETYPES[player.archetype].stats.maxSatiety;
      if (!item.satietyRestore || player.satiety >= maxSatiety) return;
      player.satiety = Math.min(maxSatiety, player.satiety + item.satietyRestore);
      const remaining = stack.quantity > 1 ? { ...stack, quantity: stack.quantity - 1 } : null;
      player.sheet.backpack = backpack.map((entry, index) => index === slot ? remaining : entry);
    }

    this.refreshBackpackStats(player);
    client.send(ServerMessage.CHARACTER_SHEET, player.sheet);
  }

  private sendSheet(player: PlayerState): void {
    this.clients.getById(player.id)?.send(ServerMessage.CHARACTER_SHEET, player.sheet);
  }

  private awardMovementXp(player: PlayerState, distance: number): void {
    const sheet = player.sheet;
    const next = advanceProgression(sheet.level, sheet.xp, distance / PIXELS_PER_XP);
    const levelsGained = next.level - sheet.level;
    const xpChanged = Math.floor(sheet.xp) !== Math.floor(next.xp);
    Object.assign(sheet, next);
    if (levelsGained > 0) {
      sheet.strength += levelsGained;
      sheet.agility += levelsGained;
      player.maxHp += 5 * levelsGained;
      player.hp += 5 * levelsGained;
      player.maxEnergy += 3 * levelsGained;
      player.energy += 3 * levelsGained;
      if (!this.characters.has(player.id)) sheet.coins += levelsGained * COINS_PER_LEVEL;
    }
    if (xpChanged || levelsGained) this.sendSheet(player);
  }

  private stepSimulation(deltaMs: number): void {
    const dt = Math.min(deltaMs, SERVER_TICK_INTERVAL_MS);
    const now = Date.now();
    this.state.players.forEach((player, sessionId) => {
      const input = this.pendingInputs.get(sessionId);
      if (player.hp <= 0) {
        player.respawnAt ||= now + 5_000;
        if (now >= player.respawnAt) {
          Object.assign(player, this.terrain.spawn, {
            hp: player.maxHp / 2, energy: player.maxEnergy / 2, satiety: 50, respawnAt: 0,
          });
          this.pendingInputs.delete(sessionId);
        }
        return;
      }

      const { currentWeightKg, maxCarryWeightKg } = player;
      let distance = 0;
      let sprinting = false;
      if (input && input.expiresAt > now) {
        sprinting = input.sprint && canSprint(player.energy, currentWeightKg, maxCarryWeightKg);
        const speed = movementSpeed(
          player.speedMultiplier, player.satiety, player.energy, sprinting, currentWeightKg, maxCarryWeightKg,
        );
        const next = stepMovement(player, input, speed, dt, this.terrain.canOccupy);
        distance = Math.hypot(next.x - player.x, next.y - player.y);
        Object.assign(player, next, { lastMoveSeq: input.seq });
      }
      const encumbrance = calculateEncumbrance(currentWeightKg, maxCarryWeightKg);
      Object.assign(player, stepSurvival(
        player, dt / 1000, sprinting && distance > 0,
        distance === 0 && this.zone.type === "settlement", encumbrance.energyCostMultiplier,
      ));
      if (player.hp > 0 && distance > 0) this.awardMovementXp(player, distance);
    });
  }
}
