import { useTranslation } from "react-i18next";
import {
  isSupportedLanguage,
  LANGUAGE_LABELS,
  setAppLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "../i18n";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const currentLang: SupportedLanguage = isSupportedLanguage(i18n.language) ? i18n.language : "en";

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="inline-flex items-center rounded-lg border border-slate-700/80 bg-slate-900/85 p-0.5 backdrop-blur"
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = lang === currentLang;
        return (
          <button
            key={lang}
            type="button"
            aria-pressed={active}
            onClick={() => {
              void setAppLanguage(lang);
            }}
            className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
              active
                ? "bg-amber-500 text-slate-950"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            {LANGUAGE_LABELS[lang]}
          </button>
        );
      })}
    </div>
  );
}
