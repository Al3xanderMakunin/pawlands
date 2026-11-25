import Phaser from "phaser";

export class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: "WorldScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const gridSize = 32;

    const graphics = this.add.graphics();
    graphics.fillStyle(0x1e293b, 1);
    graphics.fillRect(0, 0, width, height);

    graphics.lineStyle(1, 0x334155, 0.45);
    for (let x = 0; x <= width; x += gridSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(width, y);
    }
    graphics.strokePath();

    // Placeholder feline sprite marker at world center
    this.add.rectangle(width / 2, height / 2, 24, 24, 0xf59e0b).setStrokeStyle(2, 0xfef3c7);
  }
}
