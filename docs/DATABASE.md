# Database Schema & Persistence Strategy

Pawlands uses **PostgreSQL** with **Drizzle ORM** (`apps/server/src/database/schema.ts`).

## 1. Volatile vs. Durable State

| State Category | Storage | Rationale |
| --- | --- | --- |
| Live coordinates, velocity, attack cooldowns, aggro | In-memory (`ZoneRoom`) | Updated 20 times/sec; writing every step to SQL would bottleneck the DB. |
| Accounts, characters, inventory, equipment, wallets, quests | PostgreSQL (ACID) | Requires durability, anti-duplication guarantees, and auditability. |
| Session cache, rate limits, online presence, matchmaking | Redis | Fast TTL lookups and cross-room coordination. |

## 2. Core Entities (17 Tables)

1. **`users`**: Player accounts (`id`, `email`, `username`, `passwordHash` nullable, `googleId` nullable unique, `yandexId` nullable unique, `role`, `isBanned`, `banReason`, `createdAt`, `updatedAt`).
2. **`characters`**: Playable feline characters owned by a user (`id`, `userId`, `name`, `archetype`, `level`, `xp`, `createdAt`).
3. **`character_stats`**: Durable baseline and current vitals (`characterId`, `hp`, `maxHp`, `energy`, `maxEnergy`, `satiety`, `strength`, `agility`, `baseSpeed`, `maxCarryWeightKg`).
4. **`items`**: Static/catalog item definitions mirrored or seeded from game data (`id`, `slug`, `name`, `category`, `weightKg`, `maxStack`, `metadata`).
5. **`item_instances`**: Unique or rolled equipment instances (`id`, `itemId`, `durability`, `quality`, `bonusStats`).
6. **`inventory_slots`**: Character backpack slots (`id`, `characterId`, `slotIndex`, `itemId`, `itemInstanceId`, `quantity`).
7. **`equipment_slots`**: Equipped gear per character (`characterId`, `slotType`, `itemInstanceId`).
8. **`wallets`**: Internal coin balance (`characterId`, `coins`, `updatedAt`).
9. **`wallet_transactions`**: Append-only ledger of coin credits/debits (`id`, `characterId`, `delta`, `balanceAfter`, `reason`, `referenceId`, `createdAt`).
10. **`quests`**: Quest definitions (`id`, `slug`, `title`, `minLevel`, `objectives`, `rewards`).
11. **`character_quests`**: Active and completed quest progress (`id`, `characterId`, `questId`, `status`, `progress`, `updatedAt`).
12. **`world_zones`**: Zone registry (`id`, `slug`, `name`, `type`, `isPvpEnabled`, `spawnX`, `spawnY`).
13. **`character_positions`**: Last saved safe/checkpoint position (`characterId`, `zoneId`, `x`, `y`, `updatedAt`).
14. **`combat_logs`**: PvP and notable combat events (`id`, `zoneId`, `attackerId`, `defenderId`, `damage`, `isKill`, `createdAt`).
15. **`guilds`**: Player clans/packs (`id`, `name`, `tag`, `ownerCharacterId`, `createdAt`).
16. **`guild_members`**: Membership and roles (`guildId`, `characterId`, `role`, `joinedAt`).
17. **`market_listings`**: Asynchronous player marketplace (`id`, `sellerCharacterId`, `itemInstanceId`, `quantity`, `priceCoins`, `status`, `createdAt`).

## 3. Transactional Integrity Rules

- **Economy & Loot**: Every coin transfer or item move between players/NPCs executes inside `db.transaction(...)` with row locking (`FOR UPDATE`) to prevent item or coin duplication.
- **Checkpoints**: `character_positions` and `character_stats` are persisted on zone transition, disconnect, and periodic autosave intervals (e.g., every 30–60 seconds).

## 4. Migrations

Schema changes are managed via `drizzle-kit`:

```bash
pnpm --filter @pawlands/server db:generate
pnpm --filter @pawlands/server db:migrate
```

On server startup/restart (`apps/server/src/index.ts`), `runMigrations()` automatically applies any pending SQL migrations from `apps/server/drizzle` under a PostgreSQL advisory lock before the HTTP/WebSocket server begins listening. Set `AUTO_MIGRATE=false` to disable automatic migrations on startup.
