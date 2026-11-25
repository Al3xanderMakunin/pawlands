import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { WORLD_ZONES } from "@pawlands/game-data";
import type { FacingDirection } from "../game/scenes/BootScene";
import { worldToMinimap } from "../game/minimap/minimapData";
import { useIsMobile } from "../hooks/useIsMobile";
import { useGameStore } from "../stores/useGameStore";

const FACING_ROTATION_RAD: Record<FacingDirection, number> = {
  up: -Math.PI / 2,
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
};

export function Minimap() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const {
    currentZoneId,
    isMinimapOpen,
    minimapTerrain,
    minimapPlayer,
    isArchetypeModalOpen,
    toggleMinimap,
  } = useGameStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const canvasWidth = isMobile ? 128 : 176;
  const canvasHeight = useMemo(() => {
    if (!minimapTerrain || minimapTerrain.widthInPixels <= 0) {
      return Math.round(canvasWidth * 0.75);
    }
    return Math.max(72, Math.round((canvasWidth * minimapTerrain.heightInPixels) / minimapTerrain.widthInPixels));
  }, [canvasWidth, minimapTerrain]);

  // Pre-render static terrain tiles into an offscreen canvas when zone or size changes
  const terrainCanvas = useMemo(() => {
    if (!minimapTerrain || typeof document === "undefined") return null;
    const offscreen = document.createElement("canvas");
    offscreen.width = canvasWidth;
    offscreen.height = canvasHeight;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

    const cellW = canvasWidth / minimapTerrain.tilesWidth;
    const cellH = canvasHeight / minimapTerrain.tilesHeight;

    for (let ty = 0; ty < minimapTerrain.tilesHeight; ty++) {
      for (let tx = 0; tx < minimapTerrain.tilesWidth; tx++) {
        const color = minimapTerrain.colors[ty * minimapTerrain.tilesWidth + tx] ?? "#334155";
        ctx.fillStyle = color;
        ctx.fillRect(
          Math.floor(tx * cellW),
          Math.floor(ty * cellH),
          Math.ceil(cellW),
          Math.ceil(cellH)
        );
      }
    }

    return offscreen;
  }, [minimapTerrain, canvasWidth, canvasHeight]);

  // Keyboard shortcut: 'M' toggles minimap when not typing in an input
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isArchetypeModalOpen) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.code === "KeyM" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        toggleMinimap();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isArchetypeModalOpen, toggleMinimap]);

  // Draw terrain + markers + camera viewport + player arrow
  useEffect(() => {
    if (!isMinimapOpen || !minimapTerrain) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (terrainCanvas) {
      ctx.drawImage(terrainCanvas, 0, 0);
    }

    const { widthInPixels, heightInPixels, markers } = minimapTerrain;

    // Draw markers (spawns & portals)
    for (const marker of markers) {
      const pos = worldToMinimap(
        marker.x,
        marker.y,
        widthInPixels,
        heightInPixels,
        canvasWidth,
        canvasHeight
      );
      if (marker.kind === "portal") {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-4, -4, 8, 8);
        ctx.fillStyle = "#22d3ee";
        ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#34d399";
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    if (minimapPlayer) {
      // Camera viewport rectangle
      const topLeft = worldToMinimap(
        minimapPlayer.viewportX,
        minimapPlayer.viewportY,
        widthInPixels,
        heightInPixels,
        canvasWidth,
        canvasHeight
      );
      const vpW = (minimapPlayer.viewportWidth / widthInPixels) * canvasWidth;
      const vpH = (minimapPlayer.viewportHeight / heightInPixels) * canvasHeight;
      ctx.strokeStyle = "rgba(248, 250, 252, 0.45)";
      ctx.lineWidth = 1;
      ctx.strokeRect(topLeft.x, topLeft.y, vpW, vpH);

      // Directional player arrow
      const pPos = worldToMinimap(
        minimapPlayer.x,
        minimapPlayer.y,
        widthInPixels,
        heightInPixels,
        canvasWidth,
        canvasHeight
      );
      ctx.save();
      ctx.translate(pPos.x, pPos.y);
      ctx.rotate(FACING_ROTATION_RAD[minimapPlayer.facing]);
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(-4, -3.5);
      ctx.lineTo(-2.5, 0);
      ctx.lineTo(-4, 3.5);
      ctx.closePath();
      ctx.fillStyle = "#fbbf24";
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.25;
      ctx.stroke();
      ctx.restore();
    }
  }, [isMinimapOpen, minimapTerrain, terrainCanvas, minimapPlayer, canvasWidth, canvasHeight]);

  const currentZone = WORLD_ZONES.find((z) => z.id === currentZoneId) ?? WORLD_ZONES[0];
  const tileX =
    minimapTerrain && minimapPlayer
      ? Math.max(0, Math.floor(minimapPlayer.x / minimapTerrain.tileWidth))
      : 0;
  const tileY =
    minimapTerrain && minimapPlayer
      ? Math.max(0, Math.floor(minimapPlayer.y / minimapTerrain.tileHeight))
      : 0;

  if (!isMinimapOpen) {
    return (
      <button
        type="button"
        onClick={toggleMinimap}
        aria-label={t("minimap.show")}
        title={t("minimap.show")}
        className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/85 px-2.5 py-1 text-xs font-medium text-slate-200 shadow-lg backdrop-blur hover:border-amber-400 hover:text-amber-200"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
        <span>{t("minimap.title")}</span>
      </button>
    );
  }

  return (
    <section
      aria-label={t("minimap.title")}
      className="pointer-events-auto overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/85 p-2 shadow-lg backdrop-blur"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate font-semibold text-slate-200">
          {currentZone ? t(`zones.${currentZone.id}`, { defaultValue: currentZone.name }) : t("minimap.title")}
        </span>
        <button
          type="button"
          onClick={toggleMinimap}
          aria-label={t("minimap.hide")}
          title={t("minimap.hide")}
          className="rounded border border-slate-700 bg-slate-800/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 hover:border-slate-500 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-slate-700/90 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="block"
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-slate-400">
        <span className="font-mono">
          {tileX}, {tileY}
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
            {t("minimap.player")}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rotate-45 bg-cyan-400" />
            {t("minimap.portal")}
          </span>
        </div>
      </div>
    </section>
  );
}
