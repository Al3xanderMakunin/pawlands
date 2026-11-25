import Phaser from "phaser";
import { BASE_MOVEMENT_SPEED_PX_PER_SEC } from "@pawlands/config";
import { ARCHETYPES } from "@pawlands/game-data";
import { calculateEncumbrance, calculateSurvivalModifiers } from "@pawlands/shared";
import { useGameStore } from "../../stores/useGameStore";
import i18n from "../../i18n";
import { PlayerEntity } from "../entities/PlayerEntity";
import { KeyboardInput } from "../input/KeyboardInput";
import { MouseInput } from "../input/MouseInput";
import { buildMinimapTerrain, type MinimapMarker } from "../minimap/minimapData";
import type { TouchControlsScene } from "./TouchControlsScene";

export class WorldScene extends Phaser.Scene {
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

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const spawnPoint = this.resolveSpawnPoint(map);

    this.player = new PlayerEntity(this, spawnPoint.x, spawnPoint.y, store.selectedArchetype);

    if (obstaclesLayer) {
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
      if (state.currentZoneId !== prevState.currentZoneId) {
        this.scene.restart();
        return;
      }
      if (state.selectedArchetype !== prevState.selectedArchetype) {
        this.player.setArchetype(state.selectedArchetype);
      }
      if (state.isArchetypeModalOpen && !prevState.isArchetypeModalOpen) {
        this.mouseInput.clear();
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize, this);
      this.unsubscribeStore?.();
      this.unsubscribeStore = null;
      this.actionClearTimer?.remove(false);
      this.actionClearTimer = null;
      this.keyboardInput.destroy();
      this.mouseInput.destroy();
    });
  }

  update(_time: number, delta: number): void {
    if (!this.player) return;

    const store = useGameStore.getState();
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
