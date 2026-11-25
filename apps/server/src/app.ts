import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { WORLD_ZONES } from "@pawlands/game-data";
import { DrizzleAdminRepository, type AdminRepository } from "./admin/adminRepository.js";
import { AdminService } from "./admin/adminService.js";
import { registerAdminRoutes } from "./api/adminRoutes.js";
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
import { resolveTelegramBotToken } from "./auth/telegram.js";
import {
  resolveYandexOAuthConfig,
  YandexOAuthClient,
  type YandexOAuthProvider,
} from "./auth/yandexOAuth.js";

export interface CreateAppOptions {
  authRepository?: AuthRepository;
  adminRepository?: AdminRepository;
  yandexOAuth?: YandexOAuthProvider;
  jwtSecret?: string;
  telegramBotToken?: string;
  corsOrigin?: string | boolean;
  appUrl?: string;
  clientUrl?: string;
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
  const adminRepository = options.adminRepository ?? new DrizzleAdminRepository();
  const jwtSecret = options.jwtSecret ?? resolveJwtSecret();
  const telegramBotToken = options.telegramBotToken ?? resolveTelegramBotToken();
  const authService = new AuthService(authRepository, jwtSecret, telegramBotToken);
  const googleOAuthConfig =
    options.googleOAuthConfig === undefined
      ? resolveGoogleOAuthConfig()
      : options.googleOAuthConfig;
  const googleOAuthClient = options.googleOAuthClient ?? new FetchGoogleOAuthClient();
  const appUrl = resolveAppUrl(options.appUrl);
  const adminService = new AdminService(adminRepository);
  const yandexOAuth = options.yandexOAuth ?? new YandexOAuthClient(resolveYandexOAuthConfig());

  await registerAuthRoutes(fastify, authService, {
    jwtSecret,
    appUrl,
    clientUrl: options.clientUrl,
    googleOAuthConfig,
    googleOAuthClient,
    yandexOAuth,
  });
  await registerAdminRoutes(fastify, authService, adminService);

  return fastify;
}
