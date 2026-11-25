import Phaser from "phaser";
import type { MovementInputState } from "./InputTypes";
import { computeTouchControlsLayout, readSafeAreaInsets } from "./touchControlsLayout";

export class TouchControls {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly baseCircle: Phaser.GameObjects.Arc;
  private readonly thumbCircle: Phaser.GameObjects.Arc;
  private readonly attackBtn: Phaser.GameObjects.Arc;
  private readonly attackLabel: Phaser.GameObjects.Text;
  private readonly interactBtn: Phaser.GameObjects.Arc;
  private readonly interactLabel: Phaser.GameObjects.Text;
  private readonly sprintBtn: Phaser.GameObjects.Arc;
  private readonly sprintLabel: Phaser.GameObjects.Text;

  private readonly maxRadius = 44;
  private baseCenterX = 96;
  private baseCenterY = 0;

  private stickPointerId: number | null = null;
  private sprintPointerId: number | null = null;
  private moveX = 0;
  private moveY = 0;
  private sprinting = false;
  private attackQueued = false;
  private interactQueued = false;
  private visible = false;

  constructor(scene: Phaser.Scene, initiallyVisible: boolean) {
    this.scene = scene;
    this.visible = initiallyVisible;

    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(1000);
    this.container.setVisible(this.visible);

    // Virtual joystick (bottom-left)
    this.baseCircle = scene.add
      .circle(0, 0, this.maxRadius, 0x0f172a, 0.45)
      .setStrokeStyle(2, 0x94a3b8, 0.65);

    this.thumbCircle = scene.add
      .circle(0, 0, 20, 0xfbbf24, 0.75)
      .setStrokeStyle(2, 0xfef3c7, 0.9);

    // Action buttons (bottom-right)
    this.attackBtn = scene.add
      .circle(0, 0, 30, 0xd97706, 0.65)
      .setStrokeStyle(2, 0xfef3c7, 0.85);
    this.attackLabel = scene.add
      .text(0, 0, "ATK", { fontSize: "11px", fontStyle: "bold", color: "#fffbeb" })
      .setOrigin(0.5);

    this.interactBtn = scene.add
      .circle(0, 0, 24, 0x059669, 0.65)
      .setStrokeStyle(2, 0xd1fae5, 0.85);
    this.interactLabel = scene.add
      .text(0, 0, "USE", { fontSize: "10px", fontStyle: "bold", color: "#ecfdf5" })
      .setOrigin(0.5);

    this.sprintBtn = scene.add
      .circle(0, 0, 22, 0x334155, 0.65)
      .setStrokeStyle(2, 0xcbd5e1, 0.85);
    this.sprintLabel = scene.add
      .text(0, 0, "RUN", { fontSize: "10px", fontStyle: "bold", color: "#f8fafc" })
      .setOrigin(0.5);

    this.container.add([
      this.baseCircle,
      this.thumbCircle,
      this.attackBtn,
      this.attackLabel,
      this.interactBtn,
      this.interactLabel,
      this.sprintBtn,
      this.sprintLabel,
    ]);

    this.layout(scene.scale.width, scene.scale.height);
    this.bindPointerEvents();
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.setVisible(visible);
    if (!visible) {
      this.resetStick();
      this.sprinting = false;
      this.sprintPointerId = null;
    }
  }

  public layout(width: number, height: number): void {
    const pos = computeTouchControlsLayout(width, height, readSafeAreaInsets());

    this.baseCenterX = pos.stickX;
    this.baseCenterY = pos.stickY;

    this.baseCircle.setPosition(this.baseCenterX, this.baseCenterY);
    if (this.stickPointerId === null) {
      this.thumbCircle.setPosition(this.baseCenterX, this.baseCenterY);
    }

    this.attackBtn.setPosition(pos.attackX, pos.attackY);
    this.attackLabel.setPosition(pos.attackX, pos.attackY);

    this.interactBtn.setPosition(pos.interactX, pos.interactY);
    this.interactLabel.setPosition(pos.interactX, pos.interactY);

    this.sprintBtn.setPosition(pos.sprintX, pos.sprintY);
    this.sprintLabel.setPosition(pos.sprintX, pos.sprintY);
  }

