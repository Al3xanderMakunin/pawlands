# Pawlands — Game Design Document (GDD)

## 1. Vision & Core Pillars

**Pawlands** is an open-source, multiplayer-first 2D pixel-art survival RPG set in an open world inhabited by cats. Players choose an archetype at character creation, explore interconnected zones, gather resources, equip weapons and gear, manage survival needs, complete quests, trade with coins, and fight PvE enemies or other players in real-time PvP.

### Core Pillars

1. **Multiplayer-First Open World**: Built from day one around authoritative server simulation and shared zones rather than retrofitting networking onto a single-player game.
2. **Meaningful Survival Loop**: Hunger (satiety), energy, health, and carry weight interact dynamically so preparation and resource management matter in exploration and PvP.
3. **Accessible Cross-Platform Play**: Smooth browser experience on both desktop (keyboard + mouse) and mobile (touch joystick + action buttons, installable PWA).
4. **Feline Identity & Progression**: Distinct starting archetypes (`Tomcat`, `Cat`, `Kitten`) with clear strengths and future decoupling between visual appearance and combat specialization.

## 2. Perspective & Visual Direction

- **Perspective**: Top-down 2D (similar to classic action RPGs and survival sandboxes) to support open-world exploration, multi-directional PvP spacing, and dungeon layouts.
- **Art Style**: Crisp 2D pixel art authored in Aseprite and assembled into tilemaps via Tiled.
- **Rendering**: Integer/pixelated scaling (`image-rendering: pixelated`) with texture atlases for fast GPU batching on mobile and desktop browsers.

## 3. Playable Characters & Starting Archetypes

At character creation, the player chooses one of three starting feline archetypes:

| Attribute | Tomcat (`tomcat`) | Cat (`cat`) | Kitten (`kitten`) |
| --- | --- | --- | --- |
| Identity | Strength, endurance, high carry capacity | Agility, speed, evasion | Mobility, stealth, high stamina |
| Health (HP) | 120 | 100 | 80 |
| Energy | 100 | 120 | 140 |
| Satiety | 100 | 100 | 100 |
| Strength | 12 | 10 | 7 |
| Agility | 8 | 12 | 15 |
| Base Speed | 100% | 110% | 120% |
| Max Carry Weight | 25 kg | 20 kg | 12 kg |

> **Future Evolution**: Visual appearance (coat pattern, fur color, body type) will later be separated from combat class/talent specialization so players can customize looks independently of playstyle.

## 4. Survival & RPG Systems

### 4.1 Health, Energy, and Hunger (Satiety)

- **Health**: Determines survivability in combat and environmental hazards. Reaches 0 -> death & respawn rules apply.
- **Energy**: Consumed by attacks, sprinting/dashing, and active skills. Regenerates passively at a rate governed by Satiety.
- **Satiety (Hunger)**: Gradually decays over time and faster during strenuous actions. Restored by eating food items. Low satiety throttles energy regeneration and movement speed; 0% satiety causes starvation health drain.

### 4.2 Inventory & Carry Weight

- Every item (weapons, armor, consumables, materials, quest items) has an individual weight in kilograms (`kg`) and optional stack limit.
- Total carried weight is checked against the character's `maxCarryWeightKg`.
- Exceeding safe weight thresholds slows movement and increases energy cost, forcing meaningful trade-offs between loot greed and combat mobility.

### 4.3 Equipment & Gear

Players equip items across dedicated slots:
- `weapon` (claws, daggers, staves, bows/slings)
- `head` (hoods, helmets, bandanas)
- `body` (tunics, leather vests, mail)
- `paws` (wraps, boots, spiked greaves)
- `accessory` (collars, charms, pouches expanding carry weight)

### 4.4 Economy & Coins

- **Coins** are the primary internal currency earned from quests, monster drops, selling loot to merchants, and player trading/marketplace listings.
- All coin transfers are processed via server-side PostgreSQL transactions with an immutable `wallet_transactions` audit ledger.

## 5. Open World & Zone Architecture

Instead of one monolithic seamless map, the world is composed of interconnected **Zones**, each hosted as an isolated Colyseus room:

| Zone ID | Name | Type | PvP Enabled | Description |
| --- | --- | --- | --- | --- |
| `oakpaw_village` | Oakpaw Village | Settlement | No (Safe) | Starting hub with quest NPCs, merchants, crafting stations, and storage. |
| `whispering_woods` | Whispering Woods | Forest | Optional / Flagged | Resource gathering, forageables, wildlife, and beginner quests. |
| `clawpeak_ridge` | Clawpeak Ridge | Mountains | Optional / Flagged | Mineral nodes, rocky paths, mid-tier predators, and shortcuts. |
| `sunken_crypt` | Sunken Crypt | Dungeon | Yes | High-risk dungeon encounters, elite enemies, and rare equipment drops. |
| `bloodclaw_wilds` | Bloodclaw Wilds | PvP Wilds | Yes (Open PvP) | Contested open-world PvP territory with high-value resources and bounties. |

## 6. Combat, PvP, and Quests

- **Combat**: Real-time top-down melee and ranged attacks validated on the server (range, cooldown, line-of-sight/hitbox, energy cost, armor mitigation).
- **PvP Rules**: Settlements are strictly non-PvP safe zones. Contested zones enable PvP combat with clear visual indicators and combat logging.
- **Quests**: Structured into fetch, hunt, explore, and delivery objectives tracked server-side per character, awarding coins, XP, and equipment.

## 7. Cross-Platform Controls & UX

| Action | Desktop | Mobile (Touch) |
| --- | --- | --- |
| Move | `WASD` / Arrow Keys | Virtual left thumbstick |
| Attack | Left Mouse Click | Primary attack button |
| Interact / Pickup | `E` | Context-sensitive action button |
| Inventory | `I` or `Tab` | Backpack HUD button |
| World Map | `M` | Map HUD button |
| Quick Slots | `1` – `6` | Quick-bar touch strip |
| Chat | `Enter` | Chat toggle button |

- **Orientation**: Landscape is the primary mobile layout, with responsive HUD adaptation for portrait mode.
- **PWA**: Installable via Web App Manifest on Android and iOS home screens; online connection is required for multiplayer play.
