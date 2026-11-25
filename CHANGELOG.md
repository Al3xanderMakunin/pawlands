# Changelog

All notable changes to **Pawlands** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0](https://github.com/Al3xanderMakunin/pawlands/compare/v1.3.0...v1.4.0) (2026-11-25)


### Features

* **gameplay:** добавить выживание и ролевую прогрессию ([5d2e978](https://github.com/Al3xanderMakunin/pawlands/commit/5d2e9788014599b5ba9c024a342ec9c76ef5dd16))
* **multiplayer:** добавить предсказание и сверку движения ([af7babb](https://github.com/Al3xanderMakunin/pawlands/commit/af7babb29248ec79aaf8659ee4fb2b6d16302600))
* **multiplayer:** подключить зональные комнаты и сетевое движение ([dbe3b6f](https://github.com/Al3xanderMakunin/pawlands/commit/dbe3b6f5edb99f970a8a42a8afc4eb6ac6496883))
* **multiplayer:** сохранять состояние персонажа в PostgreSQL ([b07b9ab](https://github.com/Al3xanderMakunin/pawlands/commit/b07b9ab2b96175913c5bc4330f49adb8492f4860))
* перенести выбор языка в настройки аккаунта ([195bb6c](https://github.com/Al3xanderMakunin/pawlands/commit/195bb6cd746b1e0d4b55e533009b6d0cdc0db2d0))

## [1.3.0](https://github.com/Al3xanderMakunin/pawlands/compare/v1.2.0...v1.3.0) (2026-11-25)


### Features

* **admin:** add admin panel, role/ban management, and zone controls ([6dbec50](https://github.com/Al3xanderMakunin/pawlands/commit/6dbec506c4be145421b6f8e6c255155cf5310464))
* **auth:** add Google OAuth login and registration ([5eda364](https://github.com/Al3xanderMakunin/pawlands/commit/5eda364c995a41598ddecab5acd34142a6f1e9ba))
* **auth:** add Sign in with Apple authentication ([af651d5](https://github.com/Al3xanderMakunin/pawlands/commit/af651d5b2aac5dfcead60df351bab03d6966e29d))
* **auth:** add Telegram login and registration ([d0793b8](https://github.com/Al3xanderMakunin/pawlands/commit/d0793b8c742c194d76987a4d96e7060f7c98c611))
* **auth:** add VK ID OAuth 2.1 PKCE login and registration ([1d74c7e](https://github.com/Al3xanderMakunin/pawlands/commit/1d74c7e4a0bc09433e63aa2ec4703fb725180a6f))
* **auth:** add Yandex ID OAuth login and registration ([df2a5b6](https://github.com/Al3xanderMakunin/pawlands/commit/df2a5b6635b0720f8a228d43dd7a9f274f1ea22a))
* **auth:** implement user registration and authentication ([ebc9ccc](https://github.com/Al3xanderMakunin/pawlands/commit/ebc9ccc7f4c5015156f92e9176c10d983b07f914))
* **client:** add interactive HUD minimap ([1efb149](https://github.com/Al3xanderMakunin/pawlands/commit/1efb149b2ce3c4566f3418e9624b96282d9ebab3))
* **client:** add mouse click-to-move navigation ([a0510d6](https://github.com/Al3xanderMakunin/pawlands/commit/a0510d6d47aa14640226e890e9a43e2064013683))
* **client:** add opaque 180x180 Apple Touch Icon and iOS web app meta tags ([5c53bbe](https://github.com/Al3xanderMakunin/pawlands/commit/5c53bbeec00f24098b9fc442549033018e576c8e))
* **client:** add open/close animations for modal windows ([1a92326](https://github.com/Al3xanderMakunin/pawlands/commit/1a9232632ad35e0f192c4dd2a3451351d6fab0f7))
* **client:** add pixel-art paw favicon and web app icons ([013d5de](https://github.com/Al3xanderMakunin/pawlands/commit/013d5de2adde1a30f2824821a21daefb9486fff9))
* **client:** add world selection for starting map ([f27862a](https://github.com/Al3xanderMakunin/pawlands/commit/f27862a76dcc1690a418228b2d9d2fb4d49f5f56))
* **client:** inject all Vite env variables at runtime ([e3b593c](https://github.com/Al3xanderMakunin/pawlands/commit/e3b593cf733c71ac3483c385a0961cbede924ce6))
* **client:** inject VITE_TELEGRAM_BOT_USERNAME at container runtime ([88f6d83](https://github.com/Al3xanderMakunin/pawlands/commit/88f6d83a49371a9c26149ca059a711d68147fd30))
* **client:** добавить движение по касанию карты ([0a89542](https://github.com/Al3xanderMakunin/pawlands/commit/0a895426088c622cbaf40c4121911dfc7811aa44))
* **server:** run database migrations automatically on startup ([4cf2377](https://github.com/Al3xanderMakunin/pawlands/commit/4cf23773d3d54178237c4f8e7bb0697ee3f32fa3))


### Bug Fixes

* **client:** fit character selection modal on mobile Safari ([6861140](https://github.com/Al3xanderMakunin/pawlands/commit/6861140faa2becd7c40788168164c4d453228cd8))
* **client:** make auth modal scrollable on desktop viewports ([5ba6f53](https://github.com/Al3xanderMakunin/pawlands/commit/5ba6f53105c689bcfdb6eaf50907c6f43ae1e34b))
* **client:** pass VITE_TELEGRAM_BOT_USERNAME in Dockerfile and strip leading @ ([2d23d40](https://github.com/Al3xanderMakunin/pawlands/commit/2d23d407a10dbf523af232b2bcddafc8d6f0b750))
* **client:** render touch controls at 1x scale with safe-area insets ([f275005](https://github.com/Al3xanderMakunin/pawlands/commit/f2750057908b9dacd8ae2f599845f6e036ec3140))
* **client:** separate desktop and mobile UI hints and controls ([f40cedb](https://github.com/Al3xanderMakunin/pawlands/commit/f40cedb54d383f649538b9d17b8ffc7c24ae7ab5))
* **server:** add missing Drizzle migration for users OAuth columns ([d003392](https://github.com/Al3xanderMakunin/pawlands/commit/d0033923e3205f6201fa3ad45f4eefbf391b9fcb))


### Performance Improvements

* **build,test:** enable incremental ts builds, split client chunks, and optimize vitest ([accd805](https://github.com/Al3xanderMakunin/pawlands/commit/accd80522ab806e75d124e55e01abdb8d7b8e3b5))

## [1.2.0](https://github.com/Al3xanderMakunin/pawlands/compare/v1.1.0...v1.2.0) (2026-11-25)


### Features

* **client:** add Russian language selection and localization ([13465f5](https://github.com/Al3xanderMakunin/pawlands/commit/13465f5402fcd38c424221cf70466e3fa5938416))


### Bug Fixes

* **client:** use physical key codes for layout-independent input ([f74933c](https://github.com/Al3xanderMakunin/pawlands/commit/f74933c2330a7ad7147fa3069c0ef7f797527fb2))

## [1.1.0](https://github.com/Al3xanderMakunin/pawlands/compare/v1.0.0...v1.1.0) (2026-11-25)


### Features

* **client:** implement Stage 1 Game Core ([6b92b44](https://github.com/Al3xanderMakunin/pawlands/commit/6b92b4452392e1250f3f5e7b2e261c6740d39892))

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
