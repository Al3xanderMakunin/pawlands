import Phaser from "phaser";
import type { CharacterArchetype } from "@pawlands/shared";
import type { FacingDirection } from "../scenes/BootScene";

export class PlayerEntity {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private archetype: CharacterArchetype;
  private facing: FacingDirection = "down";
  private isMoving = false;

  constructor(scene: Phaser.Scene, x: number, y: number, archetype: CharacterArchetype) {
    this.archetype = archetype;
    this.sprite = scene.physics.add.sprite(x, y, archetype, 0);
    this.sprite.setDepth(10);
    this.sprite.setCollideWorldBounds(true);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(16, 12);
    body.setOffset(8, 18);

    this.sprite.anims.play(`${this.archetype}-idle-${this.facing}`, true);
  }

  public setArchetype(archetype: CharacterArchetype): void {
    if (this.archetype === archetype) return;
    this.archetype = archetype;
    this.sprite.setTexture(archetype, 0);
    const animKey = `${this.archetype}-${this.isMoving ? "walk" : "idle"}-${this.facing}`;
    this.sprite.anims.play(animKey, true);
  }

  public getArchetype(): CharacterArchetype {
    return this.archetype;
  }

  public getFacing(): FacingDirection {
    return this.facing;
  }

  public updateMovement(
    inputX: number,
    inputY: number,
    speedPxPerSec: number,
    isSprinting: boolean
  ): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const mag = Math.hypot(inputX, inputY);

    if (mag > 0.05) {
      const nx = inputX / Math.max(1, mag);
      const ny = inputY / Math.max(1, mag);

      body.setVelocity(nx * speedPxPerSec, ny * speedPxPerSec);
      this.isMoving = true;

      if (Math.abs(nx) > Math.abs(ny)) {
        this.facing = nx < 0 ? "left" : "right";
      } else {
        this.facing = ny < 0 ? "up" : "down";
      }

      this.sprite.anims.timeScale = isSprinting ? 1.35 : 1.0;
      this.sprite.anims.play(`${this.archetype}-walk-${this.facing}`, true);
    } else {
      body.setVelocity(0, 0);
      this.isMoving = false;
      this.sprite.anims.timeScale = 1.0;
      this.sprite.anims.play(`${this.archetype}-idle-${this.facing}`, true);
    }
  }

  public playActionPulse(kind: "attack" | "interact"): void {
    const tint = kind === "attack" ? 0xfbbf24 : 0x34d399;
    this.sprite.setTint(tint);
    this.sprite.scene.time.delayedCall(120, () => {
      if (this.sprite.active) {
        this.sprite.clearTint();
      }
    });
  }
}
