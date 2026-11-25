import { useTranslation } from "react-i18next";
import { ARCHETYPE_LIST } from "@pawlands/game-data";
import { useAuthStore } from "../stores/useAuthStore";
import { useGameStore } from "../stores/useGameStore";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function ArchetypeSelectModal() {
  const { t } = useTranslation();
  const {
    selectedArchetype,
    hasEnteredWorld,
    isArchetypeModalOpen,
    setArchetype,
    enterWorld,
    setArchetypeModalOpen,
  } = useGameStore();
  const { user, openAuthModal, logout } = useAuthStore();

  if (!isArchetypeModalOpen) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] backdrop-blur-sm sm:pt-[max(1rem,env(safe-area-inset-top))] sm:pr-[max(1rem,env(safe-area-inset-right))] sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:pl-[max(1rem,env(safe-area-inset-left))]">
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700/90 bg-slate-900/95 p-4 shadow-2xl sm:p-5">
        <div className="flex shrink-0 items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              {t("title")}
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-100 sm:mt-1 sm:text-xl">
              {t("chooseArchetype")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">{t("archetypeSubtitle")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            {hasEnteredWorld && (
              <button
                type="button"
                onClick={() => setArchetypeModalOpen(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500"
              >
                {t("close")}
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2 text-xs">
          {user ? (
            <>
              <span className="text-slate-300">
                {t("auth.signedInAs")}{" "}
                <strong className="font-semibold text-amber-300">@{user.username}</strong>
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-slate-500"
              >
                {t("auth.signOut")}
              </button>
            </>
          ) : (
            <>
              <span className="text-slate-400">{t("auth.guestNotice")}</span>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="font-semibold text-amber-400 transition hover:text-amber-300"
              >
                {t("auth.openAuthLink")}
              </button>
            </>
          )}
        </div>

        <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-y-auto overscroll-contain pr-0.5 sm:mt-4 sm:grid-cols-3 sm:gap-3 sm:pr-0">
          {ARCHETYPE_LIST.map((arch) => {
            const active = arch.id === selectedArchetype;
            return (
              <button
                key={arch.id}
                type="button"
                onClick={() => setArchetype(arch.id)}
                className={`flex flex-col rounded-xl border p-3 text-left transition sm:p-3.5 ${
                  active
                    ? "border-amber-400 bg-amber-500/15 text-amber-50 shadow-lg shadow-amber-500/10"
                    : "border-slate-700/80 bg-slate-800/60 text-slate-300 hover:border-slate-500"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="h-11 w-11 shrink-0 rounded-lg border border-slate-700 bg-slate-950/80 sm:h-12 sm:w-12"
                    style={{
                      backgroundImage: `url(/assets/sprites/${arch.id}.png)`,
                      backgroundPosition: "0px 0px",
                      backgroundSize: "192px 192px",
                      imageRendering: "pixelated",
                    }}
                  />
                  <div>
                    <div className="text-sm font-bold">
                      {t(`archetypes.${arch.id}.label`, { defaultValue: arch.label })}
                    </div>
                    <div className="text-[11px] font-medium text-amber-300/90">
                      {Math.round(arch.stats.speedMultiplier * 100)}% {t("speed")}
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-400 sm:mt-2.5">
                  {t(`archetypes.${arch.id}.tagline`, { defaultValue: arch.tagline })}
                </p>

                <div className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-slate-700/60 pt-2 text-[11px] text-slate-300 sm:mt-3 sm:pt-2.5">
                  <span>HP: {arch.stats.maxHp}</span>
                  <span>EN: {arch.stats.maxEnergy}</span>
                  <span>STR: {arch.stats.strength}</span>
                  <span>AGI: {arch.stats.agility}</span>
                  <span className="col-span-2">
                    {t("carry")}: {arch.stats.maxCarryWeightKg} {t("kg")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-t border-slate-800 pt-3 sm:mt-5 sm:gap-3 sm:pt-4">
          <p className="text-[11px] text-slate-400">{t("controlsHint")}</p>
          <button
            type="button"
            onClick={enterWorld}
            className="w-full rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400 sm:w-auto"
          >
            {hasEnteredWorld ? t("applyChanges") : t("enterWorld")}
          </button>
        </div>
      </div>
    </div>
  );
}
