# Networking & Protocol Specification

## 1. Transport & Room Model

Pawlands uses **Colyseus** over **WebSocket** for real-time gameplay and **Fastify** over HTTPS/HTTP for authentication, character selection, and static/REST queries.

- **One Room per Zone**: Each world zone (e.g., `oakpaw_village`, `whispering_woods`, `bloodclaw_wilds`) is managed by a Colyseus `ZoneRoom` instance.
- **Tick Rate**: The server simulation runs at **20 Hz** (`50 ms` per tick), broadcasting delta-compressed state updates via `@colyseus/schema`.

## 2. Authentication & Session Handshake

1. Client authenticates via Fastify REST endpoints and receives a signed HS256 JWT session token:
   - `POST /api/v1/auth/register` (`RegisterRequestSchema`: `{ email, username, password }`) -> `201 { token, user }`
   - `POST /api/v1/auth/login` (`LoginRequestSchema`: `{ identifier, password }`) -> `200 { token, user }`
   - `POST /api/v1/auth/telegram` (`TelegramAuthRequestSchema`: Telegram Login Widget payload `{ id, first_name, last_name?, username?, photo_url?, auth_date, hash }`) -> `200 { token, user }` (creates an account on first login or signs in an existing Telegram-linked account)
   - `GET /api/v1/auth/me` (`Authorization: Bearer <token>`) -> `200 { user }`
   - `POST /api/v1/auth/logout` -> `200 { ok: true }`
   - `GET /api/v1/auth/google` -> `302` redirect to Google OAuth 2.0 consent screen (or `503 GOOGLE_AUTH_NOT_CONFIGURED`)
   - `GET /api/v1/auth/google/callback` -> exchanges authorization code, creates/links account, and redirects to `APP_URL/#auth_token=<jwt>` (or `#auth_error=<code>`)
2. Client requests to join a `ZoneRoom` (`roomName = "zone"`) with `{ zoneId, name, archetype, token }` validated by `JoinZoneOptionsSchema`.
3. `ZoneRoom.onAuth` verifies the optional session token and attaches the authenticated user claims before spawning the player entity in `ZoneState`.

## 3. Protocol Contracts (`@pawlands/protocol`)

All client-to-server messages are parsed with **Zod** schemas before affecting simulation state.

### 3.1 Client -> Server Messages

| Message Type | Schema | Purpose |
| --- | --- | --- |
| `input:move` | `MoveInputSchema` | Directional vector (`dx`, `dy` clamped `[-1, 1]`), `sprint` boolean, monotonic `seq`. |
| `input:attack` | `AttackInputSchema` | Attack aim angle (`aimX`, `aimY`) and optional `targetId`. |
| `input:interact` | `InteractInputSchema` | Interact with NPC, loot container, resource node, or zone portal (`targetId`). |
| `input:use_item` | `UseItemInputSchema` | Use consumable/quick-slot item (`slotIndex`). |

### 3.2 Server -> Client Messages & Schema State

- **Synchronized `ZoneState`**:
  - `zoneId`: current zone identifier
  - `players`: `MapSchema<PlayerState>` (`id`, `name`, `archetype`, `x`, `y`, `facing`, `hp`, `maxHp`, `energy`, `maxEnergy`, `satiety`, `isAlive`)
- **Targeted Event Messages**:
  - `combat:hit`: visual hit confirmation, damage number, crit flag
  - `system:notice`: server notices (safe zone entered, overloaded, insufficient energy)
  - `zone:transfer`: instructs client to smoothly reconnect into an adjacent `ZoneRoom`

## 4. Prediction, Interpolation, and Reconnection

- **Local Player**: Client applies immediate local movement prediction using the shared speed formula from `@pawlands/shared`, reconciling with authoritative server `x, y` snapshots.
- **Remote Players & NPCs**: Client interpolates between consecutive server snapshots (`~100 ms` render buffer) for smooth 60 FPS visuals despite a 20 Hz network tick.
- **Reconnection**: Colyseus `allowReconnection` holds the player seat briefly on transient mobile network drops so players do not lose room state immediately.

## 5. Rate Limiting & Anti-Cheat

- Reject malformed or out-of-range payloads immediately via Zod (`safeParse`).
- Clamp movement delta per tick against server-computed `effectiveSpeed` + tolerance to prevent speed hacks.
- Rate-limit `input:move` and `input:attack` frequency per `sessionId`.
- Never send hidden server data (other players' private inventories, hidden loot tables) to clients.
