import Phaser from "phaser";
import { WORLD_ZONES } from "@pawlands/game-data";
import type { CharacterArchetype } from "@pawlands/shared";

const ARCHETYPE_KEYS: CharacterArchetype[] = ["tomcat", "cat", "kitten"];
const DIRECTIONS = ["down", "up", "left", "right"] as const;

export type FacingDirection = (typeof DIRECTIONS)[number];

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    this.load.image("pawlands_tileset", "/assets/tilesets/pawlands_tileset.png");
    for (const zone of WORLD_ZONES) {
      this.load.tilemapTiledJSON(zone.id, `/assets/maps/${zone.id}.tmj`);
    }

    for (const key of ARCHETYPE_KEYS) {
      this.load.spritesheet(key, `/assets/sprites/${key}.png`, {
        frameWidth: 32,
        frameHeight: 32,
      });
    }
  }

  create(): void {
    this.registerArchetypeAnimations();
    this.scene.start("WorldScene");
  }

  private registerArchetypeAnimations(): void {
    for (const archetype of ARCHETYPE_KEYS) {
      DIRECTIONS.forEach((dir, rowIndex) => {
        const startFrame = rowIndex * 4;
        const idleKey = `${archetype}-idle-${dir}`;
        const walkKey = `${archetype}-walk-${dir}`;

        if (!this.anims.exists(idleKey)) {
          this.anims.create({
            key: idleKey,
            frames: [{ key: archetype, frame: startFrame }],
            frameRate: 1,
            repeat: -1,
          });
        }

        if (!this.anims.exists(walkKey)) {
          this.anims.create({
            key: walkKey,
            frames: this.anims.generateFrameNumbers(archetype, {
              start: startFrame,
              end: startFrame + 3,
            }),
            frameRate: 8,
            repeat: -1,
          });
        }
      });
    }
  }
}
