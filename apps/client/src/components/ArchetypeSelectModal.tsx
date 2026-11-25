import { useTranslation } from "react-i18next";
import { ARCHETYPE_LIST } from "@pawlands/game-data";
import { useGameStore } from "../stores/useGameStore";

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

  if (!isArchetypeModalOpen) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-700/90 bg-slate-900/95 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              {t("title")}
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-100">{t("chooseArchetype")}</h2>
            <p className="mt-0.5 text-xs text-slate-400">{t("archetypeSubtitle")}</p>
          </div>
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

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ARCHETYPE_LIST.map((arch) => {
            const active = arch.id === selectedArchetype;
            return (
              <button
                key={arch.id}
                type="button"
                onClick={() => setArchetype(arch.id)}
                className={`flex flex-col rounded-xl border p-3.5 text-left transition ${
                  active
                    ? "border-amber-400 bg-amber-500/15 text-amber-50 shadow-lg shadow-amber-500/10"
                    : "border-slate-700/80 bg-slate-800/60 text-slate-300 hover:border-slate-500"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="h-12 w-12 shrink-0 rounded-lg border border-slate-700 bg-slate-950/80"
                    style={{
                      backgroundImage: `url(/assets/sprites/${arch.id}.png)`,
                      backgroundPosition: "0px 0px",
                      backgroundSize: "192px 192px",
                      imageRendering: "pixelated",
                    }}
                  />
                  <div>
                    <div className="text-sm font-bold">{arch.label}</div>
                    <div className="text-[11px] font-medium text-amber-300/90">
                      {Math.round(arch.stats.speedMultiplier * 100)}% {t("speed")}
                    </div>
                  </div>
                </div>

                <p className="mt-2.5 text-xs leading-relaxed text-slate-400">{arch.tagline}</p>

                <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-slate-700/60 pt-2.5 text-[11px] text-slate-300">
                  <span>HP: {arch.stats.maxHp}</span>
                  <span>EN: {arch.stats.maxEnergy}</span>
                  <span>STR: {arch.stats.strength}</span>
                  <span>AGI: {arch.stats.agility}</span>
                  <span className="col-span-2">
                    {t("carry")}: {arch.stats.maxCarryWeightKg} kg
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <p className="text-[11px] text-slate-400">{t("controlsHint")}</p>
          <button
            type="button"
            onClick={enterWorld}
            className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
          >
            {hasEnteredWorld ? t("applyChanges") : t("enterWorld")}
          </button>
        </div>
      </div>
    </div>
  );
}
