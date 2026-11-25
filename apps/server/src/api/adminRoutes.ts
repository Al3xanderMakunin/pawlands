import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AuthUser } from "@pawlands/protocol";
import {
  AdminUpdateUserRequestSchema,
  AdminUpdateZoneRequestSchema,
  AdminUsersQuerySchema,
} from "@pawlands/protocol";
import { AdminError, type AdminService } from "../admin/adminService.js";
import { AuthError, type AuthService } from "../auth/authService.js";
import { extractBearerToken } from "./authHelpers.js";

function handleAdminRouteError(err: unknown, reply: FastifyReply, request: FastifyRequest) {
  if (err instanceof AdminError) {
    return reply.code(err.statusCode).send({
      error: err.code,
      message: err.message,
    });
  }

  if (err instanceof AuthError) {
    return reply.code(err.statusCode).send({
      error: err.code === "ACCOUNT_BANNED" ? "FORBIDDEN" : err.code,
      message: err.message,
    });
  }

  request.log.error(err, "Unhandled admin route error");
  return reply.code(500).send({
    error: "INTERNAL_ERROR",
    message: "Internal server error",
  });
}

async function requireAdminUser(
  request: FastifyRequest,
  reply: FastifyReply,
  authService: AuthService
): Promise<AuthUser | null> {
  const token = extractBearerToken(request);
  if (!token) {
    await reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "Missing bearer token",
    });
    return null;
  }

  const user = await authService.getCurrentUser(token);
  if (user.role !== "admin") {
    await reply.code(403).send({
      error: "FORBIDDEN",
      message: "Administrator access required",
    });
    return null;
  }

  return user;
}

export async function registerAdminRoutes(
  fastify: FastifyInstance,
  authService: AuthService,
  adminService: AdminService
): Promise<void> {
  fastify.get("/api/v1/admin/stats", async (request, reply) => {
    try {
      const admin = await requireAdminUser(request, reply, authService);
      if (!admin) return;

      const stats = await adminService.getStats();
      return reply.code(200).send(stats);
    } catch (err) {
      return handleAdminRouteError(err, reply, request);
    }
  });

  fastify.get("/api/v1/admin/users", async (request, reply) => {
    try {
      const admin = await requireAdminUser(request, reply, authService);
      if (!admin) return;

      const parsed = AdminUsersQuerySchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        return reply.code(400).send({
          error: "VALIDATION_ERROR",
          message: "Invalid user query parameters",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const result = await adminService.listUsers(parsed.data);
      return reply.code(200).send(result);
    } catch (err) {
      return handleAdminRouteError(err, reply, request);
    }
  });

  fastify.patch<{ Params: { userId: string } }>(
    "/api/v1/admin/users/:userId",
    async (request, reply) => {
      try {
        const admin = await requireAdminUser(request, reply, authService);
        if (!admin) return;

        const parsed = AdminUpdateUserRequestSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({
            error: "VALIDATION_ERROR",
            message: "Invalid user update payload",
            details: parsed.error.flatten().fieldErrors,
          });
        }

        const user = await adminService.updateUser(admin.id, request.params.userId, parsed.data);
        return reply.code(200).send({ user });
      } catch (err) {
        return handleAdminRouteError(err, reply, request);
      }
    }
  );

  fastify.get("/api/v1/admin/zones", async (request, reply) => {
    try {
      const admin = await requireAdminUser(request, reply, authService);
      if (!admin) return;

      const zones = await adminService.listZones();
      return reply.code(200).send({ zones });
    } catch (err) {
      return handleAdminRouteError(err, reply, request);
    }
  });

  fastify.patch<{ Params: { zoneId: string } }>(
    "/api/v1/admin/zones/:zoneId",
    async (request, reply) => {
      try {
        const admin = await requireAdminUser(request, reply, authService);
        if (!admin) return;

        const parsed = AdminUpdateZoneRequestSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({
            error: "VALIDATION_ERROR",
            message: "Invalid zone update payload",
            details: parsed.error.flatten().fieldErrors,
          });
        }

        const zone = await adminService.updateZone(request.params.zoneId, parsed.data);
        return reply.code(200).send({ zone });
      } catch (err) {
        return handleAdminRouteError(err, reply, request);
      }
    }
  );
}
