import { create } from "zustand";
import {
  AuthErrorCodeSchema,
  type AuthErrorCode,
  type AuthUser,
  type LoginRequest,
  type RegisterRequest,
} from "@pawlands/protocol";
import { useAdminStore } from "./useAdminStore";
import {
  AuthApiError,
  fetchCurrentUser,
  getGoogleAuthUrl,
  loginAccount,
  logoutAccount,
  registerAccount,
} from "../network/authClient";

export const AUTH_TOKEN_STORAGE_KEY = "pawlands.auth_token";

export type AuthModalMode = "login" | "register";
export type AuthUiErrorCode = AuthErrorCode | "NETWORK_ERROR" | "PASSWORDS_MISMATCH";

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota or privacy mode errors
  }
}

interface AuthStoreState {
  user: AuthUser | null;
  token: string | null;
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  isSubmitting: boolean;
  isRestoring: boolean;
  errorCode: AuthUiErrorCode | null;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: AuthModalMode) => void;
  setErrorCode: (code: AuthUiErrorCode | null) => void;
  clearError: () => void;
  login: (payload: LoginRequest) => Promise<boolean>;
  register: (payload: RegisterRequest) => Promise<boolean>;
  startGoogleAuth: () => void;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  handleOAuthCallbackFromUrl: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  token: readStoredToken(),
  isAuthModalOpen: false,
  authModalMode: "login",
  isSubmitting: false,
  isRestoring: false,
  errorCode: null,

  openAuthModal: (mode = "login") =>
    set({
      isAuthModalOpen: true,
      authModalMode: mode,
      errorCode: null,
    }),

  closeAuthModal: () =>
    set({
      isAuthModalOpen: false,
      errorCode: null,
    }),

  setAuthModalMode: (authModalMode) =>
    set({
      authModalMode,
      errorCode: null,
    }),

  setErrorCode: (errorCode) => set({ errorCode }),

  clearError: () => set({ errorCode: null }),

  login: async (payload) => {
    set({ isSubmitting: true, errorCode: null });
    try {
      const response = await loginAccount(payload);
      writeStoredToken(response.token);
      set({
        user: response.user,
        token: response.token,
        isSubmitting: false,
        isAuthModalOpen: false,
        errorCode: null,
      });
      return true;
    } catch (err) {
      const code = err instanceof AuthApiError ? err.code : "INTERNAL_ERROR";
      set({ isSubmitting: false, errorCode: code });
      return false;
    }
  },

  register: async (payload) => {
    set({ isSubmitting: true, errorCode: null });
    try {
      const response = await registerAccount(payload);
      writeStoredToken(response.token);
      set({
        user: response.user,
        token: response.token,
        isSubmitting: false,
        isAuthModalOpen: false,
        errorCode: null,
      });
      return true;
    } catch (err) {
      const code = err instanceof AuthApiError ? err.code : "INTERNAL_ERROR";
      set({ isSubmitting: false, errorCode: code });
      return false;
    }
  },

  startGoogleAuth: () => {
    if (typeof window === "undefined") return;
    set({ isSubmitting: true, errorCode: null });
    window.location.assign(getGoogleAuthUrl());
  },

  logout: async () => {
    const token = get().token;
    writeStoredToken(null);
    useAdminStore.getState().closeAdminPanel();
    set({ user: null, token: null, errorCode: null });
    if (token) {
      await logoutAccount(token);
    }
  },

  restoreSession: async () => {
    let oauthError: AuthUiErrorCode | null = null;
    if (typeof window !== "undefined" && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const hashToken = hashParams.get("auth_token");
      const hashError = hashParams.get("auth_error");
      if (hashToken || hashError) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`
        );
      }
      if (hashToken) {
        writeStoredToken(hashToken);
      } else if (hashError) {
        oauthError = hashError as AuthUiErrorCode;
      }
    }

    if (oauthError) {
      set({
        isRestoring: false,
        isAuthModalOpen: true,
        errorCode: oauthError,
      });
      return;
    }

    const token = readStoredToken();
    if (!token) {
      set({ user: null, token: null, isRestoring: false });
      return;
    }

    set({ isRestoring: true });
    try {
      const user = await fetchCurrentUser(token);
      set({ user, token, isRestoring: false });
    } catch (err) {
      if (err instanceof AuthApiError && err.code === "UNAUTHORIZED") {
        writeStoredToken(null);
        set({ user: null, token: null, isRestoring: false });
      } else {
        set({ isRestoring: false });
      }
    }
  },

  handleOAuthCallbackFromUrl: async () => {
    if (typeof window === "undefined") {
      await get().restoreSession();
      return;
    }

    const hash = window.location.hash;
    if (!hash || (!hash.includes("auth_token=") && !hash.includes("auth_error="))) {
      await get().restoreSession();
      return;
    }

    const params = new URLSearchParams(hash.slice(1));
    const authToken = params.get("auth_token");
    const authError = params.get("auth_error");

    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

    if (authError) {
      const parsedError = AuthErrorCodeSchema.safeParse(authError);
      set({
        isAuthModalOpen: true,
        errorCode: parsedError.success ? parsedError.data : "YANDEX_AUTH_FAILED",
      });
      await get().restoreSession();
      return;
    }

    if (authToken) {
      writeStoredToken(authToken);
      set({ isRestoring: true, errorCode: null });
      try {
        const user = await fetchCurrentUser(authToken);
        set({
          user,
          token: authToken,
          isRestoring: false,
          isAuthModalOpen: false,
          errorCode: null,
        });
      } catch (err) {
        writeStoredToken(null);
        const code = err instanceof AuthApiError ? err.code : "YANDEX_AUTH_FAILED";
        set({
          user: null,
          token: null,
          isRestoring: false,
          isAuthModalOpen: true,
          errorCode: code,
        });
      }
      return;
    }

    await get().restoreSession();
  },
}));
