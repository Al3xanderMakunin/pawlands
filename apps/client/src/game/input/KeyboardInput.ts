import type Phaser from "phaser";
import type { MovementInputState } from "./InputTypes";

export interface KeyboardEventTarget {
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

const PREVENT_DEFAULT_CODES = new Set([
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

/**
 * Samples keyboard movement and action state using physical `KeyboardEvent.code`
 * values so controls work identically across QWERTY, Colemak, Dvorak, and
 * non-Latin keyboard layouts.
 */
export class KeyboardInput {
  private readonly target: KeyboardEventTarget | null;
  private readonly pressedCodes = new Set<string>();
  private attackQueued = false;
  private interactQueued = false;

  constructor(_scene?: Phaser.Scene, target?: KeyboardEventTarget | null) {
    this.target =
      target !== undefined ? target : typeof window !== "undefined" ? window : null;

    if (!this.target) return;

    this.target.addEventListener("keydown", this.handleKeyDown);
    this.target.addEventListener("keyup", this.handleKeyUp);
    this.target.addEventListener("blur", this.handleBlur);
  }

  public sample(): MovementInputState {
    if (!this.target || this.isTextInputFocused()) {
      this.attackQueued = false;
      this.interactQueued = false;
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

    if (this.isAnyDown("ArrowLeft", "KeyA")) moveX -= 1;
    if (this.isAnyDown("ArrowRight", "KeyD")) moveX += 1;
    if (this.isAnyDown("ArrowUp", "KeyW")) moveY -= 1;
    if (this.isAnyDown("ArrowDown", "KeyS")) moveY += 1;

    const attackJustPressed = this.attackQueued;
    const interactJustPressed = this.interactQueued;
    this.attackQueued = false;
    this.interactQueued = false;

    return {
      moveX,
      moveY,
      sprint: this.isAnyDown("ShiftLeft", "ShiftRight"),
      attackJustPressed,
      interactJustPressed,
    };
  }

  public destroy(): void {
    if (!this.target) return;
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("blur", this.handleBlur);
    this.pressedCodes.clear();
    this.attackQueued = false;
    this.interactQueued = false;
  }

  private readonly handleKeyDown = (rawEvent: Event): void => {
    const event = rawEvent as KeyboardEvent;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (this.isTextInputFocused()) return;

    const code = event.code;
    if (!code) return;

    if (PREVENT_DEFAULT_CODES.has(code) && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    this.pressedCodes.add(code);

    if (!event.repeat) {
      if (code === "Space") {
        this.attackQueued = true;
      } else if (code === "KeyE") {
        this.interactQueued = true;
      }
    }
  };

  private readonly handleKeyUp = (rawEvent: Event): void => {
    const event = rawEvent as KeyboardEvent;
    if (event.code) {
      this.pressedCodes.delete(event.code);
    }
  };

  private readonly handleBlur = (): void => {
    this.pressedCodes.clear();
    this.attackQueued = false;
    this.interactQueued = false;
  };

  private isAnyDown(...codes: string[]): boolean {
    return codes.some((code) => this.pressedCodes.has(code));
  }

  private isTextInputFocused(): boolean {
    if (typeof document === "undefined") return false;
    const active = document.activeElement as HTMLElement | null;
    if (!active) return false;
    if (active.isContentEditable) return true;
    const tag = active.tagName?.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select";
  }
}
