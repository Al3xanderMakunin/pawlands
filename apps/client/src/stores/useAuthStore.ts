import { create } from "zustand";
import type { AuthErrorCode, AuthUser, LoginRequest, RegisterRequest } from "@pawlands/protocol";
import {
  AuthApiError,
  fetchCurrentUser,
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
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
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

  logout: async () => {
    const token = get().token;
    writeStoredToken(null);
    set({ user: null, token: null, errorCode: null });
    if (token) {
      await logoutAccount(token);
    }
  },

  restoreSession: async () => {
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
}));
