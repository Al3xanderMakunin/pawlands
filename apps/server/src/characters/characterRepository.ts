import { and, asc, eq } from "drizzle-orm";
import { ARCHETYPES, type WorldZoneDefinition } from "@pawlands/game-data";
import type { CharacterArchetype, Position, ZoneId } from "@pawlands/shared";
import { db } from "../database/index.js";
import { characters, characterPositions, characterStats, users, worldZones } from "../database/schema.js";

export type SavedStats = Omit<typeof characterStats.$inferSelect, "characterId">;

export async function loadCharacter(
  userId: string, archetype: CharacterArchetype, zone: WorldZoneDefinition, spawn: Position,
) {
  return db.transaction(async (tx) => {
    // Serialize lazy creation for an account and reuse the oldest existing character of this archetype.
    const [owner] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
    if (!owner) throw new Error("Character owner no longer exists");

    let [character] = await tx.select({ id: characters.id }).from(characters)
      .where(and(eq(characters.userId, userId), eq(characters.archetype, archetype)))
      .orderBy(asc(characters.createdAt), asc(characters.id)).limit(1);
    if (!character) {
      [character] = await tx.insert(characters)
        .values({ userId, archetype, name: `${userId}:${archetype}` })
        .returning({ id: characters.id });
      if (!character) throw new Error("Character creation returned no record");
    }

    await tx.insert(worldZones).values({
      id: zone.id, name: zone.name, type: zone.type,
      isPvpEnabled: zone.isPvpEnabled, spawnX: spawn.x, spawnY: spawn.y,
    }).onConflictDoNothing({ target: worldZones.id });

    const { maxSatiety, ...baseStats } = ARCHETYPES[archetype].stats;
    await tx.insert(characterStats).values({
      characterId: character.id,
      ...baseStats,
      hp: baseStats.maxHp,
      energy: baseStats.maxEnergy,
      satiety: maxSatiety,
    }).onConflictDoNothing({ target: characterStats.characterId });
    await tx.insert(characterPositions).values({
      characterId: character.id, zoneId: zone.id, x: spawn.x, y: spawn.y,
    }).onConflictDoNothing({ target: characterPositions.characterId });

    const [stats] = await tx.select().from(characterStats).where(eq(characterStats.characterId, character.id));
    const [position] = await tx.select().from(characterPositions)
      .where(eq(characterPositions.characterId, character.id));
    if (!stats || !position) throw new Error("Character checkpoint is incomplete");
    return { id: character.id, stats, position };
  });
}

export async function saveCharacter(id: string, zoneId: ZoneId, position: Position, stats: SavedStats) {
  await db.transaction(async (tx) => {
    const [character] = await tx.select({ id: characters.id }).from(characters)
      .where(eq(characters.id, id)).for("update");
    if (!character) return;

    await tx.insert(characterStats).values({ characterId: id, ...stats })
      .onConflictDoUpdate({ target: characterStats.characterId, set: stats });
    const checkpoint = { zoneId, x: position.x, y: position.y, updatedAt: new Date() };
    await tx.insert(characterPositions).values({ characterId: id, ...checkpoint })
      .onConflictDoUpdate({ target: characterPositions.characterId, set: checkpoint });
  });
}
