# Changelog

All notable changes to **Pawlands** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0](https://github.com/Al3xanderMakunin/pawlands/compare/v0.1.0...v1.0.0) (2026-11-25)


### Features

* add release-please and GHCR Docker image workflows ([6af4853](https://github.com/Al3xanderMakunin/pawlands/commit/6af4853a299d12f0711f420cf0d2b0ea3e76861f))


### Bug Fixes

* **ts:** resolve workspace packages via paths for clean typecheck ([f9966e9](https://github.com/Al3xanderMakunin/pawlands/commit/f9966e9e5ad95d9f9c1e7560efb9de487b8b65cd))

## [Unreleased]

### Added

- Initial repository documentation (`GDD.md`, `ARCHITECTURE.md`, `GAMEPLAY.md`, `NETWORKING.md`, `DATABASE.md`, `ROADMAP.md`, `AGENTS.md`).
- Monorepo workspace structure with `@pawlands/config`, `@pawlands/shared`, `@pawlands/protocol`, and `@pawlands/game-data`.
- Fastify + Colyseus authoritative server skeleton and Drizzle PostgreSQL schema foundation.
- Phaser 4 + React + Tailwind CSS + Zustand client shell with PWA manifest.
- Docker Compose local stack (PostgreSQL 17, Redis 7) and GitHub Actions CI workflow.
