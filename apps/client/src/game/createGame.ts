import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { TouchControlsScene } from "./scenes/TouchControlsScene";
import { WorldScene } from "./scenes/WorldScene";

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 960,
    height: parent.clientHeight || 540,
    backgroundColor: "#0f172a",
    pixelArt: true,
    roundPixels: true,
    input: {
      activePointers: 3,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, WorldScene, TouchControlsScene],
  });
}
