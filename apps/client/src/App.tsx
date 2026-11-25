import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ARCHETYPE_LIST, WORLD_ZONES } from "@pawlands/game-data";
import { calculateEncumbrance, calculateSurvivalModifiers } from "@pawlands/shared";
import { createGame } from "./game/createGame";
import { useGameStore } from "./stores/useGameStore";

export function App() {
  const { t } = useTranslation();
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const { selectedArchetype, currentZoneId, connectionStatus, survival, setArchetype } =
    useGameStore();

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    const game = createGame(host);
    return () => {
      game.destroy(true);
    };
  }, []);

  const currentZone = WORLD_ZONES.find((z) => z.id === currentZoneId) ?? WORLD_ZONES[0];
  const survivalMods = calculateSurvivalModifiers(survival.satiety);
  const encumbrance = calculateEncumbrance(
    survival.currentWeightKg,
    survival.maxCarryWeightKg
  );

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 font-sans">
      <div ref={canvasHostRef} className="w-full h-full" />

      {/* Top HUD */}
      <header className="pointer-events-none absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto rounded-lg border border-slate-700/80 bg-slate-900/85 px-3 py-2 backdrop-blur">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-wide text-amber-300">{t("title")}</h1>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
              {currentZone?.name}
            </span>
            <span className="rounded bg-emerald-950/80 px-2 py-0.5 text-xs text-emerald-300">
              {connectionStatus === "offline" ? t("statusOffline") : connectionStatus}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-200 sm:grid-cols-4">
            <span>
              HP: {survival.hp}/{survival.maxHp}
            </span>
            <span>
              Energy: {survival.energy}/{survival.maxEnergy}
            </span>
            <span>
              Satiety: {survival.satiety}% ({survivalMods.status})
            </span>
            <span>
              Weight: {survival.currentWeightKg}/{survival.maxCarryWeightKg} kg ({encumbrance.tier})
            </span>
          </div>
        </div>
      </header>

      {/* Archetype Selector Overlay */}
      <aside className="pointer-events-auto absolute bottom-3 left-3 right-3 mx-auto max-w-2xl rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 backdrop-blur">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t("chooseArchetype")}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ARCHETYPE_LIST.map((arch) => {
            const active = arch.id === selectedArchetype;
            return (
              <button
                key={arch.id}
                type="button"
                onClick={() => setArchetype(arch.id)}
                className={`rounded-lg border p-2.5 text-left transition ${
                  active
                    ? "border-amber-400 bg-amber-500/15 text-amber-100"
                    : "border-slate-700 bg-slate-800/70 text-slate-300 hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{arch.label}</span>
                  <span className="text-[11px] text-slate-400">
                    {Math.round(arch.stats.speedMultiplier * 100)}% SPD
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{arch.tagline}</p>
                <div className="mt-2 flex flex-wrap gap-x-2 text-[11px] text-slate-300">
                  <span>HP {arch.stats.maxHp}</span>
                  <span>EN {arch.stats.maxEnergy}</span>
                  <span>WT {arch.stats.maxCarryWeightKg}kg</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
