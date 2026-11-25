# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json ./apps/client/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/game-data/package.json ./packages/game-data/package.json
COPY packages/protocol/package.json ./packages/protocol/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter @pawlands/server...

COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/server ./apps/server
RUN pnpm --filter './packages/*' build && pnpm --filter @pawlands/server build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json ./apps/client/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/game-data/package.json ./packages/game-data/package.json
COPY packages/protocol/package.json ./packages/protocol/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile --prod --filter @pawlands/server...

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=2567

COPY --from=prod-deps --chown=node:node /app/package.json ./package.json
COPY --from=prod-deps --chown=node:node /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/packages ./packages
COPY --from=prod-deps --chown=node:node /app/apps/server/package.json ./apps/server/package.json
COPY --from=prod-deps --chown=node:node /app/apps/server/node_modules ./apps/server/node_modules

COPY --from=builder --chown=node:node /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=node:node /app/packages/game-data/dist ./packages/game-data/dist
COPY --from=builder --chown=node:node /app/packages/protocol/dist ./packages/protocol/dist
COPY --from=builder --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=node:node /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=node:node /app/apps/server/drizzle ./apps/server/drizzle

COPY --chown=node:node apps/client/public/assets/maps ./apps/client/public/assets/maps

USER node
EXPOSE 2567

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 2567) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "apps/server/dist/index.js"]
