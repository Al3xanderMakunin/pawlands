import Phaser from "phaser";
import { BASE_MOVEMENT_SPEED_PX_PER_SEC } from "@pawlands/config";
import { ARCHETYPES } from "@pawlands/game-data";
import { calculateEncumbrance, calculateSurvivalModifiers, createPlayerCollision, movementSpeed } from "@pawlands/shared";
import { useGameStore } from "../../stores/useGameStore";
import { ClientMessage } from "@pawlands/protocol";
import { joinWorldZone, type WorldPlayer } from "../../network/colyseusClient";
import { useAuthStore } from "../../stores/useAuthStore";
import i18n from "../../i18n";
import { PlayerEntity } from "../entities/PlayerEntity";
import { KeyboardInput } from "../input/KeyboardInput";
import { MovementPrediction } from "../input/MovementPrediction";
import { MouseInput } from "../input/MouseInput";
import { buildMinimapTerrain, type MinimapMarker } from "../minimap/minimapData";
import type { TouchControlsScene } from "./TouchControlsScene";

export class WorldScene extends Phaser.Scene {
  private room: Awaited<ReturnType<typeof joinWorldZone>> | null = null;
  private remotePlayers = new Map<string, PlayerEntity>();
  private prediction!: MovementPrediction;
  private player!: PlayerEntity;
  private keyboardInput!: KeyboardInput;
  private mouseInput!: MouseInput;
  private unsubscribeStore: (() => void) | null = null;
  private actionClearTimer: Phaser.Time.TimerEvent | null = null;
  private lastMinimapSyncAt = 0;
  private lastMinimapX = Number.NaN;
  private lastMinimapY = Number.NaN;
  private lastMinimapFacing = "";

  constructor() {
    super({ key: "WorldScene" });
  }

