# Contributing to Pawlands

Thank you for your interest in contributing to **Pawlands**!

## Getting Started

1. Fork the repository and create a feature branch from `main` (e.g. `feat/survival-hunger-tick`, `fix/zone-transition`).
2. Copy `.env.example` to `.env` and start local dependencies:
   ```bash
   docker compose up -d
   pnpm install
   ```
3. Review [AGENTS.md](AGENTS.md) and the design docs under `docs/` before making architectural changes.

## Pull Request Guidelines

- Keep pull requests focused on a single feature, bugfix, or documentation improvement.
- Put shared types, pure formulas, and network schemas in `packages/shared` and `packages/protocol`.
- Add or update Vitest unit tests for gameplay formulas, protocol validation, and server logic.
- Ensure all workspace checks pass locally before submitting:
  ```bash
  pnpm typecheck
  pnpm build
  pnpm test
  ```
- Update `CHANGELOG.md` under `[Unreleased]` for notable changes.

## Art, Audio, and World Assets

- Placeholders and open assets must specify their origin and license.
- Pixel-art spritesheets (Aseprite) and maps (Tiled) belong in `assets/` and should optimize for texture atlases and mobile browser performance.
