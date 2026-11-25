import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { WORLD_ZONES } from "@pawlands/game-data";
import { registerAuthRoutes } from "./api/authRoutes.js";
import { DrizzleAuthRepository, type AuthRepository } from "./auth/authRepository.js";
import { AuthService } from "./auth/authService.js";
import {
  FetchGoogleOAuthClient,
  resolveAppUrl,
  resolveGoogleOAuthConfig,
  type GoogleOAuthClient,
  type GoogleOAuthConfig,
} from "./auth/googleOAuth.js";
import { resolveJwtSecret } from "./auth/jwt.js";

export interface CreateAppOptions {
  authRepository?: AuthRepository;
  jwtSecret?: string;
  corsOrigin?: string | boolean;
  appUrl?: string;
  googleOAuthConfig?: GoogleOAuthConfig | null;
  googleOAuthClient?: GoogleOAuthClient;
  logger?: boolean;
}

export async function createApp(options: CreateAppOptions = {}): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: options.logger ?? true });

  await fastify.register(cors, {
    origin: options.corsOrigin ?? process.env.CORS_ORIGIN ?? true,
  });

  fastify.get("/health", async () => ({
    status: "ok",
    service: "pawlands-server",
    timestamp: new Date().toISOString(),
  }));

  fastify.get("/api/v1/zones", async () => ({
    zones: WORLD_ZONES,
  }));

  const authRepository = options.authRepository ?? new DrizzleAuthRepository();
  const jwtSecret = options.jwtSecret ?? resolveJwtSecret();
  const authService = new AuthService(authRepository, jwtSecret);
  const googleOAuthConfig =
    options.googleOAuthConfig === undefined
      ? resolveGoogleOAuthConfig()
      : options.googleOAuthConfig;
  const googleOAuthClient = options.googleOAuthClient ?? new FetchGoogleOAuthClient();
  const appUrl = resolveAppUrl(options.appUrl);

  await registerAuthRoutes(fastify, authService, {
    jwtSecret,
    appUrl,
    googleOAuthConfig,
    googleOAuthClient,
  });

  return fastify;
}
