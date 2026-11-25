# Changelog

All notable changes to **Pawlands** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial repository documentation (`GDD.md`, `ARCHITECTURE.md`, `GAMEPLAY.md`, `NETWORKING.md`, `DATABASE.md`, `ROADMAP.md`, `AGENTS.md`).
- Monorepo workspace structure with `@pawlands/config`, `@pawlands/shared`, `@pawlands/protocol`, and `@pawlands/game-data`.
- Fastify + Colyseus authoritative server skeleton and Drizzle PostgreSQL schema foundation.
- Phaser 4 + React + Tailwind CSS + Zustand client shell with PWA manifest.
- Docker Compose local stack (PostgreSQL 17, Redis 7) and GitHub Actions CI workflow.
