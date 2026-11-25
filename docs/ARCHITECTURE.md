# Technical Architecture

## 1. High-Level Overview

Pawlands uses a **monorepo modular monolith** architecture written end-to-end in **TypeScript**. A single Node.js backend process hosts both the **Fastify** HTTP API and the **Colyseus** WebSocket game server, while the browser client combines **Phaser 4** (game canvas) with **React 19 + Tailwind CSS + Zustand** (UI overlays).

```text
+-------------------------------------------------------------------+
|                        Browser Client (PWA)                       |
|  +-----------------------------+  +----------------------------+  |
|  |         Phaser 4            |  |    React 19 + Tailwind     |  |
|  | Tilemaps, Sprites, Camera,  |  | HUD, Inventory, Quests,    |  |
|  | Animations, Touch Joystick  |<-+ Chat, Character Select     |  |
|  +--------------+--------------+  +-------------+--------------+  |
|                 |       Zustand Store / Events  |                 |
|                 +---------------+---------------+                 |
|                                 |                                 |
|                    Colyseus SDK (WebSocket) & Fetch (REST)        |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                    Server Process (Node.js LTS)                   |
|  +-----------------------------+  +----------------------------+  |
|  |      Fastify HTTP API       |  |     Colyseus Game Server   |  |
|  | Auth, Zones, Profile, REST  |  | ZoneRoom (20 Hz Tick Loop) |  |
|  +--------------+--------------+  +-------------+--------------+  |
|                 |                               |                 |
|                 +---------------+---------------+                 |
|                                 |                                 |
|          +----------------------+----------------------+          |
|          v                                             v          |
|  +---------------+                             +---------------+  |
|  |  PostgreSQL   |                             |     Redis     |  |
|  | (Drizzle ORM) |                             | Cache/PubSub  |  |
|  +---------------+                             +---------------+  |
+-------------------------------------------------------------------+
```

## 2. Monorepo Workspace Layout

- `apps/client`: Vite + React 19 + Phaser 4 browser application.
- `apps/server`: Node.js LTS server combining Fastify HTTP routes and Colyseus multiplayer rooms.
- `packages/config`: Global simulation rates, server ports, and gameplay tuning constants.
- `packages/shared`: Pure TypeScript domain types and deterministic survival/combat math shared by client and server.
- `packages/protocol`: Zod schemas and message constants defining the WebSocket and API contracts.
- `packages/game-data`: Static game definitions (archetypes, world zones, starter items, quests).

## 3. Authoritative Server Model

In a PvP survival RPG, the server must remain strictly authoritative:

1. **Client Intent Only**: Clients send intent messages (movement vector, attack direction, interact target, equip request) validated with Zod.
2. **Server Simulation**: The Colyseus `ZoneRoom` runs a fixed 20 Hz simulation tick that updates positions, checks collisions, verifies energy/cooldowns, resolves damage, and ticks hunger/regeneration.
3. **State Broadcast**: Colyseus delta-compresses and synchronizes `@colyseus/schema` state patches to connected clients in that zone.
4. **Database Persistence**:
   - **In-Memory**: Real-time coordinates, velocities, active cooldowns, and combat state live in RAM inside `ZoneRoom`.
   - **PostgreSQL (Transactional)**: Inventory mutations, equipment changes, wallet transactions, quest progress, and periodic position checkpoints are committed reliably via Drizzle ORM.

## 4. Zone Scaling Strategy

Each world zone corresponds to a Colyseus room (`ZoneRoom`). On launch, all rooms run inside a single server process. When player concurrency grows, Redis presence and room routing allow distributing specific zones across multiple Node.js instances without rewriting game logic.

## 5. Asset Pipeline & Mobile Performance

- **World Maps**: Authored in **Tiled** (`.tmj`/`.tmx`) with separate layers for ground, obstacles/collisions, spawn points, and zone portals.
- **Sprites & Animations**: Authored in **Aseprite** and packed into texture atlases (`.png` + JSON atlas) to minimize WebGL draw calls.
- **Mobile Optimization**:
  - Texture atlases and nearest-neighbor pixel filtering (`pixelArt: true`).
  - Camera frustum culling and chunked/zone-based map loading.
  - Configurable FPS cap (e.g., 60 FPS desktop, battery-aware on mobile).
  - Automatic pause/throttle of non-essential rendering when the browser tab is backgrounded.

## 6. Deployment Topology

- **Local Development**: `docker-compose.yml` provisions PostgreSQL 17 and Redis 7; `pnpm dev` runs Vite HMR and `tsx watch`.
- **Production**: Containerized client (static assets / CDN) and server deployed on **Ubuntu LTS** via **Dokploy + Traefik** with TLS termination and optional **Cloudflare R2** for asset/CDN offloading.
