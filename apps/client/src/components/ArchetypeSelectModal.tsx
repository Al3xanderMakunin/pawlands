import { useTranslation } from "react-i18next";
import { ARCHETYPE_LIST, WORLD_ZONES } from "@pawlands/game-data";
import { useIsMobile } from "../hooks/useIsMobile";
import { useAuthStore } from "../stores/useAuthStore";
import { useGameStore } from "../stores/useGameStore";
import { AnimatedModal } from "./AnimatedModal";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function ArchetypeSelectModal() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const {
    selectedArchetype,
    online,
    connectionStatus,
    currentZoneId,
    hasEnteredWorld,
    isArchetypeModalOpen,
    setArchetype,
    setZoneId,
    enterWorld,
    setArchetypeModalOpen,
  } = useGameStore();
  const { user, openAuthModal, logout } = useAuthStore();

  return (
    <AnimatedModal
      isOpen={isArchetypeModalOpen}
      ariaLabelledBy="archetype-modal-title"
      backdropClassName="z-20 bg-slate-950/75 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] sm:pt-[max(1rem,env(safe-area-inset-top))] sm:pr-[max(1rem,env(safe-area-inset-right))] sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:pl-[max(1rem,env(safe-area-inset-left))]"
      panelClassName="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700/90 bg-slate-900/95 p-4 shadow-2xl sm:p-5"
    >
        <div className="flex shrink-0 items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              {t("title")}
            </p>
            <h2
              id="archetype-modal-title"
              className="mt-0.5 text-lg font-bold text-slate-100 sm:mt-1 sm:text-xl"
            >
              {t("chooseArchetype")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">{t("archetypeSubtitle")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            {hasEnteredWorld && !online && (
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

        <div className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-0.5 sm:mt-4 sm:pr-0">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
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

          <section aria-labelledby="world-selection-heading" className="border-t border-slate-800 pt-3 sm:pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3
                id="world-selection-heading"
                className="text-sm font-bold text-slate-100 sm:text-base"
              >
                {t("worldSelection")}
              </h3>
              <p className="text-xs text-slate-400">{t("worldSelectionSubtitle")}</p>
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {WORLD_ZONES.map((zone) => {
                const active = zone.id === currentZoneId;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setZoneId(zone.id)}
                    className={`flex flex-col rounded-xl border p-2.5 text-left transition sm:p-3 ${
                      active
                        ? "border-amber-400 bg-amber-500/15 text-amber-50 shadow-lg shadow-amber-500/10"
                        : "border-slate-700/80 bg-slate-800/60 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold sm:text-sm">
                        {t(`zones.${zone.id}`, { defaultValue: zone.name })}
                      </span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          zone.isPvpEnabled
                            ? "bg-rose-950/90 text-rose-300"
                            : "bg-emerald-950/90 text-emerald-300"
                        }`}
                      >
                        {zone.isPvpEnabled ? t("pvpZone") : t("safeZone")}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-slate-400">
                      {t(`zoneDescriptions.${zone.id}`, { defaultValue: zone.description })}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-t border-slate-800 pt-3 sm:mt-5 sm:gap-3 sm:pt-4">
          <p className="text-[11px] text-slate-400">
            {isMobile ? t("mobileControlsHint") : t("controlsHint")}
          </p>
          {online && connectionStatus === "offline" && (
            <p role="alert" className="w-full text-xs text-rose-300">{t("worldConnectionFailed")}</p>
          )}
          <button
            type="button"
            onClick={() => enterWorld(true)}
            className="w-full rounded-xl border border-amber-500 px-5 py-2.5 text-sm font-bold text-amber-300 sm:w-auto"
          >
            {t("enterOnline")}
          </button>
          <button
            type="button"
            onClick={() => enterWorld()}
            className="w-full rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400 sm:w-auto"
          >
            {hasEnteredWorld
              ? t("applyChanges")
              : t("enterWorld", { zone: t(`zones.${currentZoneId}`) })}
          </button>
        </div>
    </AnimatedModal>
  );
}
