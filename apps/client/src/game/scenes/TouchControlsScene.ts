import Phaser from "phaser";
import { useGameStore, type TouchControlsMode } from "../../stores/useGameStore";
import type { MovementInputState } from "../input/InputTypes";
import { TouchControls } from "../input/TouchControls";

const EMPTY_TOUCH_STATE: MovementInputState = {
  moveX: 0,
  moveY: 0,
  sprint: false,
  attackJustPressed: false,
  interactJustPressed: false,
};

export class TouchControlsScene extends Phaser.Scene {
  private touchControls: TouchControls | null = null;
  private unsubscribeStore: (() => void) | null = null;

  constructor() {
    super({ key: "TouchControlsScene" });
  }

  create(): void {
    const store = useGameStore.getState();
    this.touchControls = new TouchControls(
      this,
      this.shouldShowTouchControls(store.touchControlsMode, this.scale.width)
    );

    this.scale.on("resize", this.handleResize, this);

    this.unsubscribeStore = useGameStore.subscribe((state, prevState) => {
      if (state.touchControlsMode !== prevState.touchControlsMode) {
        this.touchControls?.setVisible(
          this.shouldShowTouchControls(state.touchControlsMode, this.scale.width)
        );
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize, this);
      this.unsubscribeStore?.();
      this.unsubscribeStore = null;
      this.touchControls?.destroy();
      this.touchControls = null;
    });
  }

  public blocksTerrainTap(x: number, y: number): boolean {
    return this.touchControls?.blocksTerrainTap(x, y) ?? false;
  }

  public sample(): MovementInputState {
    return this.touchControls?.sample() ?? EMPTY_TOUCH_STATE;
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (!this.touchControls) return;
    this.touchControls.layout(gameSize.width, gameSize.height);
    const mode = useGameStore.getState().touchControlsMode;
    this.touchControls.setVisible(this.shouldShowTouchControls(mode, gameSize.width));
  }

  private shouldShowTouchControls(mode: TouchControlsMode, viewportWidth: number): boolean {
    if (mode === "on") return true;
    if (mode === "off") return false;
    return this.sys.game.device.input.touch || viewportWidth < 768;
  }
}
