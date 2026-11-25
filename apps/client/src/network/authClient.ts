import {
  AuthMeResponseSchema,
  AuthResponseSchema,
  type AuthErrorCode,
  type AuthResponse,
  type AuthUser,
  type LoginRequest,
  type RegisterRequest,
} from "@pawlands/protocol";

const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:2567").replace(/\/+$/, "");

export function getYandexAuthUrl(): string {
  return `${apiUrl}/api/v1/auth/yandex`;
}

export class AuthApiError extends Error {
  readonly code: AuthErrorCode | "NETWORK_ERROR";
  readonly status?: number;

  constructor(
    code: AuthErrorCode | "NETWORK_ERROR",
    message: string,
    status?: number
  ) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
    this.status = status;
  }
}

async function parseErrorResponse(response: Response): Promise<AuthApiError> {
  try {
    const data = (await response.json()) as { error?: unknown; message?: unknown };
    const code =
      typeof data.error === "string"
        ? (data.error as AuthErrorCode)
        : "INTERNAL_ERROR";
    const message =
      typeof data.message === "string"
        ? data.message
        : `Request failed with status ${response.status}`;
    return new AuthApiError(code, message, response.status);
  } catch {
    return new AuthApiError(
      "INTERNAL_ERROR",
      `Request failed with status ${response.status}`,
      response.status
    );
  }
}

async function requestJson(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new AuthApiError("NETWORK_ERROR", "Unable to reach authentication server");
  }
}

export async function registerAccount(payload: RegisterRequest): Promise<AuthResponse> {
  const response = await requestJson("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return AuthResponseSchema.parse(await response.json());
}

export async function loginAccount(payload: LoginRequest): Promise<AuthResponse> {
  const response = await requestJson("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return AuthResponseSchema.parse(await response.json());
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  const response = await requestJson("/api/v1/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const parsed = AuthMeResponseSchema.parse(await response.json());
  return parsed.user;
}

export function getGoogleAuthUrl(): string {
  return `${apiUrl}/api/v1/auth/google`;
}

export async function logoutAccount(token: string): Promise<void> {
  try {
    await requestJson("/api/v1/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
  } catch {
    // Ignore network errors during stateless logout
  }
}
