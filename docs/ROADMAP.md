# Development Roadmap

Progress target: **6 stages / 30 milestones** leading to a public multiplayer Alpha release.

## Stage 1: Game Core (0 / 5)

- [ ] Tilemap rendering with Tiled JSON maps and pixel-art camera
- [ ] Character archetype selection UI (`Tomcat`, `Cat`, `Kitten`)
- [ ] Top-down 4/8-directional movement and sprite animations
- [ ] Static obstacle and tilemap collision handling
- [ ] Responsive mobile touch controls (virtual joystick + action buttons)

## Stage 2: Multiplayer Foundation (0 / 5)

- [ ] Account registration, login, and JWT/session authentication
- [ ] Connecting clients to authoritative Colyseus `ZoneRoom` instances
- [ ] Real-time movement synchronization, prediction, and interpolation
- [ ] Graceful reconnection on mobile/desktop network drops
- [ ] Periodic persistence of character stats and last known zone position

## Stage 3: Survival & RPG Systems (0 / 5)

- [ ] Live Health, Energy, and Hunger (Satiety) simulation loop
- [ ] Backpack inventory slots and real-time carry weight calculation
- [ ] Equipping weapons, armor, and accessories with stat modifiers
- [ ] Internal coin wallet and transactional audit ledger
- [ ] Experience points (XP), leveling up, and stat progression

## Stage 4: PvP & PvE Combat (0 / 5)

- [ ] Server-authoritative melee and ranged combat pipeline
- [ ] Damage calculation, armor mitigation, energy cost, and cooldowns
- [ ] Wildlife/monster NPCs with patrol, aggro, and loot drops
- [ ] Death, respawn, and loot drop rules
- [ ] Safe zones (Settlements) vs. open PvP zones enforcement

## Stage 5: World Content & Social (0 / 5)

- [ ] Quest system (fetch, hunt, explore) with NPC dialogue UI
- [ ] Merchant NPCs for buying supplies and selling loot
- [ ] Basic crafting system (consumables, gear upgrades)
- [ ] All 5 starter zones connected via world portals
- [ ] Zone/global chat, guilds, and social HUD features

## Stage 6: Public Alpha Release (0 / 5)

- [ ] Mobile performance pass (texture atlases, culling, FPS cap, tab pause, PWA)
- [ ] Anti-cheat hardening, rate limiting, and security audit
- [ ] Load testing for concurrent players per `ZoneRoom`
- [ ] Production monitoring, structured logging, and automated DB backups
- [ ] Public Alpha deployment via Docker + Dokploy + Traefik
