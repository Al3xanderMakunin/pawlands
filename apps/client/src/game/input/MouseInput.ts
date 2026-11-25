import type Phaser from "phaser";

export interface WorldBounds {
  width: number;
  height: number;
}

export interface ClickMoveSample {
  moveX: number;
  moveY: number;
  arrived: boolean;
  blocked: boolean;
}

export interface ClickMoveTrackerOptions {
  arrivalThresholdPx?: number;
  stuckTimeoutMs?: number;
  bounds?: WorldBounds;
}

/**
 * Pure target-following state machine for click-to-move navigation.
 * Keeps movement math independent of Phaser so it can be unit-tested directly.
 */
export class ClickMoveTracker {
  private readonly arrivalThresholdPx: number;
  private readonly stuckTimeoutMs: number;
  private readonly bounds: WorldBounds | null;

  private target: { x: number; y: number } | null = null;
  private lastCheckX: number | null = null;
  private lastCheckY: number | null = null;
  private stuckElapsedMs = 0;

  constructor(options: ClickMoveTrackerOptions = {}) {
    this.arrivalThresholdPx = options.arrivalThresholdPx ?? 6;
    this.stuckTimeoutMs = options.stuckTimeoutMs ?? 260;
    this.bounds = options.bounds ?? null;
  }

  public setTarget(x: number, y: number): void {
    const clampedX = this.bounds ? Math.max(0, Math.min(this.bounds.width, x)) : x;
    const clampedY = this.bounds ? Math.max(0, Math.min(this.bounds.height, y)) : y;
    this.target = { x: clampedX, y: clampedY };
    this.lastCheckX = null;
    this.lastCheckY = null;
    this.stuckElapsedMs = 0;
  }

  public getTarget(): { x: number; y: number } | null {
    return this.target ? { ...this.target } : null;
  }

  public hasTarget(): boolean {
    return this.target !== null;
  }

  public clear(): void {
    this.target = null;
    this.lastCheckX = null;
    this.lastCheckY = null;
    this.stuckElapsedMs = 0;
  }

  public sample(currentX: number, currentY: number, deltaMs: number): ClickMoveSample {
    if (!this.target) {
      return { moveX: 0, moveY: 0, arrived: false, blocked: false };
    }

    const dx = this.target.x - currentX;
    const dy = this.target.y - currentY;
    const dist = Math.hypot(dx, dy);

    if (dist <= this.arrivalThresholdPx) {
      this.clear();
      return { moveX: 0, moveY: 0, arrived: true, blocked: false };
    }

    if (this.lastCheckX === null || this.lastCheckY === null) {
      this.lastCheckX = currentX;
      this.lastCheckY = currentY;
      this.stuckElapsedMs = 0;
    } else {
      const movedDist = Math.hypot(currentX - this.lastCheckX, currentY - this.lastCheckY);
      if (movedDist < 1) {
        this.stuckElapsedMs += Math.max(0, deltaMs);
        if (this.stuckElapsedMs >= this.stuckTimeoutMs) {
          this.clear();
          return { moveX: 0, moveY: 0, arrived: false, blocked: true };
        }
      } else {
        this.lastCheckX = currentX;
        this.lastCheckY = currentY;
        this.stuckElapsedMs = 0;
      }
    }

    return {
      moveX: dx / dist,
      moveY: dy / dist,
      arrived: false,
      blocked: false,
    };
  }
}

export interface MouseInputOptions {
  bounds?: WorldBounds;
  canAcceptClick?: () => boolean;
}

/**
 * Handles desktop mouse click (and click-drag) navigation in world coordinates,
 * rendering a subtle destination marker on the ground.
 */
export class MouseInput {
  private readonly scene: Phaser.Scene;
  private readonly tracker: ClickMoveTracker;
  private readonly canAcceptClick: () => boolean;
  private readonly marker: Phaser.GameObjects.Arc;
  private isDragging = false;
  private activePointerId: number | null = null;
  private pulseElapsedMs = 0;

  constructor(scene: Phaser.Scene, options: MouseInputOptions = {}) {
    this.scene = scene;
    this.tracker = new ClickMoveTracker({ bounds: options.bounds });
    this.canAcceptClick = options.canAcceptClick ?? (() => true);

    this.marker = scene.add
      .circle(0, 0, 6, 0xfbbf24, 0.22)
      .setStrokeStyle(1.5, 0xfef3c7, 0.85)
      .setDepth(5)
      .setVisible(false);

    scene.input.on("pointerdown", this.onPointerDown, this);
    scene.input.on("pointermove", this.onPointerMove, this);
    scene.input.on("pointerup", this.onPointerUp, this);
    scene.input.on("pointerupoutside", this.onPointerUp, this);
  }

  public sample(currentX: number, currentY: number, deltaMs: number): ClickMoveSample {
    const result = this.tracker.sample(currentX, currentY, deltaMs);

    if (!this.tracker.hasTarget()) {
      this.marker.setVisible(false);
    } else {
      this.pulseElapsedMs += deltaMs;
      const pulse = 0.9 + 0.15 * Math.sin(this.pulseElapsedMs * 0.01);
      this.marker.setScale(pulse);
    }

    return result;
  }

  public clear(): void {
    this.tracker.clear();
    this.isDragging = false;
    this.activePointerId = null;
    this.marker.setVisible(false);
  }

  public destroy(): void {
    this.scene.input.off("pointerdown", this.onPointerDown, this);
    this.scene.input.off("pointermove", this.onPointerMove, this);
    this.scene.input.off("pointerup", this.onPointerUp, this);
    this.scene.input.off("pointerupoutside", this.onPointerUp, this);
    this.marker.destroy();
    this.tracker.clear();
  }

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.wasTouch || pointer.button !== 0) return;
    if (!this.canAcceptClick()) return;

    const eventTarget = pointer.event?.target;
    const canvas = this.scene.game.canvas;
    if (canvas && eventTarget && eventTarget !== canvas) return;

    this.isDragging = true;
    this.activePointerId = pointer.id;
    this.setWorldTarget(pointer.worldX, pointer.worldY);
  };

  private readonly onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isDragging || pointer.id !== this.activePointerId || !pointer.isDown) return;
    if (pointer.wasTouch || !this.canAcceptClick()) return;
    this.setWorldTarget(pointer.worldX, pointer.worldY);
  };

  private readonly onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.activePointerId) {
      this.isDragging = false;
      this.activePointerId = null;
    }
  };

  private setWorldTarget(worldX: number, worldY: number): void {
    this.tracker.setTarget(worldX, worldY);
    const target = this.tracker.getTarget();
    if (target) {
      this.pulseElapsedMs = 0;
      this.marker.setPosition(target.x, target.y).setScale(1).setVisible(true);
    }
  }
}
