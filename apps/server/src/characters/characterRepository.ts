import { and, asc, eq, sql } from "drizzle-orm";
import { ARCHETYPES, createStarterBackpack, type Backpack, type WorldZoneDefinition } from "@pawlands/game-data";
import { COINS_PER_LEVEL, type CharacterArchetype, type Position, type ZoneId } from "@pawlands/shared";
import { db } from "../database/index.js";
import { characters, characterPositions, characterStats, users, wallets, walletTransactions, worldZones } from "../database/schema.js";

export type SavedStats = Omit<typeof characterStats.$inferSelect, "characterId">;

interface CharacterProgress {
  level: number;
  xp: number;
  backpack: Backpack;
}

export async function loadCharacter(
  userId: string, archetype: CharacterArchetype, zone: WorldZoneDefinition, spawn: Position,
) {
  return db.transaction(async (tx) => {
    // Serialize lazy creation for an account and reuse the oldest existing character of this archetype.
    const [owner] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
    if (!owner) throw new Error("Character owner no longer exists");

    let [character] = await tx.select().from(characters)
      .where(and(eq(characters.userId, userId), eq(characters.archetype, archetype)))
      .orderBy(asc(characters.createdAt), asc(characters.id)).limit(1);
    if (!character) {
      [character] = await tx.insert(characters)
        .values({ userId, archetype, name: `${userId}:${archetype}` })
        .returning();
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

    const backpack = character.backpack ?? createStarterBackpack();
    if (!character.backpack) {
      await tx.update(characters).set({ backpack }).where(eq(characters.id, character.id));
    }
    await tx.insert(wallets).values({ characterId: character.id }).onConflictDoNothing();
    const [wallet] = await tx.select().from(wallets).where(eq(wallets.characterId, character.id));
    const [stats] = await tx.select().from(characterStats).where(eq(characterStats.characterId, character.id));
    const [position] = await tx.select().from(characterPositions)
      .where(eq(characterPositions.characterId, character.id));
    if (!stats || !position || !wallet) throw new Error("Character checkpoint is incomplete");
    return { id: character.id, stats, position, backpack, level: character.level, xp: character.xp, coins: wallet.coins };
  });
}

export async function saveCharacter(
  id: string, zoneId: ZoneId, position: Position, stats: SavedStats, progress: CharacterProgress,
) {
  return db.transaction(async (tx) => {
    const [character] = await tx.select({ level: characters.level, xp: characters.xp }).from(characters)
      .where(eq(characters.id, id)).for("update");
    if (!character || progress.level < character.level ||
      (progress.level === character.level && progress.xp < character.xp)) return;

    await tx.update(characters).set(progress).where(eq(characters.id, id));

    const levelsGained = progress.level - character.level;
    if (levelsGained > 0) {
      const delta = levelsGained * COINS_PER_LEVEL;
      const [wallet] = await tx.update(wallets).set({
        coins: sql`${wallets.coins} + ${delta}`,
        updatedAt: new Date(),
      }).where(eq(wallets.characterId, id)).returning({ coins: wallets.coins });
      if (!wallet) throw new Error("Character wallet is missing");
      await tx.insert(walletTransactions).values({
        characterId: id, delta, balanceAfter: wallet.coins,
        reason: "level_up", referenceId: String(progress.level),
      });
    }

    await tx.insert(characterStats).values({ characterId: id, ...stats })
      .onConflictDoUpdate({ target: characterStats.characterId, set: stats });
    const checkpoint = { zoneId, x: position.x, y: position.y, updatedAt: new Date() };
    await tx.insert(characterPositions).values({ characterId: id, ...checkpoint })
      .onConflictDoUpdate({ target: characterPositions.characterId, set: checkpoint });

    const [wallet] = await tx.select({ coins: wallets.coins }).from(wallets).where(eq(wallets.characterId, id));
    return wallet?.coins;
  });
}
