import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

declare global {
  interface Window {
    pawlandsOnTelegramAuth?: (user: unknown) => void;
  }
}

interface TelegramLoginButtonProps {
  onAuth: (user: unknown) => void;
  disabled?: boolean;
}

const telegramBotUsername = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? "").trim();

export function TelegramLoginButton({ onAuth, disabled = false }: TelegramLoginButtonProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onAuthRef = useRef(onAuth);
  onAuthRef.current = onAuth;

  useEffect(() => {
    if (!telegramBotUsername) return;
    const container = containerRef.current;
    if (!container) return;

    window.pawlandsOnTelegramAuth = (user: unknown) => {
      onAuthRef.current(user);
    };

    container.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", telegramBotUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "pawlandsOnTelegramAuth(user)");
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
      delete window.pawlandsOnTelegramAuth;
    };
  }, []);

  if (!telegramBotUsername) {
    return (
      <div className="space-y-1.5 text-center">
        <button
          type="button"
          disabled
          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-300/60"
        >
          <TelegramIcon />
          <span>{t("auth.telegramButton")}</span>
        </button>
        <p className="text-[11px] text-slate-500">{t("auth.telegramNotConfigured")}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex min-h-[42px] items-center justify-center transition ${
        disabled ? "pointer-events-none opacity-60" : ""
      }`}
    />
  );
}

function TelegramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-current"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}
