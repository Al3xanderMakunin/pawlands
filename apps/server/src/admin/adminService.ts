import type {
  AdminErrorCode,
  AdminStats,
  AdminUpdateUserRequest,
  AdminUpdateZoneRequest,
  AdminUserSummary,
  AdminUsersQuery,
  AdminZoneSummary,
} from "@pawlands/protocol";
import type { AdminRepository } from "./adminRepository.js";

export class AdminError extends Error {
  readonly code: AdminErrorCode;
  readonly statusCode: number;

  constructor(code: AdminErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = "AdminError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AdminService {
  constructor(private readonly repository: AdminRepository) {}

  async getStats(): Promise<AdminStats> {
    return this.repository.getStats();
  }

  async listUsers(query: AdminUsersQuery): Promise<{ users: AdminUserSummary[]; total: number }> {
    return this.repository.listUsers(query);
  }

  async updateUser(
    actorUserId: string,
    targetUserId: string,
    patch: AdminUpdateUserRequest
  ): Promise<AdminUserSummary> {
    if (actorUserId === targetUserId) {
      if (patch.isBanned === true || (patch.role !== undefined && patch.role !== "admin")) {
        throw new AdminError(
          "CANNOT_MODIFY_SELF",
          "Administrators cannot ban or demote their own account",
          400
        );
      }
    }

    const updated = await this.repository.updateUser(targetUserId, patch);
    if (!updated) {
      throw new AdminError("NOT_FOUND", "User not found", 404);
    }

    return updated;
  }

  async listZones(): Promise<AdminZoneSummary[]> {
    return this.repository.listZones();
  }

  async updateZone(zoneId: string, patch: AdminUpdateZoneRequest): Promise<AdminZoneSummary> {
    const updated = await this.repository.updateZone(zoneId, patch);
    if (!updated) {
      throw new AdminError("NOT_FOUND", "Zone not found", 404);
    }

    return updated;
  }
}
