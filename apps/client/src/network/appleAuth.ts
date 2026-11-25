import type { AppleAuthRequest } from "@pawlands/protocol";
import { getEnv } from "../config/env";

const APPLE_SDK_URL =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

interface AppleSignInResponse {
  authorization?: {
    id_token?: string;
    code?: string;
    state?: string;
  };
  user?: {
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

interface AppleIdSdk {
  auth: {
    init: (config: {
      clientId: string;
      scope: string;
      redirectURI: string;
      state: string;
      nonce: string;
      usePopup: boolean;
    }) => void;
    signIn: () => Promise<AppleSignInResponse>;
  };
}

declare global {
  interface Window {
    AppleID?: AppleIdSdk;
  }
}

export class ApplePopupError extends Error {
  constructor(
    readonly code: "APPLE_POPUP_CANCELLED" | "APPLE_AUTH_FAILED",
    message: string
  ) {
    super(message);
    this.name = "ApplePopupError";
  }
}

let sdkLoadPromise: Promise<AppleIdSdk> | null = null;

function generateRandomHex(bytes = 16): string {
  const buffer = new Uint8Array(bytes);
  window.crypto.getRandomValues(buffer);
  return Array.from(buffer, (b) => b.toString(16).padStart(2, "0")).join("");
}

function loadAppleSdk(): Promise<AppleIdSdk> {
  if (typeof window === "undefined") {
    return Promise.reject(new ApplePopupError("APPLE_AUTH_FAILED", "Window is unavailable"));
  }
  if (window.AppleID) {
    return Promise.resolve(window.AppleID);
  }
  if (sdkLoadPromise) {
    return sdkLoadPromise;
  }

  sdkLoadPromise = new Promise<AppleIdSdk>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${APPLE_SDK_URL}"]`
    );
    if (existingScript && window.AppleID) {
      resolve(window.AppleID);
      return;
    }

    const script = existingScript ?? document.createElement("script");
    script.src = APPLE_SDK_URL;
    script.async = true;

    script.onload = () => {
      if (window.AppleID) {
        resolve(window.AppleID);
      } else {
        sdkLoadPromise = null;
        reject(new ApplePopupError("APPLE_AUTH_FAILED", "Apple Sign-In SDK failed to initialize"));
      }
    };

    script.onerror = () => {
      sdkLoadPromise = null;
      reject(new ApplePopupError("APPLE_AUTH_FAILED", "Failed to load Apple Sign-In SDK"));
    };

    if (!existingScript) {
      document.head.appendChild(script);
    }
  });

  return sdkLoadPromise;
}

export async function signInWithApplePopup(clientId: string): Promise<AppleAuthRequest> {
  const appleId = await loadAppleSdk();
  const nonce = generateRandomHex(16);
  const state = generateRandomHex(16);
  const redirectURI = getEnv("VITE_APPLE_REDIRECT_URI") ?? window.location.origin;

  appleId.auth.init({
    clientId,
    scope: "name email",
    redirectURI,
    state,
    nonce,
    usePopup: true,
  });

  let result: AppleSignInResponse;
  try {
    result = await appleId.auth.signIn();
  } catch (err) {
    const errorDetail =
      typeof err === "object" && err !== null && "error" in err
        ? String((err as { error?: unknown }).error)
        : "";
    if (errorDetail === "popup_closed_by_user") {
      throw new ApplePopupError("APPLE_POPUP_CANCELLED", "Apple Sign-In popup was closed");
    }
    throw new ApplePopupError("APPLE_AUTH_FAILED", "Apple Sign-In failed");
  }

  const idToken = result.authorization?.id_token;
  if (!idToken) {
    throw new ApplePopupError("APPLE_AUTH_FAILED", "Apple Sign-In did not return an ID token");
  }

  const firstName = result.user?.name?.firstName?.trim();
  const lastName = result.user?.name?.lastName?.trim();
  const fullName =
    firstName || lastName
      ? {
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
        }
      : undefined;

  return {
    idToken,
    nonce,
    fullName,
  };
}
