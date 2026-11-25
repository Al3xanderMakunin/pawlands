import { BASE_MOVEMENT_SPEED_PX_PER_SEC } from "@pawlands/config";
import { calculateEncumbrance, calculateSurvivalModifiers, canSprint } from "./survival.js";

export interface Position {
  x: number;
  y: number;
}

export interface MovementIntent {
  dx: number;
  dy: number;
  sprint: boolean;
}

export type CanOccupy = (x: number, y: number) => boolean;

interface CollisionGrid {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  isBlocked: (column: number, row: number) => boolean;
}

export function createPlayerCollision(grid: CollisionGrid): CanOccupy {
  return (x, y) => {
    // A 16×12 foot hitbox centered horizontally on the 32×32 sprite.
    const left = Math.floor((x - 8) / grid.tileWidth);
    const right = Math.ceil((x + 8) / grid.tileWidth) - 1;
    const top = Math.floor((y + 2) / grid.tileHeight);
    const bottom = Math.ceil((y + 14) / grid.tileHeight) - 1;
    if (left < 0 || right >= grid.width || top < 0 || bottom >= grid.height) return false;
    for (let row = top; row <= bottom; row++) {
      for (let column = left; column <= right; column++) {
        if (grid.isBlocked(column, row)) return false;
      }
    }
    return true;
  };
}

export function movementSpeed(
  speedMultiplier: number, satiety: number, energy: number, sprint: boolean,
  weightKg = 0, maxWeightKg = Infinity,
) {
  return BASE_MOVEMENT_SPEED_PX_PER_SEC * speedMultiplier *
    calculateSurvivalModifiers(satiety).moveSpeedMultiplier * calculateEncumbrance(weightKg, maxWeightKg).moveSpeedMultiplier *
    (sprint && canSprint(energy, weightKg, maxWeightKg) ? 1.25 : 1);
}

export function stepMovement(
  position: Position,
  intent: MovementIntent,
  speed: number,
  deltaMs: number,
  canOccupy: CanOccupy,
): Position {
  const distance = speed * deltaMs / 1000 / Math.max(1, Math.hypot(intent.dx, intent.dy));
  const x = position.x + intent.dx * distance;
  const nextX = canOccupy(x, position.y) ? x : position.x;
  const y = position.y + intent.dy * distance;
  return { x: nextX, y: canOccupy(nextX, y) ? y : position.y };
}
