import {
  AdminStatsSchema,
  AdminUpdateUserResponseSchema,
  AdminUpdateZoneResponseSchema,
  AdminUsersListResponseSchema,
  AdminZonesListResponseSchema,
  type AdminErrorCode,
  type AdminStats,
  type AdminUpdateUserRequest,
  type AdminUpdateZoneRequest,
  type AdminUserSummary,
  type AdminUsersListResponse,
  type AdminUsersQuery,
  type AdminZoneSummary,
} from "@pawlands/protocol";

const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:2567").replace(/\/+$/, "");

export class AdminApiError extends Error {
  readonly code: AdminErrorCode | "NETWORK_ERROR";
  readonly status?: number;

  constructor(
    code: AdminErrorCode | "NETWORK_ERROR",
    message: string,
    status?: number
  ) {
    super(message);
    this.name = "AdminApiError";
    this.code = code;
    this.status = status;
  }
}

async function parseErrorResponse(response: Response): Promise<AdminApiError> {
  try {
    const data = (await response.json()) as { error?: unknown; message?: unknown };
    const code =
      typeof data.error === "string"
        ? (data.error as AdminErrorCode)
        : "INTERNAL_ERROR";
    const message =
      typeof data.message === "string"
        ? data.message
        : `Request failed with status ${response.status}`;
    return new AdminApiError(code, message, response.status);
  } catch {
    return new AdminApiError(
      "INTERNAL_ERROR",
      `Request failed with status ${response.status}`,
      response.status
    );
  }
}

async function requestAdmin(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
  } catch {
    throw new AdminApiError("NETWORK_ERROR", "Unable to reach server");
  }
}

export async function fetchAdminStats(token: string): Promise<AdminStats> {
  const response = await requestAdmin("/api/v1/admin/stats", token, { method: "GET" });
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  return AdminStatsSchema.parse(await response.json());
}

export async function fetchAdminUsers(
  token: string,
  query: Partial<AdminUsersQuery> = {}
): Promise<AdminUsersListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.role) params.set("role", query.role);
  if (query.bannedOnly) params.set("bannedOnly", "true");
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));

  const qs = params.toString();
  const path = qs ? `/api/v1/admin/users?${qs}` : "/api/v1/admin/users";
  const response = await requestAdmin(path, token, { method: "GET" });
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  return AdminUsersListResponseSchema.parse(await response.json());
}

export async function updateAdminUser(
  token: string,
  userId: string,
  payload: AdminUpdateUserRequest
): Promise<AdminUserSummary> {
  const response = await requestAdmin(`/api/v1/admin/users/${encodeURIComponent(userId)}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  return AdminUpdateUserResponseSchema.parse(await response.json()).user;
}

export async function fetchAdminZones(token: string): Promise<AdminZoneSummary[]> {
  const response = await requestAdmin("/api/v1/admin/zones", token, { method: "GET" });
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  return AdminZonesListResponseSchema.parse(await response.json()).zones;
}

export async function updateAdminZone(
  token: string,
  zoneId: string,
  payload: AdminUpdateZoneRequest
): Promise<AdminZoneSummary> {
  const response = await requestAdmin(`/api/v1/admin/zones/${encodeURIComponent(zoneId)}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  return AdminUpdateZoneResponseSchema.parse(await response.json()).zone;
}
