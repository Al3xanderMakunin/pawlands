import { create } from "zustand";
import {
  AuthErrorCodeSchema,
  type AuthErrorCode,
  type AuthResponse,
  type AuthUser,
  type LoginRequest,
  type RegisterRequest,
  type TelegramAuthRequest,
} from "@pawlands/protocol";
import { useAdminStore } from "./useAdminStore";
import { ApplePopupError, signInWithApplePopup } from "../network/appleAuth";
import {
  AuthApiError,
  authenticateWithTelegram,
  fetchAuthProviders,
  authenticateWithVk,
  fetchCurrentUser,
  getGoogleAuthUrl,
  loginAccount,
  loginWithAppleAccount,
  logoutAccount,
  registerAccount,
} from "../network/authClient";
import { consumeVkIdCallbackFromUrl, startVkIdAuth } from "../network/vkIdAuth";

export const AUTH_TOKEN_STORAGE_KEY = "pawlands.auth_token";

export type AuthModalMode = "login" | "register";
export type AuthUiErrorCode =
  | AuthErrorCode
  | "NETWORK_ERROR"
  | "PASSWORDS_MISMATCH"
  | "APPLE_POPUP_CANCELLED"
  | "VK_STATE_MISMATCH";

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
  loginWithTelegram: (payload: TelegramAuthRequest) => Promise<boolean>;
  loginWithApple: () => Promise<boolean>;
  loginWithVk: () => Promise<void>;
  completeVkCallback: () => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  handleOAuthCallbackFromUrl: () => Promise<void>;
}

async function runAuthRequest(
  set: (partial: Partial<AuthStoreState>) => void,
  request: () => Promise<AuthResponse>
): Promise<boolean> {
  set({ isSubmitting: true, errorCode: null });
  try {
    const response = await request();
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

  login: (payload) => runAuthRequest(set, () => loginAccount(payload)),

  register: (payload) => runAuthRequest(set, () => registerAccount(payload)),

  loginWithTelegram: (payload) => runAuthRequest(set, () => authenticateWithTelegram(payload)),

  startGoogleAuth: () => {
    if (typeof window === "undefined") return;
    set({ isSubmitting: true, errorCode: null });
    window.location.assign(getGoogleAuthUrl());
  },

  loginWithApple: async () => {
    set({ isSubmitting: true, errorCode: null });
    try {
      let appleClientId = (import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined)?.trim() || null;
      if (!appleClientId) {
        const providers = await fetchAuthProviders();
        appleClientId = providers.apple.enabled ? providers.apple.clientId : null;
      }

      if (!appleClientId) {
        set({ isSubmitting: false, errorCode: "APPLE_NOT_CONFIGURED" });
        return false;
      }

      const applePayload = await signInWithApplePopup(appleClientId);
      const response = await loginWithAppleAccount(applePayload);
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
      const code: AuthUiErrorCode =
        err instanceof ApplePopupError || err instanceof AuthApiError
          ? err.code
          : "APPLE_AUTH_FAILED";
      set({ isSubmitting: false, errorCode: code });
      return false;
    }
  },

  loginWithVk: async () => {
    set({ isSubmitting: true, errorCode: null });
    const status = await startVkIdAuth();
    if (status === "not_configured") {
      set({ isSubmitting: false, errorCode: "VK_AUTH_NOT_CONFIGURED" });
    }
  },

  completeVkCallback: async () => {
    const callback = consumeVkIdCallbackFromUrl();
    if (callback.status === "none") {
      return false;
    }

    if (callback.status === "error") {
      set({
        isAuthModalOpen: true,
        isSubmitting: false,
        errorCode: callback.errorCode,
      });
      return false;
    }

    set({ isSubmitting: true, errorCode: null });
    try {
      const response = await authenticateWithVk(callback.payload);
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
      const code = err instanceof AuthApiError ? err.code : "VK_AUTH_FAILED";
      set({
        isAuthModalOpen: true,
        isSubmitting: false,
        errorCode: code,
      });
      return false;
    }
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
