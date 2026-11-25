# AGENTS.md

Instructions for AI coding agents and contributors working in the `pawlands` repository.

## 1. Core Architectural Invariants

1. **Authoritative Server**:
   - The server (`apps/server`) is the single source of truth for movement validation, combat damage, cooldowns, energy/hunger consumption, loot drops, coin balances, inventory weight, and quest progression.
   - Never trust client-supplied damage numbers, stats, coordinates without validation, currencies, or quest completions.
2. **Strict Client Layer Split**:
   - `apps/client/src/game/`: Phaser 4 owns the game loop, tilemap rendering, sprites, animations, camera, physics/visual interpolation, and canvas input.
   - `apps/client/src/components/`, `features/`, `stores/`: React + Tailwind CSS + Zustand own HUD bars, inventory windows, character selection, quest log, chat, and settings.
   - Keep React free of Phaser rendering logic and keep Phaser scenes decoupled from React component trees (communicate via Zustand or typed event bridges).
3. **Modular Monolith Backend**:
   - Fastify (REST API, auth, static metadata) and Colyseus (WebSocket rooms) share one Node.js process in `apps/server`.
   - Keep live tick simulation state in memory inside Colyseus rooms; persist durable state (accounts, inventory, wallets, quest state, periodic character position checkpoints) transactionally in PostgreSQL via Drizzle ORM.
4. **Package Dependency Direction**:
   - `packages/config` and `packages/shared` sit at the base (no dependencies on `apps/*`, `protocol`, or `game-data`).
   - `packages/protocol` and `packages/game-data` may depend on `@pawlands/shared` and `@pawlands/config`.
   - `apps/client` and `apps/server` consume `@pawlands/*` packages. Never import directly between `apps/client` and `apps/server`.

## 2. Coding Standards

- **TypeScript**: Strict mode is enabled globally (`tsconfig.base.json`). Avoid `any`; use explicit interfaces/types or inferred Zod types.
- **Validation**: Every WebSocket message and HTTP API payload must be parsed with Zod schemas defined in `@pawlands/protocol` or route validators.
- **Deterministic Game Logic**: Pure formulas (survival modifiers, encumbrance, damage calculations) belong in `packages/shared` with comprehensive Vitest unit tests so both client prediction and server authority share identical math.
- **Documentation Sync**: When changing protocol messages, database tables, zone configs, or core gameplay formulas, update the corresponding files in `docs/` in the same PR.

## 3. Verification Before Finishing

Run the following checks from the repository root before marking work complete:

```bash
pnpm typecheck
pnpm build
pnpm test
```

## 4. Git Workflow

- After completing a task and passing all verification checks, commit the changes, rebase onto `main`, merge (fast-forward) into `main`, and push `main` to the remote repository (`origin`).
