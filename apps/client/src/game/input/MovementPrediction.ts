import { SERVER_TICK_INTERVAL_MS } from "@pawlands/config";
import type { MoveInput } from "@pawlands/protocol";
import { stepMovement, type CanOccupy, type MovementIntent, type Position } from "@pawlands/shared";

const MAX_PENDING_INPUTS = 5;

export class MovementPrediction {
  private pending: MoveInput[] = [];
  private elapsedMs = 0;
  private nextSeq = 0;

  constructor(private readonly canOccupy: CanOccupy) {}

  reset(): void {
    this.pending = [];
    this.elapsedMs = 0;
  }

  update(
    snapshot: Position & { lastMoveSeq: number },
    intent: MovementIntent,
    deltaMs: number,
    speed: (sprint: boolean) => number,
    send: (input: MoveInput) => void,
  ): Position {
    this.pending = this.pending.filter(({ seq }) => seq > snapshot.lastMoveSeq);
    // A slow or backgrounded frame must never send a burst of movement commands.
    this.elapsedMs += Math.min(deltaMs, SERVER_TICK_INTERVAL_MS);
    if (this.elapsedMs >= SERVER_TICK_INTERVAL_MS) {
      this.elapsedMs %= SERVER_TICK_INTERVAL_MS;
      const input = { ...intent, seq: this.nextSeq++ };
      this.pending.push(input);
      if (this.pending.length > MAX_PENDING_INPUTS) this.pending.shift();
      send(input);
    }

    let position: Position = snapshot;
    for (const input of this.pending) {
      position = stepMovement(position, input, speed(input.sprint), SERVER_TICK_INTERVAL_MS, this.canOccupy);
    }
    return stepMovement(position, intent, speed(intent.sprint), this.elapsedMs, this.canOccupy);
  }
}
