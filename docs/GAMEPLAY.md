# Gameplay & Survival Formulas

All survival and encumbrance calculations live as pure functions in `@pawlands/shared` so the server can enforce them authoritatively and the client can display accurate previews.

## 1. Survival Loop: Hunger, Energy, and Health

Every character tracks three primary survival bars (normalized or capped by archetype/equipment stats):

- **Health (`hp` / `maxHp`)**
- **Energy (`energy` / `maxEnergy`)**
- **Satiety (`satiety` / `maxSatiety`, 0–100%)**

### 1.1 Satiety Tiers & Effects

Satiety directly governs energy regeneration, movement speed, and starvation damage:

| Satiety Range | Status | Energy Regen Multiplier | Movement Speed Multiplier | Starvation HP Drain |
| --- | --- | --- | --- | --- |
| `60% – 100%` | `well_fed` | `1.00x` (100%) | `1.00x` (100%) | `0 HP/s` |
| `25% – 59%` | `hungry` | `0.50x` (50%) | `1.00x` (100%) | `0 HP/s` |
| `1% – 24%` | `famished` | `0.20x` (20%) | `0.85x` (85%) | `0 HP/s` |
| `0%` | `starving` | `0.00x` (0%) | `0.70x` (70%) | `2 HP/s` |

- Online satiety decreases by 0.1 points/s normally, 0.05 points/s while stationary in a settlement, and 0.3 points/s while sprinting. Rates apply to simulated room time. Survival continues while Colyseus holds the player seat during reconnection.
- Base energy regeneration is 8 points/s. Sprinting adds 25% movement speed, requires at least one energy point, and spends 12 energy/s times the encumbrance multiplier. A blocked sprint does not spend energy.
- Dried minnow restores up to 25 satiety points and consumes one unit. A living character with full satiety keeps the food.
- At 0 HP the character stops moving and cannot use inventory actions. The current starvation recovery returns the character to the room spawn after five seconds with half health and energy and 50 satiety. Combat death and loot rules are part of Stage 4.

## 2. Inventory & Carry Weight (Encumbrance)

Each character has a `maxCarryWeightKg` determined by their archetype (Tomcat: `25 kg`, Cat: `20 kg`, Kitten: `12 kg`) plus bonuses from equipped pouches/accessories.

| Weight Ratio (`current / max`) | Encumbrance Tier | Speed Multiplier | Energy Cost Multiplier | Can Sprint / Dash |
| --- | --- | --- | --- | --- |
| `< 75%` | `light` | `1.00x` | `1.00x` | Yes |
| `75% – 99.9%` | `heavy` | `0.85x` | `1.25x` | Yes |
| `>= 100%` | `overloaded` | `0.50x` | `1.60x` | No |

Effective movement speed combines archetype speed, satiety multiplier, and encumbrance multiplier:

```text
effectiveSpeed = baseSpeed * archetypeSpeedFactor * survival.moveSpeedMultiplier * encumbrance.moveSpeedMultiplier
```

The online backpack has 12 indexed slots. The starting load is four dried minnows, iron claws, a leather jerkin, and a travel pouch. Equipped gear retains its backpack slot and contributes to carried weight. Equipping an item replaces the current gear of that type. The claws add 12 attack power, the jerkin adds 8 defense, and the pouch increases capacity by 3 kg.

### 2.1 Levels and Coins

The server grants 1 XP per 160 pixels of actual movement after collision checks. Each level requires `100 × current level` XP. Excess XP rolls over up to level 100. Each new level adds 5 max HP, 3 max energy, 1 strength, and 1 agility. Current health and energy grow by the same amount as their caps. Each gained level credits 10 coins. Authenticated characters see the balance after the checkpoint transaction commits. Guest progression lasts for the room session.

## 3. Combat Pipeline (PvP & PvE)

When a player triggers an attack:

1. **Cooldown & Energy Check**: Server checks `now >= lastAttackAt + weaponCooldownMs` and `player.energy >= weaponEnergyCost`.
2. **Zone Rule Check**: If target is another player, both players must be in a PvP-enabled area (not a safe zone) and not protected by spawn immunity.
3. **Range & Hit Validation**: Server checks Euclidean distance between attacker and target against `weaponRangePx` plus small latency tolerance.
4. **Damage Resolution**:
   ```text
   rawDamage = weaponBaseDamage + (strength * strengthScaling) + (agility * agilityScaling)
   mitigatedDamage = max(1, round(rawDamage * (100 / (100 + targetDefense))))
   ```
5. **Side Effects**: Deduct attacker energy, apply target HP loss, record `combat_logs` entry on PvP hits or kills, and trigger death/respawn if `target.hp <= 0`.

## 4. Death, Respawn, and Safe Zones

- **Safe Zones** (`oakpaw_village`): PvP attacks against other players are rejected by the server. Passive satiety decay slows down while resting inside a settlement.
- **Death**: Upon reaching `0 HP`, the character enters a defeated state, drops eligible zone-specific loot (subject to PvP zone rules; starter/soulbound gear is protected), and respawns at the nearest settlement waypoint with partial HP/Satiety.

## 5. Quests & Progression

- **Quest States**: `available` -> `active` -> `completed` -> `claimed`.
- **Objectives**: Kill targets, collect items, visit zone landmarks, or craft gear.
- **Rewards**: Experience points (XP), Coins, and items/equipment granted atomically when turning in the quest to the NPC.
