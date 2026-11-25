import { useTranslation } from "react-i18next";
import { ITEMS_BY_ID } from "@pawlands/game-data";
import { MAX_LEVEL, xpForNextLevel } from "@pawlands/shared";
import { useGameStore } from "../stores/useGameStore";

export function BackpackPanel() {
  const { t } = useTranslation();
  const sheet = useGameStore((state) => state.characterSheet);
  const act = useGameStore((state) => state.backpackAction);
  const connected = useGameStore((state) => state.connectionStatus === "connected");
  const canAct = useGameStore((state) => state.survival.hp > 0);
  if (!sheet) return null;

  return (
    <details className="rounded-lg border border-slate-700/80 bg-slate-900/95 text-xs text-slate-200">
      <summary className="cursor-pointer px-2.5 py-1.5 focus-visible:outline-amber-400">
        {t("rpg.backpack")}
      </summary>
      <section
        aria-label={t("rpg.backpack")}
        className="absolute right-0 z-20 mt-1 max-h-[65dvh] w-full max-w-sm overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl"
      >
        <div className="flex flex-wrap justify-between gap-2 font-semibold text-amber-300">
          <span>{t("rpg.level", { level: sheet.level })}</span>
          {sheet.level < MAX_LEVEL && (
            <span>{Math.floor(sheet.xp)}/{xpForNextLevel(sheet.level)} XP</span>
          )}
          <span>{t("rpg.coins", { coins: sheet.coins })}</span>
        </div>
        <p className="mt-2 text-slate-300">
          {t("rpg.stats", sheet)}
        </p>
        <ol className="mt-2 grid grid-cols-2 gap-1.5">
          {sheet.backpack.map((stack, slot) => {
            const item = stack && ITEMS_BY_ID.get(stack.itemId);
            return (
              <li key={slot} className="min-h-8 rounded border border-slate-700/80 bg-slate-800/60 p-1.5">
                {stack && item ? (
                  <>
                    <div>{t(`rpg.items.${item.id}`, { defaultValue: item.name })} ×{stack.quantity}</div>
                    <div className="text-slate-400">
                      {Number((item.weightKg * stack.quantity).toFixed(2))} {t("kg")}
                      {item.carryBonusKg && ` · ${t("rpg.carryBonus", { bonus: item.carryBonusKg })}`}
                    </div>
                    {(item.slot || item.satietyRestore) && (
                      <button
                        type="button"
                        className="mt-1 rounded bg-slate-700 px-2 py-1 text-amber-200 disabled:opacity-50"
                        disabled={!act || !connected || !canAct}
                        aria-pressed={item.slot ? stack.equipped : undefined}
                        onClick={() => act?.(slot, Boolean(item.slot))}
                      >
                        {t(item.slot ? (stack.equipped ? "rpg.unequip" : "rpg.equip") : "rpg.eat")}
                      </button>
                    )}
                  </>
                ) : <span className="text-slate-400">{t("rpg.empty")}</span>}
              </li>
            );
          })}
        </ol>
      </section>
    </details>
  );
}
