import type { Backpack } from "@pawlands/game-data";
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  vkId: text("vk_id").unique(),
  role: text("role").default("player").notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
  banReason: text("ban_reason"),
  yandexId: text("yandex_id").unique(),
  telegramId: text("telegram_id").unique(),
  telegramUsername: text("telegram_username"),
  appleSub: text("apple_sub").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const characters = pgTable("characters", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().unique(),
  archetype: text("archetype").notNull(),
  level: integer("level").default(1).notNull(),
  xp: doublePrecision("xp").default(0).notNull(),
  backpack: jsonb("backpack").$type<Backpack>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const characterStats = pgTable("character_stats", {
  characterId: uuid("character_id")
    .primaryKey()
    .references(() => characters.id, { onDelete: "cascade" }),
  hp: doublePrecision("hp").notNull(),
  maxHp: integer("max_hp").notNull(),
  energy: doublePrecision("energy").notNull(),
  maxEnergy: integer("max_energy").notNull(),
  satiety: doublePrecision("satiety").default(100).notNull(),
  strength: integer("strength").notNull(),
  agility: integer("agility").notNull(),
  speedMultiplier: real("speed_multiplier").default(1).notNull(),
  maxCarryWeightKg: real("max_carry_weight_kg").notNull(),
});

export const worldZones = pgTable("world_zones", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  isPvpEnabled: boolean("is_pvp_enabled").default(false).notNull(),
  spawnX: real("spawn_x").default(0).notNull(),
  spawnY: real("spawn_y").default(0).notNull(),
});

export const characterPositions = pgTable("character_positions", {
  characterId: uuid("character_id")
    .primaryKey()
    .references(() => characters.id, { onDelete: "cascade" }),
  zoneId: text("zone_id")
    .notNull()
    .references(() => worldZones.id),
  x: real("x").notNull(),
  y: real("y").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const wallets = pgTable("wallets", {
  characterId: uuid("character_id")
    .primaryKey()
    .references(() => characters.id, { onDelete: "cascade" }),
  coins: integer("coins").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  characterId: uuid("character_id")
    .notNull()
    .references(() => wallets.characterId, { onDelete: "cascade" }),
  delta: integer("delta").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  reason: text("reason").notNull(),
  referenceId: text("reference_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