  public sample(): MovementInputState {
    const attackJustPressed = this.attackQueued;
    const interactJustPressed = this.interactQueued;
    this.attackQueued = false;
    this.interactQueued = false;

    return {
      moveX: this.moveX,
      moveY: this.moveY,
      sprint: this.sprinting,
      attackJustPressed,
      interactJustPressed,
    };
  }

  public destroy(): void {
    this.scene.input.off("pointerdown", this.onPointerDown, this);
    this.scene.input.off("pointermove", this.onPointerMove, this);
    this.scene.input.off("pointerup", this.onPointerUp, this);
    this.scene.input.off("pointerupoutside", this.onPointerUp, this);
    this.container.destroy(true);
  }

  private bindPointerEvents(): void {
    this.scene.input.on("pointerdown", this.onPointerDown, this);
    this.scene.input.on("pointermove", this.onPointerMove, this);
    this.scene.input.on("pointerup", this.onPointerUp, this);
    this.scene.input.on("pointerupoutside", this.onPointerUp, this);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.visible) return;
    const x = pointer.x;
    const y = pointer.y;

    // Check right-side action buttons first
    if (this.hitCircle(x, y, this.attackBtn, 36)) {
      this.attackQueued = true;
      this.attackBtn.setScale(0.92);
      this.scene.time.delayedCall(100, () => this.attackBtn.setScale(1));
      return;
    }

    if (this.hitCircle(x, y, this.interactBtn, 30)) {
      this.interactQueued = true;
      this.interactBtn.setScale(0.92);
      this.scene.time.delayedCall(100, () => this.interactBtn.setScale(1));
      return;
    }

    if (this.hitCircle(x, y, this.sprintBtn, 28)) {
      this.sprintPointerId = pointer.id;
      this.sprinting = true;
      this.sprintBtn.setFillStyle(0x0284c7, 0.85);
      return;
    }

    // Left half of screen activates virtual joystick
    if (this.stickPointerId === null && x < this.scene.scale.width * 0.5) {
      this.stickPointerId = pointer.id;
      this.updateStick(x, y);
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.visible) return;
    if (pointer.id === this.stickPointerId && pointer.isDown) {
      this.updateStick(pointer.x, pointer.y);
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.stickPointerId) {
      this.resetStick();
    }
    if (pointer.id === this.sprintPointerId) {
      this.sprintPointerId = null;
      this.sprinting = false;
      this.sprintBtn.setFillStyle(0x334155, 0.65);
    }
  }

  private hitCircle(
    px: number,
    py: number,
    circle: Phaser.GameObjects.Arc,
    radius: number
  ): boolean {
    return Phaser.Math.Distance.Between(px, py, circle.x, circle.y) <= radius;
  }

  private updateStick(px: number, py: number): void {
    const dx = px - this.baseCenterX;
    const dy = py - this.baseCenterY;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, this.maxRadius);
    const angle = Math.atan2(dy, dx);

    const tx = this.baseCenterX + Math.cos(angle) * clampedDist;
    const ty = this.baseCenterY + Math.sin(angle) * clampedDist;
    this.thumbCircle.setPosition(tx, ty);

    if (dist > 6) {
      this.moveX = Math.cos(angle) * (clampedDist / this.maxRadius);
      this.moveY = Math.sin(angle) * (clampedDist / this.maxRadius);
    } else {
      this.moveX = 0;
      this.moveY = 0;
    }
  }

  private resetStick(): void {
    this.stickPointerId = null;
    this.moveX = 0;
    this.moveY = 0;
    this.thumbCircle.setPosition(this.baseCenterX, this.baseCenterY);
  }
}
