export const MAX_LEVEL = 100;
export const COINS_PER_LEVEL = 10;
export const PIXELS_PER_XP = 160;

export function xpForNextLevel(level: number): number {
  return 100 * level;
}

export function advanceProgression(level: number, xp: number, earnedXp: number) {
  xp += earnedXp;
  while (level < MAX_LEVEL && xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level);
    level++;
  }
  return { level, xp: level === MAX_LEVEL ? 0 : xp };
}
