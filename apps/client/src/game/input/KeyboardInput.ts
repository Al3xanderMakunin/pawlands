import Phaser from "phaser";
import type { MovementInputState } from "./InputTypes";

export class KeyboardInput {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys | null;
  private readonly keys: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
  } | null;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      this.cursors = null;
      this.keys = null;
      return;
    }

    this.cursors = keyboard.createCursorKeys();
    this.keys = {
      w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      shift: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      e: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      space: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    };
  }

  public sample(): MovementInputState {
    if (!this.cursors || !this.keys || this.isTextInputFocused()) {
      return {
        moveX: 0,
        moveY: 0,
        sprint: false,
        attackJustPressed: false,
        interactJustPressed: false,
      };
    }

    let moveX = 0;
    let moveY = 0;

    if (this.cursors.left.isDown || this.keys.a.isDown) moveX -= 1;
    if (this.cursors.right.isDown || this.keys.d.isDown) moveX += 1;
    if (this.cursors.up.isDown || this.keys.w.isDown) moveY -= 1;
    if (this.cursors.down.isDown || this.keys.s.isDown) moveY += 1;

    return {
      moveX,
      moveY,
      sprint: this.keys.shift.isDown,
      attackJustPressed: Phaser.Input.Keyboard.JustDown(this.keys.space),
      interactJustPressed: Phaser.Input.Keyboard.JustDown(this.keys.e),
    };
  }

  private isTextInputFocused(): boolean {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    return tag === "input" || tag === "textarea";
  }
}
