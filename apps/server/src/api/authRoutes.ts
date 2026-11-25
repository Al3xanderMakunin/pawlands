import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { LoginRequestSchema, RegisterRequestSchema } from "@pawlands/protocol";
import { AuthError, type AuthService } from "../auth/authService.js";

function extractBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token.trim() || null;
}

function handleAuthRouteError(err: unknown, reply: FastifyReply, request: FastifyRequest) {
  if (err instanceof AuthError) {
    return reply.code(err.statusCode).send({
      error: err.code,
      message: err.message,
    });
  }

  request.log.error(err, "Unhandled authentication error");
  return reply.code(500).send({
    error: "INTERNAL_ERROR",
    message: "Internal server error",
  });
}

export async function registerAuthRoutes(
  fastify: FastifyInstance,
  authService: AuthService
): Promise<void> {
  fastify.post("/api/v1/auth/register", async (request, reply) => {
    const parsed = RegisterRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid registration data",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await authService.register(parsed.data);
      return reply.code(201).send(result);
    } catch (err) {
      return handleAuthRouteError(err, reply, request);
    }
  });

  fastify.post("/api/v1/auth/login", async (request, reply) => {
    const parsed = LoginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid login credentials format",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await authService.login(parsed.data);
      return reply.code(200).send(result);
    } catch (err) {
      return handleAuthRouteError(err, reply, request);
    }
  });

  fastify.get("/api/v1/auth/me", async (request, reply) => {
    const token = extractBearerToken(request);
    if (!token) {
      return reply.code(401).send({
        error: "UNAUTHORIZED",
        message: "Missing bearer token",
      });
    }

    try {
      const user = await authService.getCurrentUser(token);
      return reply.code(200).send({ user });
    } catch (err) {
      return handleAuthRouteError(err, reply, request);
    }
  });

  fastify.post("/api/v1/auth/logout", async (_request, reply) => {
    return reply.code(200).send({ ok: true });
  });
}
