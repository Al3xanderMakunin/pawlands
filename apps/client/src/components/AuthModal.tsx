import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  TelegramAuthRequestSchema,
} from "@pawlands/protocol";
import { getYandexAuthUrl } from "../network/authClient";
import { useAuthStore } from "../stores/useAuthStore";
import { AnimatedModal } from "./AnimatedModal";
import { TelegramLoginButton } from "./TelegramLoginButton";

export function AuthModal() {
  const { t } = useTranslation();
  const {
    isAuthModalOpen,
    authModalMode,
    isSubmitting,
    errorCode,
    closeAuthModal,
    setAuthModalMode,
    setErrorCode,
    clearError,
    login,
    register,
    startGoogleAuth,
    loginWithTelegram,
    loginWithApple,
  } = useAuthStore();

  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isRegister = authModalMode === "register";

  const handleModeSwitch = (mode: "login" | "register") => {
    setAuthModalMode(mode);
    setPassword("");
    setConfirmPassword("");
    clearError();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearError();

    if (isRegister) {
      if (password !== confirmPassword) {
        setErrorCode("PASSWORDS_MISMATCH");
        return;
      }

      const parsed = RegisterRequestSchema.safeParse({
        email,
        username,
        password,
      });

      if (!parsed.success) {
        setErrorCode("VALIDATION_ERROR");
        return;
      }

      const ok = await register(parsed.data);
      if (ok) {
        setPassword("");
        setConfirmPassword("");
      }
      return;
    }

    const parsed = LoginRequestSchema.safeParse({
      identifier,
      password,
    });

    if (!parsed.success) {
      setErrorCode("VALIDATION_ERROR");
      return;
    }

    const ok = await login(parsed.data);
    if (ok) {
      setPassword("");
    }
  };

  const handleTelegramAuth = async (rawUser: unknown) => {
    clearError();
    const parsed = TelegramAuthRequestSchema.safeParse(rawUser);
    if (!parsed.success) {
      setErrorCode("INVALID_TELEGRAM_AUTH");
      return;
    }
    await loginWithTelegram(parsed.data);
  };

  return (
    <AnimatedModal
      isOpen={isAuthModalOpen}
      ariaLabelledBy="auth-modal-title"
      backdropClassName="z-30 bg-slate-950/80 p-4"
      panelClassName="w-full max-w-md rounded-2xl border border-slate-700/90 bg-slate-900/95 p-6 shadow-2xl"
    >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              {t("title")}
            </p>
            <h2 id="auth-modal-title" className="mt-1 text-xl font-bold text-slate-100">
              {isRegister ? t("auth.registerTitle") : t("auth.loginTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {isRegister ? t("auth.registerSubtitle") : t("auth.loginSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500"
          >
            {t("close")}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
          <button
            type="button"
            onClick={() => handleModeSwitch("login")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              !isRegister
                ? "bg-amber-500 text-slate-950"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            {t("auth.loginTab")}
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch("register")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              isRegister
                ? "bg-amber-500 text-slate-950"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            {t("auth.registerTab")}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {isRegister ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300" htmlFor="auth-email">
                  {t("auth.emailLabel")}
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="whisker@pawlands.gg"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium text-slate-300"
                  htmlFor="auth-username"
                >
                  {t("auth.usernameLabel")}
                </label>
                <input
                  id="auth-username"
                  type="text"
                  required
                  minLength={3}
                  maxLength={24}
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Whisker_01"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">{t("auth.usernameHint")}</p>
              </div>
            </>
          ) : (
            <div>
              <label
                className="block text-xs font-medium text-slate-300"
                htmlFor="auth-identifier"
              >
                {t("auth.identifierLabel")}
              </label>
              <input
                id="auth-identifier"
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t("auth.identifierPlaceholder")}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300" htmlFor="auth-password">
              {t("auth.passwordLabel")}
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={isRegister ? 8 : 1}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
            {isRegister && (
              <p className="mt-1 text-[11px] text-slate-500">{t("auth.passwordHint")}</p>
            )}
          </div>

          {isRegister && (
            <div>
              <label
                className="block text-xs font-medium text-slate-300"
                htmlFor="auth-confirm-password"
              >
                {t("auth.confirmPasswordLabel")}
              </label>
              <input
                id="auth-confirm-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          )}

          {errorCode && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/40 bg-rose-950/60 px-3 py-2 text-xs text-rose-200"
            >
              {t(`auth.errors.${errorCode}`, { defaultValue: t("auth.errors.INTERNAL_ERROR") })}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? t("auth.submitting")
              : isRegister
                ? t("auth.registerSubmit")
                : t("auth.loginSubmit")}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {t("auth.orDivider")}
          </span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={startGoogleAuth}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-700 bg-slate-950/90 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>{t("auth.googleButton")}</span>
          </button>

          <a
            href={getYandexAuthUrl()}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-700 bg-slate-950/90 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800/90"
          >
            <span
              aria-hidden="true"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FC3F1D] text-xs font-extrabold text-white"
            >
              Я
            </span>
            <span>{isRegister ? t("auth.yandexRegister") : t("auth.yandexLogin")}</span>
          </a>

          <TelegramLoginButton onAuth={handleTelegramAuth} disabled={isSubmitting} />

          <button
            type="button"
            onClick={() => void loginWithApple()}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 fill-current"
            >
              <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
            </svg>
            <span>{t("auth.continueWithApple")}</span>
          </button>
        </div>
    </AnimatedModal>
  );
}
