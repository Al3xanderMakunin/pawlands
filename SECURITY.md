# Security Policy

## Supported Versions

Pawlands is currently in active pre-alpha development on the `main` branch. Security fixes are applied directly to `main`.

## Reporting a Vulnerability

If you discover a security vulnerability, exploit, or server-authority bypass (such as economy duplication, movement speed hacks, auth bypass, or remote code execution):

1. **Do not** open a public GitHub issue with exploit details.
2. Contact the maintainers privately via GitHub Private Vulnerability Reporting (Security Advisories) or direct repository contact.
3. Include clear reproduction steps, affected component (`apps/server`, `apps/client`, `packages/protocol`), and potential impact.

## Security & Anti-Cheat Scope

- Server-authoritative validation for combat, movement, inventory, economy, and quests.
- Input validation with Zod on all REST and WebSocket boundaries.
- Rate limiting and session verification for multiplayer rooms.
