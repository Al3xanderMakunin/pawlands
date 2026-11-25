import { useTranslation } from "react-i18next";
import { ARCHETYPES, WORLD_ZONES } from "@pawlands/game-data";
import { calculateEncumbrance, calculateSurvivalModifiers } from "@pawlands/shared";
import { useGameStore, type TouchControlsMode } from "../stores/useGameStore";

const NEXT_TOUCH_MODE: Record<TouchControlsMode, TouchControlsMode> = {
  auto: "on",
  on: "off",
  off: "auto",
};

export function HudOverlay() {
  const { t } = useTranslation();
  const {
    selectedArchetype,
    currentZoneId,
    connectionStatus,
    touchControlsMode,
    lastActionLabel,
    survival,
    setArchetypeModalOpen,
    setTouchControlsMode,
  } = useGameStore();

  const currentZone = WORLD_ZONES.find((z) => z.id === currentZoneId) ?? WORLD_ZONES[0];
  const archetype = ARCHETYPES[selectedArchetype];
  const survivalMods = calculateSurvivalModifiers(survival.satiety);
  const encumbrance = calculateEncumbrance(
    survival.currentWeightKg,
    survival.maxCarryWeightKg
  );

  const hpPct = Math.round((survival.hp / survival.maxHp) * 100);
  const enPct = Math.round((survival.energy / survival.maxEnergy) * 100);
  const satPct = Math.round((survival.satiety / survival.maxSatiety) * 100);

  return (
    <header className="pointer-events-none absolute top-3 left-3 right-3 z-10 flex flex-wrap items-start justify-between gap-2">
      {/* Survival & Zone Card */}
      <div className="pointer-events-auto rounded-xl border border-slate-700/80 bg-slate-900/85 px-3.5 py-2.5 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-sm font-bold tracking-wide text-amber-300">{t("title")}</h1>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-200">
            {currentZone?.name}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
              currentZone?.isPvpEnabled
                ? "bg-rose-950/90 text-rose-300"
                : "bg-emerald-950/90 text-emerald-300"
            }`}
          >
            {currentZone?.isPvpEnabled ? "PvP" : t("safeZone")}
          </span>
          <span className="rounded bg-slate-800/90 px-2 py-0.5 text-[11px] text-slate-400">
            {connectionStatus === "offline" ? t("statusOffline") : connectionStatus}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-200">
          <div>
            <div className="flex justify-between">
              <span>HP</span>
              <span>
                {survival.hp}/{survival.maxHp}
              </span>
            </div>
            <div className="mt-0.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-rose-500" style={{ width: `${hpPct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <span>EN</span>
              <span>
                {survival.energy}/{survival.maxEnergy}
              </span>
            </div>
            <div className="mt-0.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-sky-400" style={{ width: `${enPct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <span>SAT</span>
              <span>{satPct}%</span>
            </div>
            <div className="mt-0.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-amber-400" style={{ width: `${satPct}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400">
          <span>
            {archetype.label} • {survivalMods.status}
          </span>
          <span>
            {t("carry")}: {survival.currentWeightKg}/{survival.maxCarryWeightKg} kg (
            {encumbrance.tier})
          </span>
          {lastActionLabel && (
            <span className="font-semibold text-amber-300">{lastActionLabel}</span>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTouchControlsMode(NEXT_TOUCH_MODE[touchControlsMode])}
          className="rounded-lg border border-slate-700/80 bg-slate-900/85 px-2.5 py-1.5 text-xs font-medium text-slate-200 backdrop-blur hover:border-slate-500"
        >
          {t("touchPad")}: {touchControlsMode.toUpperCase()}
        </button>
        <button
          type="button"
          onClick={() => setArchetypeModalOpen(true)}
          className="rounded-lg border border-amber-500/50 bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur hover:border-amber-400"
        >
          {t("changeArchetype")}
        </button>
      </div>
    </header>
  );
}
