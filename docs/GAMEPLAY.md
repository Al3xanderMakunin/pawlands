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

- Eating food restores satiety and can optionally provide short-lived health or energy regeneration buffs.
- Starvation drains health down to 0 HP (resulting in death if not fed in time).

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
