# Networking & Protocol Specification

## 1. Transport & Room Model

Pawlands uses **Colyseus** over **WebSocket** for real-time gameplay and **Fastify** over HTTPS/HTTP for authentication, character selection, and static/REST queries.

- **Zone Matchmaking**: Colyseus filters `ZoneRoom` matchmaking by `zoneId`. A full room can have another instance of the same zone.
- **Tick Rate**: The server simulation runs at **20 Hz** (`50 ms` per tick), with delta-compressed state updates via `@colyseus/schema`.

## 2. Authentication & Session Handshake

1. Client authenticates via Fastify REST endpoints and receives a signed HS256 JWT session token:
   - `GET /api/v1/auth/providers` -> `200 { apple: { enabled, clientId } }`
   - `POST /api/v1/auth/register` (`RegisterRequestSchema`: `{ email, username, password }`) -> `201 { token, user }`
   - `POST /api/v1/auth/login` (`LoginRequestSchema`: `{ identifier, password }`) -> `200 { token, user }`
   - `POST /api/v1/auth/telegram` (`TelegramAuthRequestSchema`: Telegram Login Widget payload `{ id, first_name, last_name?, username?, photo_url?, auth_date, hash }`) -> `200 { token, user }` (creates an account on first login or signs in an existing Telegram-linked account)
   - `POST /api/v1/auth/apple` (`AppleAuthRequestSchema`: `{ idToken, nonce?, fullName? }`) -> `200 { token, user }`
   - `POST /api/v1/auth/vk` (`VkAuthRequestSchema`: `{ code, deviceId, codeVerifier, redirectUri }`) -> `200 { token, user }` (VK ID OAuth 2.1 PKCE exchange)
   - `GET /api/v1/auth/me` (`Authorization: Bearer <token>`) -> `200 { user }`
   - `POST /api/v1/auth/logout` -> `200 { ok: true }`
   - `GET /api/v1/auth/google` -> `302` redirect to Google OAuth 2.0 consent screen (or `503 GOOGLE_AUTH_NOT_CONFIGURED`)
   - `GET /api/v1/auth/google/callback` -> exchanges authorization code, creates/links account, and redirects to `APP_URL/#auth_token=<jwt>` (or `#auth_error=<code>`)
2. Client requests to join a `ZoneRoom` (`roomName = "zone"`) with `{ zoneId, name, archetype, token }` validated by `JoinZoneOptionsSchema`.
3. `ZoneRoom.onAuth` rejects invalid options and expired tokens. When a token is supplied, the server loads the account and rejects missing or banned users. Guest sessions are supported.
4. Choose **Play online** to join the selected zone. Set `VITE_WS_URL` to the service origin that exposes both HTTP matchmaking and WebSocket upgrades. The offline entry path runs locally.

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
  - `players`: `MapSchema<PlayerState>` (`id`, `name`, `archetype`, `x`, `y`, `hp`, `maxHp`, `energy`, `maxEnergy`, `satiety`)
- **Targeted Event Messages**:
  - `combat:hit`: visual hit confirmation, damage number, crit flag
  - `system:notice`: server notices (safe zone entered, overloaded, insufficient energy)
  - `zone:transfer`: instructs client to smoothly reconnect into an adjacent `ZoneRoom`

## 4. Prediction, Interpolation, and Reconnection

- **Online movement**: Clients send input at up to 20 Hz. The server discards stale sequences, expires input after 250 ms of silence, and validates each movement step against the bounds and obstacles of the same Tiled map used by Phaser.
- **Rendering**: The client smooths both local and remote sprites toward the latest server coordinates. Client prediction and reconciliation are planned.
- **Reconnection**: Colyseus `allowReconnection` holds the player seat and position for 15 seconds on an unexpected drop. Movement stops during the drop. When the SDK exhausts reconnection, the client returns to the world selection dialog.

## 5. Rate Limiting & Anti-Cheat

- Reject malformed or out-of-range payloads immediately via Zod (`safeParse`).
- Cap simulated time per movement tick and use server-owned speed and collision checks.
- The simulation consumes at most one movement intent per player per tick. Message-level rate limits are planned.
- Never send hidden server data (other players' private inventories, hidden loot tables) to clients.
