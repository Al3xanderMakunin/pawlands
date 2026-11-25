import { describe, expect, it } from "vitest";
import { KeyboardInput } from "./KeyboardInput";

function createKeyEvent(
  type: "keydown" | "keyup",
  init: {
    code: string;
    key?: string;
    repeat?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
  }
): Event {
  const event = new Event(type);
  Object.assign(event, init);
  return event;
}

describe("KeyboardInput", () => {
  it("maps physical WASD and E codes regardless of Colemak key characters", () => {
    const target = new EventTarget();
    const input = new KeyboardInput(undefined, target);

    // Colemak: physical S produces 'r', physical D produces 's', physical E produces 'f'
    target.dispatchEvent(createKeyEvent("keydown", { code: "KeyS", key: "r" }));
    target.dispatchEvent(createKeyEvent("keydown", { code: "KeyD", key: "s" }));
    target.dispatchEvent(createKeyEvent("keydown", { code: "KeyE", key: "f" }));

    expect(input.sample()).toEqual({
      moveX: 1,
      moveY: 1,
      sprint: false,
      attackJustPressed: false,
      interactJustPressed: true,
    });

    // Second sample clears justPressed without releasing keys
    expect(input.sample()).toEqual({
      moveX: 1,
      moveY: 1,
      sprint: false,
      attackJustPressed: false,
      interactJustPressed: false,
    });

    target.dispatchEvent(createKeyEvent("keyup", { code: "KeyS", key: "r" }));
    target.dispatchEvent(createKeyEvent("keyup", { code: "KeyD", key: "s" }));
    expect(input.sample()).toEqual({
      moveX: 0,
      moveY: 0,
      sprint: false,
      attackJustPressed: false,
      interactJustPressed: false,
    });

    input.destroy();
  });

  it("supports arrow keys, shift sprint, and space attack without repeat re-triggering", () => {
    const target = new EventTarget();
    const input = new KeyboardInput(undefined, target);

    target.dispatchEvent(createKeyEvent("keydown", { code: "ArrowLeft" }));
    target.dispatchEvent(createKeyEvent("keydown", { code: "ArrowUp" }));
    target.dispatchEvent(createKeyEvent("keydown", { code: "ShiftLeft" }));
    target.dispatchEvent(createKeyEvent("keydown", { code: "Space", repeat: false }));

    expect(input.sample()).toEqual({
      moveX: -1,
      moveY: -1,
      sprint: true,
      attackJustPressed: true,
      interactJustPressed: false,
    });

    // Key repeat on Space should not re-trigger attackJustPressed
    target.dispatchEvent(createKeyEvent("keydown", { code: "Space", repeat: true }));
    expect(input.sample().attackJustPressed).toBe(false);

    input.destroy();
  });

  it("ignores modifier shortcuts and clears state on blur", () => {
    const target = new EventTarget();
    const input = new KeyboardInput(undefined, target);

    target.dispatchEvent(createKeyEvent("keydown", { code: "KeyW", ctrlKey: true }));
    expect(input.sample().moveY).toBe(0);

    target.dispatchEvent(createKeyEvent("keydown", { code: "KeyW" }));
    expect(input.sample().moveY).toBe(-1);

    target.dispatchEvent(new Event("blur"));
    expect(input.sample().moveY).toBe(0);

    input.destroy();
  });
});
