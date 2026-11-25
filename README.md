# Pawlands

Open-source multiplayer 2D pixel-art survival RPG featuring cats, an open world, real-time PvP, quests, crafting, and exploration. Playable on desktop and mobile browsers.

## Key Features

- **Multiplayer-First Open World**: Zone-based world architecture powered by authoritative Colyseus rooms (`Settlement`, `Forest`, `Mountains`, `Dungeon`, `PvP Wilds`).
- **Playable Feline Archetypes**: Start as a **Tomcat** (strength & carry capacity), **Cat** (agility & balanced combat), or **Kitten** (mobility & evasion).
- **Interconnected Survival Mechanics**: Health, energy, hunger (satiety), and carry weight directly affect stamina recovery, movement speed, and survival.
- **RPG & PvP Progression**: Weapons, armor, inventory management, internal coin economy, quests, crafting, and safe vs. PvP-enabled zones.
- **Cross-Platform Browser UX**: Top-down 2D pixel art with keyboard + mouse controls on desktop and virtual joystick + touch controls (PWA-ready) on mobile devices.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript (monorepo via pnpm workspaces) |
| Game Engine | Phaser 4 |
| UI & State | React 19, Tailwind CSS, Zustand, i18next |
| Bundler | Vite |
| Game Server | Colyseus (WebSocket) |
| Backend API | Fastify on Node.js LTS |
| Validation | Zod |
| Database & ORM | PostgreSQL + Drizzle ORM |
| Cache & Scaling | Redis |
| World & Art Tools | Tiled + Aseprite |
| Testing | Vitest + Playwright |
| Deployment | Docker Compose + Dokploy + Traefik |

## Repository Structure

```text
pawlands/
├── apps/
│   ├── client/          # Phaser 4 game client + React HUD (PWA)
│   └── server/          # Fastify REST API + Colyseus authoritative game server
├── packages/
│   ├── config/          # Shared simulation & server constants
│   ├── shared/          # Domain types and pure survival/RPG formulas
│   ├── protocol/        # WebSocket message types and Zod contracts
│   └── game-data/       # Archetype stats, world zones, starter item definitions
├── assets/              # Sprites, tilesets, Tiled maps, audio, fonts
├── docs/                # GDD, Architecture, Gameplay, Networking, Database, Roadmap
├── infrastructure/      # Deployment & infrastructure configuration
├── tests/               # End-to-end and integration test suites
└── .github/workflows/   # CI pipelines
```

## Quick Start

### Prerequisites

- Node.js 22+ (LTS)
- pnpm 10+
- Docker & Docker Compose (for local PostgreSQL and Redis)

### Local Setup

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm build
pnpm dev
```

- Client dev server: `http://localhost:5173`
- Game & API server: `http://localhost:2567` (healthcheck: `GET /health`, zones: `GET /api/v1/zones`)

### Useful Commands

```bash
pnpm typecheck   # Typecheck all packages and apps
pnpm build       # Build shared packages, server, and client bundle
pnpm test        # Run unit tests across workspaces
pnpm clean       # Remove dist build artifacts
```

## Documentation

- [Game Design Document](docs/GDD.md)
- [Technical Architecture](docs/ARCHITECTURE.md)
- [Gameplay & Survival Formulas](docs/GAMEPLAY.md)
- [Networking & Protocol](docs/NETWORKING.md)
- [Database Schema](docs/DATABASE.md)
- [Development Roadmap](docs/ROADMAP.md)
- [AI Agent Guidelines](AGENTS.md)

## Contributing & License

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md) before opening a pull request.

Source code in this repository is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** — see [LICENSE](LICENSE). Game art assets, audio, logos, and branding may be distributed under separate terms as noted per asset directory.