  create(): void {
    const store = useGameStore.getState();
    const map = this.make.tilemap({ key: store.currentZoneId });
    const tileset = map.addTilesetImage("pawlands_tileset", "pawlands_tileset");

    if (!tileset) {
      throw new Error("Failed to load tileset 'pawlands_tileset'");
    }

    map.createLayer("ground", tileset, 0, 0);
    map.createLayer("decor", tileset, 0, 0);
    const obstaclesLayer = map.createLayer("obstacles", tileset, 0, 0);

    const obstacleData = map.getLayer("obstacles")?.data;
    this.prediction = new MovementPrediction(createPlayerCollision({
      width: map.width,
      height: map.height,
      tileWidth: map.tileWidth,
      tileHeight: map.tileHeight,
      isBlocked: (column, row) => (obstacleData?.[row]?.[column]?.index ?? 0) > 0,
    }));

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const spawnPoint = this.resolveSpawnPoint(map);

    this.player = new PlayerEntity(this, spawnPoint.x, spawnPoint.y, store.selectedArchetype);

    if (obstaclesLayer && !store.online) {
      obstaclesLayer.setCollisionByExclusion([-1, 0]);
      this.physics.add.collider(this.player.sprite, obstaclesLayer);
    }

    // Pixel-art camera setup
    const camera = this.cameras.main;
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.startFollow(this.player.sprite, true, 0.14, 0.14);
    camera.setRoundPixels(true);
    this.updateCameraZoom(this.scale.width);

    this.publishMinimapTerrain(map, store.currentZoneId);
    this.syncMinimapPlayer(0, true);

    // Input controllers
    this.keyboardInput = new KeyboardInput(this);
    this.mouseInput = new MouseInput(this, {
      bounds: { width: map.widthInPixels, height: map.heightInPixels },
      canAcceptClick: () => !useGameStore.getState().isArchetypeModalOpen,
      canAcceptTap: (x, y) => !this.getTouchScene()?.blocksTerrainTap(x, y),
    });

    if (!this.scene.isActive("TouchControlsScene")) {
      this.scene.launch("TouchControlsScene");
    }
    this.scene.bringToTop("TouchControlsScene");

    this.scale.on("resize", this.handleResize, this);

    this.unsubscribeStore = useGameStore.subscribe((state, prevState) => {
      if (
        state.currentZoneId !== prevState.currentZoneId ||
        (state.worldEntry !== prevState.worldEntry && (state.online || prevState.online))
      ) {
        this.scene.restart();
        return;
      }
      if (!state.online && state.selectedArchetype !== prevState.selectedArchetype) {
        this.player.setArchetype(state.selectedArchetype);
      }
      if (state.isArchetypeModalOpen && !prevState.isArchetypeModalOpen) {
        this.mouseInput.clear();
      }
    });

    let active = true;
    if (store.online && !store.isArchetypeModalOpen) {
      store.setConnectionStatus("connecting");
      const onDisconnected = () => {
        if (!active) return;
        this.room = null;
        this.clearRemotePlayers();
        useGameStore.setState({ connectionStatus: "offline", isArchetypeModalOpen: true });
      };

      const token = useAuthStore.getState().token;
      const unsubscribeAuth = useAuthStore.subscribe((state, previous) => {
        if (state.token !== previous.token) this.scene.restart();
      });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribeAuth);
      void joinWorldZone({
        zoneId: store.currentZoneId,
        archetype: store.selectedArchetype,
        name: "Whisker",
        token: token ?? undefined,
      }).then((room) => {
        if (!active) {
          void room.leave().catch(() => {});
          return;
        }
        this.room = room;
        room.onDrop(() => {
          if (!active) return;
          this.prediction.reset();
          store.setConnectionStatus("connecting");
        });
        room.onReconnect(() => {
          if (active) store.setConnectionStatus("connected");
        });
        room.onLeave(onDisconnected);
        store.setConnectionStatus("connected");
      }).catch(onDisconnected);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      active = false;
      this.scale.off("resize", this.handleResize, this);
      this.unsubscribeStore?.();
      this.unsubscribeStore = null;
      const room = this.room;
      this.room = null;
      if (room) void room.leave().catch(() => {});
      this.clearRemotePlayers();
      useGameStore.getState().setConnectionStatus("offline");
      this.actionClearTimer?.remove(false);
      this.actionClearTimer = null;
      this.keyboardInput.destroy();
      this.mouseInput.destroy();
    });
  }

  update(_time: number, delta: number): void {
    if (!this.player) return;

    const store = useGameStore.getState();
    if (store.online && (!this.room || store.isArchetypeModalOpen)) {
      this.mouseInput.clear();
      this.updateOnlineWorld(_time, delta, 0, 0, false);
      return;
    }

    if (store.isArchetypeModalOpen && !store.hasEnteredWorld) {
      this.mouseInput.clear();
      this.player.updateMovement(0, 0, 0, false);
      return;
    }

    const kb = this.keyboardInput.sample();
    const touch = this.getTouchScene()?.sample() ?? {
      moveX: 0,
      moveY: 0,
      sprint: false,
      attackJustPressed: false,
      interactJustPressed: false,
    };

    const hasTouchMove = Math.abs(touch.moveX) > 0.05 || Math.abs(touch.moveY) > 0.05;
    const hasKeyboardMove = kb.moveX !== 0 || kb.moveY !== 0;

    if (hasTouchMove || hasKeyboardMove) {
      this.mouseInput.clear();
    }

    const mouse =
      hasTouchMove || hasKeyboardMove
        ? { moveX: 0, moveY: 0, arrived: false, blocked: false }
        : this.mouseInput.sample(this.player.sprite.x, this.player.sprite.y, delta);

    const moveX = hasTouchMove ? touch.moveX : hasKeyboardMove ? kb.moveX : mouse.moveX;
    const moveY = hasTouchMove ? touch.moveY : hasKeyboardMove ? kb.moveY : mouse.moveY;

    if (store.online) {
      this.updateOnlineWorld(_time, delta, moveX, moveY, kb.sprint || touch.sprint);
      return;
    }

    const archetypeStats = ARCHETYPES[this.player.getArchetype()].stats;
    const survivalMods = calculateSurvivalModifiers(store.survival.satiety);
    const encumbrance = calculateEncumbrance(
      store.survival.currentWeightKg,
      store.survival.maxCarryWeightKg
    );

    const wantsSprint = kb.sprint || touch.sprint;
    const isSprinting = wantsSprint && encumbrance.canSprint && (moveX !== 0 || moveY !== 0);
    const sprintMultiplier = isSprinting ? 1.35 : 1.0;

    const effectiveSpeed =
      BASE_MOVEMENT_SPEED_PX_PER_SEC *
      archetypeStats.speedMultiplier *
      survivalMods.moveSpeedMultiplier *
      encumbrance.moveSpeedMultiplier *
      sprintMultiplier;

    this.player.updateMovement(moveX, moveY, effectiveSpeed, isSprinting);
    this.syncMinimapPlayer(_time, false);

    if (kb.attackJustPressed || touch.attackJustPressed) {
      this.player.playActionPulse("attack");
      this.flashActionLabel(i18n.t("actions.attack"));
    } else if (kb.interactJustPressed || touch.interactJustPressed) {
      this.player.playActionPulse("interact");
      this.flashActionLabel(i18n.t("actions.interact"));
    }
  }

  private updateOnlineWorld(
    time: number, delta: number, dx: number, dy: number, sprint: boolean
  ): void {
    const room = this.room;
    if (!room) {
      this.player.updateMovement(0, 0, 0, false);
      return;
    }
    const players = room.state?.players;
    if (!players) return;
    const local = players.get(room.sessionId);
    if (local) {
      this.player.setArchetype(local.archetype);
      if (room.connection.isOpen) {
        const position = this.prediction.update(
          local, { dx, dy, sprint }, delta,
          (wantsSprint) => movementSpeed(
            ARCHETYPES[local.archetype].stats.speedMultiplier, local.satiety, local.energy, wantsSprint,
          ),
          (input) => room.send(ClientMessage.MOVE, input),
        );
        this.player.updateMovement(dx, dy, 0, sprint && local.energy > 0);
        this.player.sprite.setPosition(position.x, position.y);
      } else {
        this.player.updateMovement(0, 0, 0, false);
        this.player.sprite.setPosition(local.x, local.y);
      }
    }
    players.forEach((state, id) => {
      if (id === room.sessionId) return;
      let entity = this.remotePlayers.get(id);
      if (!entity) {
        entity = new PlayerEntity(this, state.x, state.y, state.archetype);
        this.remotePlayers.set(id, entity);
      }
      entity.setArchetype(state.archetype);
      this.renderNetworkPlayer(entity, state, delta);
    });
    for (const [id, entity] of this.remotePlayers) {
      if (players.has(id)) continue;
      entity.sprite.destroy();
      this.remotePlayers.delete(id);
    }
    this.syncMinimapPlayer(time, false);
  }

  private renderNetworkPlayer(entity: PlayerEntity, state: WorldPlayer, delta: number): void {
    const { sprite } = entity;
    const dx = state.x - sprite.x;
    const dy = state.y - sprite.y;
    const distance = Math.hypot(dx, dy);
    const blend = distance > 64 ? 1 : 1 - Math.exp(-delta / 48);
    entity.updateMovement(dx, dy, 0, false);
    sprite.setPosition(sprite.x + dx * blend, sprite.y + dy * blend);
  }

  private clearRemotePlayers(): void {
    for (const entity of this.remotePlayers.values()) entity.sprite.destroy();
    this.remotePlayers.clear();
  }

  private getTouchScene(): TouchControlsScene | undefined {
    return this.scene.get("TouchControlsScene") as TouchControlsScene | undefined;
  }

  private resolveSpawnPoint(map: Phaser.Tilemaps.Tilemap): { x: number; y: number } {
    const spawnsLayer = map.getObjectLayer("spawns");
    const spawnObj = spawnsLayer?.objects.find((obj) => obj.name === "player_spawn");
    if (spawnObj && typeof spawnObj.x === "number" && typeof spawnObj.y === "number") {
      return { x: spawnObj.x, y: spawnObj.y };
    }
    return { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.updateCameraZoom(gameSize.width);
  }

  private updateCameraZoom(viewportWidth: number): void {
    const zoom = viewportWidth < 640 ? 1.5 : 2;
    this.cameras.main.setZoom(zoom);
  }

  private flashActionLabel(label: string): void {
    useGameStore.getState().setLastActionLabel(label);
    this.actionClearTimer?.remove(false);
    this.actionClearTimer = this.time.delayedCall(900, () => {
      useGameStore.getState().setLastActionLabel(null);
    });
  }

  private publishMinimapTerrain(
    map: Phaser.Tilemaps.Tilemap,
    zoneId: ReturnType<typeof useGameStore.getState>["currentZoneId"]
  ): void {
    const extractLayerIds = (layerName: string): number[] => {
      const layer = map.getLayer(layerName);
      const ids: number[] = [];
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const tile = layer?.data[y]?.[x];
          ids.push(tile && tile.index > 0 ? tile.index : 0);
        }
      }
      return ids;
    };

    const spawnsLayer = map.getObjectLayer("spawns");
    const markers: MinimapMarker[] = [];
    for (const obj of spawnsLayer?.objects ?? []) {
      if (typeof obj.x !== "number" || typeof obj.y !== "number") continue;
      const width = typeof obj.width === "number" ? obj.width : 0;
      const height = typeof obj.height === "number" ? obj.height : 0;
      const isPoint = Boolean(obj.point);
      markers.push({
        id: String(obj.id ?? obj.name ?? markers.length),
        label: obj.name || "",
        kind: obj.type === "portal" ? "portal" : "spawn",
        x: isPoint ? obj.x : obj.x + width / 2,
        y: isPoint ? obj.y : obj.y + height / 2,
        width,
        height,
      });
    }

    const terrain = buildMinimapTerrain({
      zoneId,
      tilesWidth: map.width,
      tilesHeight: map.height,
      tileWidth: map.tileWidth,
      tileHeight: map.tileHeight,
      ground: extractLayerIds("ground"),
      decor: extractLayerIds("decor"),
      obstacles: extractLayerIds("obstacles"),
      markers,
    });

    useGameStore.getState().setMinimapTerrain(terrain);
  }

  private syncMinimapPlayer(time: number, force: boolean): void {
    if (!this.player) return;
    if (!force && time - this.lastMinimapSyncAt < 33) return;

    const x = this.player.sprite.x;
    const y = this.player.sprite.y;
    const facing = this.player.getFacing();

    if (
      !force &&
      Math.abs(x - this.lastMinimapX) < 0.5 &&
      Math.abs(y - this.lastMinimapY) < 0.5 &&
      facing === this.lastMinimapFacing
    ) {
      return;
    }

    this.lastMinimapSyncAt = time;
    this.lastMinimapX = x;
    this.lastMinimapY = y;
    this.lastMinimapFacing = facing;

    const worldView = this.cameras.main.worldView;
    useGameStore.getState().setMinimapPlayer({
      x,
      y,
      facing,
      viewportX: worldView.x,
      viewportY: worldView.y,
      viewportWidth: worldView.width,
      viewportHeight: worldView.height,
    });
  }
}
