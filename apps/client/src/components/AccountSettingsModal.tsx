import { useTranslation } from "react-i18next";
import { AnimatedModal } from "./AnimatedModal";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function AccountSettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <AnimatedModal
      isOpen={isOpen}
      ariaLabelledBy="account-settings-title"
      backdropClassName="z-30 bg-slate-950/80 p-4"
      panelClassName="w-full max-w-sm rounded-2xl border border-slate-700/90 bg-slate-900 p-4 shadow-2xl sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="account-settings-title" className="text-lg font-bold text-slate-100">
          {t("accountSettings")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500"
        >
          {t("close")}
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-slate-200">{t("language")}</span>
        <LanguageSwitcher />
      </div>
    </AnimatedModal>
  );
}
