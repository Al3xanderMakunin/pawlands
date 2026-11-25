import { describe, expect, it, vi } from "vitest";
import { MovementPrediction } from "./MovementPrediction";

const right = { dx: 1, dy: 0, sprint: false };
const idle = { dx: 0, dy: 0, sprint: false };
const initial = { x: 0, y: 0, lastMoveSeq: -1 };
const speed = () => 160;

describe("MovementPrediction", () => {
  it("moves before the first packet and replays only unacknowledged input", () => {
    const prediction = new MovementPrediction(() => true);
    const send = vi.fn();
    expect(prediction.update(initial, right, 25, speed, send).x).toBe(4);
    expect(send).not.toHaveBeenCalled();
    expect(prediction.update(initial, right, 25, speed, send).x).toBe(8);
    expect(send).toHaveBeenLastCalledWith({ ...right, seq: 0 });
    expect(prediction.update(initial, right, 50, speed, send).x).toBe(16);
    expect(prediction.update({ x: 7, y: 0, lastMoveSeq: 0 }, idle, 0, speed, send).x).toBe(15);
    expect(prediction.update({ x: 14, y: 0, lastMoveSeq: 1 }, idle, 0, speed, send).x).toBe(14);
  });

  it("bounds prediction during a stall and preserves sequence numbers after reconnect", () => {
    const prediction = new MovementPrediction(() => true);
    const send = vi.fn();
    for (let i = 0; i < 10; i++) prediction.update(initial, right, 1000, speed, send);
    expect(send).toHaveBeenCalledTimes(10);
    expect(prediction.update(initial, idle, 0, speed, send).x).toBe(40);
    prediction.reset();
    expect(prediction.update(initial, idle, 50, speed, send).x).toBe(0);
    expect(send).toHaveBeenLastCalledWith({ ...idle, seq: 10 });
  });
});
